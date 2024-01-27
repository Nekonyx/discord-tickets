import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  Role,
  TextChannel,
  ThreadChannel,
  User,
  roleMention,
  userMention
} from 'discord.js'
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx'

import { Color } from '../../../constants'
import { TicketService } from '../../../services/ticket.service'
import { rootGroupName } from './constants'

const groupName = 'member'

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
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({
      ephemeral: true
    })

    const ticket = await this.ticketService.getOne({
      channelId: interaction.channelId
    })

    if (!ticket) {
      return interaction.followUp({
        content: 'Используйте эту команду в канале, который является тикетом'
      })
    }

    /** Затронутые участники */
    const members = new Set<GuildMember>()

    /** Ветка с тикетом */
    const thread = interaction.channel as ThreadChannel
    /** Канал ветки */
    const channel = thread.parent as TextChannel

    // Если указан участник, то добавляем его
    // Если указана роль, то добавляем всех участников с этой ролью
    if (target instanceof GuildMember) {
      members.add(target)
    } else {
      const guildMembers = await interaction.guild!.members.fetch()
      const roleMembers = guildMembers.filter((m) => !m.user.bot && m.roles.cache.has(target.id))

      // Защита от дурака
      if (roleMembers.size >= 50) {
        return interaction.followUp({
          content: `Нельзя добавить больше 50 участников за раз`
        })
      }

      for (const member of roleMembers.values()) {
        members.add(member)
      }
    }

    // Удаляем из списка участников, которые уже есть в тикете
    for (const member of members) {
      if (thread.members.cache.has(member.id)) {
        members.delete(member)
      }
    }

    // Если никого не осталось, то делать тут нечего
    if (members.size === 0) {
      return interaction.followUp({
        content: `Все указанные участники уже есть в тикете`
      })
    }

    const membersArray = [...members]

    // Выдача прав на просмотр канала
    const membersWithoutPermission = membersArray.filter((member) => {
      return !channel.permissionsFor(member).has(PermissionFlagsBits.ViewChannel)
    })

    if (membersWithoutPermission.length > 0) {
      await Promise.all(
        membersWithoutPermission.map((member) =>
          channel.permissionOverwrites.create(member, {
            ViewChannel: true
          })
        )
      )
    }

    // что-то на англосакском
    // mentions work as members.add, but don't trigger non-deletable system message
    const pingMessage = await thread.send(membersArray.map((m) => m.toString()).join())

    await Promise.all([
      pingMessage.delete(),
      interaction.deleteReply(),
      thread.send({
        embeds: [
          buildEmbed({
            roleMembersMentions: membersArray.map((m) => m.toString()),
            moderator: interaction.user,
            target
          })
        ]
      })
    ])
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

    if (targetIsMember && !(await channel.members.fetch(target.id).catch(() => null))) {
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
