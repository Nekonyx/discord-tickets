import {
  ApplicationCommandOptionType,
  PermissionOverwriteOptions,
  CommandInteraction,
  ThreadChannel,
  EmbedBuilder,
  GuildMember,
  roleMention,
  TextChannel,
  Role,
  User
} from 'discord.js'
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx'

import { Color } from '../../../constants'
import { TicketUserService } from '../../../services/ticket-user.service'
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
  private readonly ticketUserService = new TicketUserService()
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
    const affectedMembers = new Set<GuildMember>()

    /** Ветка с тикетом */
    const thread = interaction.channel as ThreadChannel
    /** Канал ветки */
    const channel = thread.parent as TextChannel

    // Если указан участник, то добавляем его
    // Если указана роль, то добавляем всех участников с этой ролью
    if (target instanceof GuildMember) {
      affectedMembers.add(target)
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
        affectedMembers.add(member)
      }
    }

    await thread.members.fetch()
    // Если затронутый участник уже находится в тикете,
    // удаляем его из списка затронутых участников
    // Иначе создаем запись логируем (последующее) присоединение участника к тикету
    for (const member of affectedMembers) {
      if (thread.members.cache.has(member.id)) {
        affectedMembers.delete(member)
        continue
      }

      this.ticketUserService.create({
        ticketId: ticket.id,
        moderatorId: interaction.user.id,
        userId: member.id
      })
    }

    // Если никого не осталось, то делать тут нечего
    if (affectedMembers.size === 0) {
      return interaction.followUp({
        content: `Все указанные участники уже есть в тикете`
      })
    }

    const members = [...affectedMembers]

    /** Права, которые будут выданы на канал-категорию */
    const requiredChannelPermissions: (keyof PermissionOverwriteOptions)[] = [
      'ViewChannel',
      'ReadMessageHistory',
      'SendMessagesInThreads'
    ]

    // Выдача прав на просмотр канала
    const membersWithoutPermission = members.filter((member) => {
      return requiredChannelPermissions.some(
        (permission) => !channel.permissionsFor(member).has(permission)
      )
    })
    // Создаём объект, который содержит в качестве ключей все значения массива requiredChannelPermissions
    // и присваиваем каждому ключу значение true, тем самым выдавая все указанные права
    const permissionsOverwrite = requiredChannelPermissions.reduce(
      (acc: PermissionOverwriteOptions, permission) => ((acc[permission] = true), acc),
      {}
    )

    if (membersWithoutPermission.length > 0) {
      await Promise.all(
        membersWithoutPermission.map((member) =>
          channel.permissionOverwrites.create(member, permissionsOverwrite)
        )
      )
    }

    // Упоминания работают как members.add, но не создают неудаляемые системные сообщения
    const pingMessage = await thread.send(members.map((m) => m.toString()).join(''))

    await Promise.all([
      pingMessage.delete(),
      interaction.deleteReply(),
      thread.send({
        embeds: [
          buildEmbed({
            membersMentions: members.map((m) => m.toString()),
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
    const affectedMembers = new Set<GuildMember>()
    const thread = interaction.channel as ThreadChannel
    const channelThreads = [...thread.parent!.threads.cache.values()]

    if (!ticket) {
      return interaction.followUp({
        content: 'Используйте эту команду в канале, который является тикетом'
      })
    }

    if (target instanceof GuildMember) {
      affectedMembers.add(target)
    } else {
      const guildMembers = await interaction.guild!.members.fetch()
      const roleMembers = guildMembers.filter((m) => !m.user.bot && m.roles.cache.has(target.id))

      for (const member of roleMembers.values()) {
        affectedMembers.add(member)
      }
    }

    if (!affectedMembers.size) {
      return interaction.followUp({
        content: `${target} нет в тикете`
      })
    }

    for (const member of affectedMembers) {
      await thread.members.remove(member.user.id) // создастся системное сообщение
      if (
        // проверяем, отсутствует ли участник в каждом из тикетов канала-категории
        // и если отсутствует во всех, то убираем права с канала-категории
        channelThreads.every((t) => !t.members.cache.get(member.user.id))
      ) {
        thread.parent!.permissionOverwrites.delete(member)
        this.ticketUserService.delete({ conditions: { ticketId: ticket.id, userId: member.id } })
      }
    }

    interaction.deleteReply()
    thread.send({
      embeds: [
        buildEmbed({
          membersMentions: [...affectedMembers].map((m) => m.toString()),
          moderator: interaction.user,
          add: false,
          target
        })
      ]
    })
  }
}

function buildEmbed({
  membersMentions,
  add = true,
  moderator,
  target
}: {
  membersMentions: string[]
  target: GuildMember | Role
  moderator: User
  add?: boolean
}) {
  const targetIsMember = target instanceof GuildMember
  const single = targetIsMember
    ? true
    : membersMentions.length
    ? membersMentions.length === 1
    : true

  const embed = new EmbedBuilder()
    .setColor(add ? Color.Green : Color.Red)
    .setTitle(
      add
        ? `Добавление участник${single ? 'а(-цы)' : 'ов'} в тикет`
        : `Удаление участник${single ? 'а(-цы)' : 'ов'} из тикета`
    )
    .addFields({
      value: moderator.toString(),
      name: 'Модератор',
      inline: true
    })
    .addFields({
      value:
        (targetIsMember ? '' : roleMention(target.id)) +
        (membersMentions ? '\n' + membersMentions.join(', ') : ''),
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
