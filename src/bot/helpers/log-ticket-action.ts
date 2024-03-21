import { ThreadChannel, EmbedBuilder, Client, TextChannel } from 'discord.js'

import { TicketService } from '../../services/ticket.service'
import { Ticket } from '../../db'

const ticketService = new TicketService()

/**
 * Отправляет переданный embed в тикет, а также в прикреплённый к категории тикета канал для логов
 * @param thread Канал тикета
 * @param client Объект клиента бота
 * @param ticket Объект тикета из базы данных
 * @param embed Embed для отправки в два канала
 */
export async function sendLogEmbed({
  thread,
  client,
  ticket,
  embed
}: {
  thread: ThreadChannel
  client: Client
  ticket: Ticket
  embed: EmbedBuilder
}): Promise<void> {
  if (!ticket.category) {
    ticket = (await ticketService.getOne({
      id: ticket.id,
      opts: {
        relations: {
          category: true
        }
      }
    }))!
  }

  thread.send({ embeds: [embed] })

  const logChannel = (await client.channels.fetch(ticket.category.channelId)) as TextChannel
  if (!logChannel) {
    return console.error(`Log channel ${ticket.category.channelId} not found`)
  }

  await logChannel.send({ embeds: [embed], content: thread.toString() })
}

/**
 * Отправляет переданный embed в прикреплённый к категории тикета канал для логов
 * Отличается от sendLogEmbed тем, что embed отправляется лишь в один канал
 * @param thread Канал тикета
 * @param client Объект клиента бота
 * @param embed Embed для отправки в два канала
 */
export async function logAction({
  thread,
  client,
  embed
}: {
  thread: ThreadChannel
  client: Client
  embed: EmbedBuilder
}) {
  const ticket = await ticketService.getOne({
    channelId: thread.id,
    opts: {
      relations: {
        category: true
      }
    }
  })

  if (!ticket) {
    return console.error(`Ticket with channelId ${thread.id} not found`)
  }

  const logChannel = (await client.channels.fetch(ticket.category.logChannelId)) as TextChannel
  if (!logChannel) {
    return console.error(`Log channel ${ticket.category.logChannelId} not found`)
  }

  await logChannel.send({ embeds: [embed], content: thread.toString() })
}
