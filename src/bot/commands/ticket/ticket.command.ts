import {
  ApplicationCommandOptionType,
  CommandInteraction,
  channelMention,
  ThreadChannel,
  EmbedBuilder,
  userMention,
  codeBlock
} from 'discord.js'
import { SlashOption, SlashGroup, Discord, Slash } from 'discordx'
import discordTranscripts from 'discord-html-transcripts'

import { ticketAutocomplete, timestamp, dateToStr } from '../../utils'
import { TicketService } from '../../../services/ticket.service'
import { rootGroupName } from './constants'
import { Color } from '../../../constants'

const ACTIVE = '📝'
const CLOSED = '🔒'

@SlashGroup(rootGroupName)
@SlashGroup({
  description: 'Управление тикетами',
  name: rootGroupName
})
@Discord()
export class TicketCommand {
  private readonly ticketService = new TicketService()

  @Slash({
    description: 'Получить транскрипт тикета',
    name: 'transcript'
  })
  public async transcript(
    @SlashOption({
      autocomplete: (i) => ticketAutocomplete(i, { returnChannel: true }),
      type: ApplicationCommandOptionType.String,
      description: 'ID тикета',
      required: false,
      name: 'id'
    })
    id: string | null,
    interaction: CommandInteraction
  ) {
    const channel = await interaction.guild?.channels.fetch(
      id || interaction.channelId
    )

    if (!channel || !channel.isTextBased()) {
      return await interaction.followUp({
        content: `Канал ${
          id || interaction.channelId
        } не найден или он не текстовый`
      })
    }

    const transcript = await discordTranscripts.createTranscript(channel, {
      filename: `${channel.name}_${dateToStr()}.html`,
      poweredBy: false, // remove author from footer
      saveImages: true, // encode all images in base64 instead of referencing to discord
      footerText: ' ', // remove footer ('' doesn't work)
      hydrate: true // inject 3rd party script right into file instead of referencing to CDN
    })
    interaction.reply({ files: [transcript] })
  }

  @Slash({
    description: 'Показать список тикетов',
    name: 'list'
  })
  public async list(
    @SlashOption({
      description: 'ID участника, канала, или тикета',
      autocomplete: (i) => ticketAutocomplete(i),
      type: ApplicationCommandOptionType.String,
      required: true,
      name: 'id'
    })
    id: string,
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({
      ephemeral: true
    })

    const tickets = await this.ticketService.getListByUnknownId({ id })
    if (!tickets.length) {
      return await interaction.followUp({
        content: `Тикеты с id ${id} не найдены`
      })
    }

    const by = {
      channel: tickets.every((t) => t.channelId === id),
      user: tickets.every((t) => t.userId === id)
    }
    const threads = (await interaction.guild!.channels.fetchActiveThreads())
      .threads

    const embed = new EmbedBuilder()
      .setDescription(
        tickets.length > 1
          ? 'Список тикетов'
          : 'Тикет' +
              (by.user
                ? ` ${
                    interaction.guild?.members.cache.get(id)
                      ? 'участника'
                      : 'пользователя'
                  } ${userMention(id)}`
                : by.channel
                ? ` в канале ${channelMention(id)}`
                : '')
      )
      .setColor(Color.Yellow)

    for (const ticket of tickets) {
      embed.addFields({
        value: `${channelMention(ticket.channelId)} ${
          by.user ? '' : userMention(ticket.userId)
        } ${timestamp(ticket.createdAt)}`.trim(),
        name: `${ticket.id} (${threads.get(id) ? ACTIVE : CLOSED})`
      })
    }

    await interaction.followUp({ embeds: [embed] })
  }

  @Slash({
    description: 'Закрыть тикет',
    name: 'close'
  })
  public async close(
    @SlashOption({
      autocomplete: (i) => ticketAutocomplete(i, { returnChannel: true }),
      description: 'ID тикета (оставьте пустым, чтобы закрыть текущий)',
      type: ApplicationCommandOptionType.String,
      required: false,
      name: 'id'
    })
    id: string | null,
    @SlashOption({
      type: ApplicationCommandOptionType.String,
      description: 'Причина закрытия',
      required: false,
      name: 'reason'
    })
    reason: string | null,
    interaction: CommandInteraction
  ) {
    await interaction.deferReply({
      ephemeral: true
    })

    const channel = (await interaction.guild?.channels.fetch(
      id || interaction.channelId
    )) as ThreadChannel | undefined

    if (!channel || !channel.isTextBased()) {
      return await interaction.followUp({
        content: 'Канал не найден или он не текстовый'
      })
    }

    const ticket = await this.ticketService.getOne({
      channelId: channel.id
    })

    if (!ticket) {
      return await interaction.followUp({
        content: `Тикет канала ${channelMention(
          channel.id
        )} не найден в базе данных`
      })
    }

    await this.ticketService.delete({
      id: ticket.id
    })

    const embed = new EmbedBuilder()
      .setTitle('Закрытие тикета')
      .setFields(
        {
          value: userMention(ticket.userId),
          name: 'Закрыл'
        },
        {
          value: codeBlock(reason || 'Не указана'),
          name: 'Причина'
        }
      )
      .setColor(Color.Red)
      .setFooter({
        iconURL: (
          await interaction.guild?.members.fetch(interaction.user.id)
        )?.displayAvatarURL(),
        text: ticket.id
      })

    await channel.send({ embeds: [embed] })
    channel.setLocked(true)
    channel.setArchived(true)
    interaction.followUp({ content: 'Тикет успешно закрыт' })
  }
}
