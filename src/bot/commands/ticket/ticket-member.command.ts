import {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  CommandInteraction,
  ThreadChannel,
  EmbedBuilder,
  userMention,
  roleMention,
  TextChannel,
  GuildMember,
  Collection,
  Role,
  User
} from 'discord.js'
import { SlashOption, SlashGroup, Discord, Slash } from 'discordx'

import { TicketService } from '../../../services/ticket.service'
import { rootGroupName } from './constants'
import { Color } from '../../../constants'

const groupName = 'member'

function buildEmbed({
  roleMembersMentions,
  add = true,
  moderator,
  target
}: {
  roleMembersMentions?: string[]
  target: GuildMember | Role
  moderator: User
  add?: boolean
}) {
  const targetIsMember = target instanceof GuildMember
  const plural = targetIsMember // bruh? can be significantly simplified by using only one variant
    ? true
    : roleMembersMentions?.length
    ? roleMembersMentions.length === 1
    : true

  const embed = new EmbedBuilder()
    .setColor(add ? Color.Green : Color.Red)
    .setTitle(
      add
        ? `Добавление участник${plural ? 'а(-цы)' : 'ов'} в тикет`
        : `Удаление участник${plural ? 'а(-цы)' : 'ов'} из тикета`
    )
    .addFields({
      value: userMention(moderator.id),
      name: 'Модератор',
      inline: true
    })
    .addFields({
      value:
        (targetIsMember ? userMention : roleMention)(target.id) +
        (roleMembersMentions ? '\n' + roleMembersMentions?.join(', ') : ''),
      name: targetIsMember ? 'Участник(-ца)' : 'Роль',
      inline: true
    })

  if (targetIsMember) {
    embed.setAuthor({
      iconURL: target.displayAvatarURL(),
      name: target.user.tag
    })
  }

  return embed
}

@SlashGroup(groupName, rootGroupName)
@SlashGroup({
  description: 'Управление участниками тикета',
  root: rootGroupName,
  name: groupName
})
@Discord()
export class TicketMemberCommand {
  private readonly ticketService = new TicketService()

  @Slash({
    description: 'Добавить участника или роль в тикет',
    name: 'add'
  })
  public async add(
    @SlashOption({
      type: ApplicationCommandOptionType.Mentionable,
      description: 'Кого добавить',
      name: 'target',
      required: true
    })
    target: GuildMember | Role,
    @SlashOption({
      description: 'Выдать права на просмотр канала-категории',
      type: ApplicationCommandOptionType.Boolean,
      required: false,
      name: 'force'
    })
    force: boolean,
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({
      ephemeral: true
    })

    const ticket = await this.ticketService.getOne({
      channelId: interaction.channelId
    })
    const targetIsMember = target instanceof GuildMember

    if (!ticket) {
      return await interaction.followUp({
        content: 'Используйте эту команду в канале, который является тикетом'
      })
    }

    const channel = interaction.channel as ThreadChannel
    const categoryChannel = channel.parent as TextChannel

    if (
      targetIsMember &&
      (await channel.members.fetch(target.id).catch(() => null))
    ) {
      return await interaction.followUp({
        content: `${target} уже есть в тикете`
      })
    }

    if (
      !categoryChannel
        .permissionsFor(target)
        .has(PermissionFlagsBits.ViewChannel)
    ) {
      if (!force) {
        return await interaction.followUp({
          content: `У ${target} нет прав на просмотр канала-категории ${categoryChannel}`
        })
      }
      categoryChannel.permissionOverwrites.create(target, {
        ViewChannel: true
      })
    }

    let roleMembers: Collection<string, GuildMember> = new Collection()

    if (!targetIsMember) {
      roleMembers = (await interaction.guild!.members.fetch()).filter(
        (m) => !m.user.bot && m.roles.resolve(target.id)
      )

      if (!roleMembers.size) {
        return await interaction.followUp({
          content: `На сервере нет участников с ролью ${target} (боты не учитываются)`
        })
      }

      await channel.members.fetch()
      roleMembers = roleMembers.filter((m) => !channel.members.resolve(m.id))

      if (!roleMembers.size) {
        return await interaction.followUp({
          content: `Все участники с ролью ${target} уже есть в тикете`
        })
      }
    }

    // mentions work as members.add, but don't trigger non-deletable system message
    channel
      .send(
        targetIsMember
          ? userMention(target.id)
          : roleMembers.map((m) => userMention(m.id)).join('')
      )
      .then((message) => {
        message.delete() // we don't want to duplicate mentions of users
        interaction.deleteReply()
        channel.send({
          embeds: [
            buildEmbed({
              roleMembersMentions: roleMembers.map((m) => userMention(m.id)),
              moderator: interaction.user,
              target
            })
          ]
        })
      })
  }

  @Slash({
    description: 'Удалить участника или роль из тикета',
    name: 'remove'
  })
  public async remove(
    @SlashOption({
      type: ApplicationCommandOptionType.Mentionable,
      description: 'Кого удалить',
      required: true,
      name: 'target'
    })
    target: GuildMember | Role,
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({
      ephemeral: true
    })

    const ticket = await this.ticketService.getOne({
      channelId: interaction.channelId
    })
    const targetIsMember = target instanceof GuildMember

    if (!ticket) {
      return await interaction.followUp({
        content: 'Используйте эту команду в канале, который является тикетом'
      })
    }

    const channel = interaction.channel as ThreadChannel
    // possible feature: delete categoryChannel permission overwrites if
    // a) there were any b) it was the last user's ticket in the category

    if (
      targetIsMember &&
      !(await channel.members.fetch(target.id).catch(() => null))
    ) {
      return await interaction.followUp({
        content: `${target} нет в тикете`
      })
    }

    let roleMembers: GuildMember[] = []

    if (!targetIsMember) {
      roleMembers = (await channel.members.fetch())
        .map((m) => m.guildMember as GuildMember)
        .filter((m) => !m.user.bot && m.roles.resolve(target.id))

      if (!roleMembers.length) {
        return await interaction.followUp({
          content: `В тикете не было участников с ролью ${target} (боты не учитываются)`
        })
      }
    }

    if (targetIsMember) {
      await channel.members.remove(target.id) // also creates non-deletable system message
    } else {
      for (const member of roleMembers.values()) {
        await channel.members.remove(member.id) // also creates non-deletable system message
      }
    }
    interaction.deleteReply()
    channel.send({
      embeds: [
        buildEmbed({
          roleMembersMentions: roleMembers.map((m) => userMention(m.id)),
          moderator: interaction.user,
          add: false,
          target
        })
      ]
    })
  }
}
