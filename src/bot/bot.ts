import { IntentsBitField } from 'discord.js'
import { Client } from 'discordx'

import { TicketUserService } from '../services/ticket-user.service'
import { TicketService } from '../services/ticket.service'
import { ServerService } from '../services/server.service'
import { createThreadNameChangeEmbed, createErrorEmbed, logAction } from './helpers'
import { captureError } from './utils'

export const bot = new Client({
  intents: [
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMembers
  ]
})

const ticketUserService = new TicketUserService()
const ticketService = new TicketService()
const serverService = new ServerService()

bot.once('ready', async () => {
  const guilds = await bot.guilds.fetch()
  const servers = await serverService.getList()

  for (const guild of guilds.filter((g) => !servers.find((s) => s.guildId === g.id)).values()) {
    await serverService.create({ guildId: guild.id })
  }

  for (const server of servers) {
    if (!guilds.has(server.guildId)) {
      await serverService.delete({ guildId: server.guildId })
    }
  }
})

bot.on('guildCreate', (guild) => {
  if (!serverService.getOne({ guildId: guild.id })) {
    serverService.create({ guildId: guild.id })
  }
})

bot.on('guildDelete', (guild) => {
  serverService.delete({ guildId: guild.id })
})

// Обработчик покинувших тикет пользователей
bot.on('threadMembersUpdate', async (_, removedMembers, thread) => {
  if (!removedMembers.size || !thread.parent) return
  const ticket = await ticketService.getOne({ channelId: thread.id })
  if (!ticket) return

  for (const member of removedMembers.values()) {
    ticketUserService.delete({ conditions: { ticketId: ticket.id, userId: member.id } })
  }
})

bot.on('threadUpdate', async (oldThread, newThread) => {
  // Логирование обновлений названий тикетов
  if (
    oldThread.name !== newThread.name &&
    (await ticketService.getOne({ channelId: newThread.id }))
  ) {
    const embed = createThreadNameChangeEmbed({ oldThread, newThread })
    await logAction({ thread: newThread, client: bot, embed })
  }
})

// Выполнение команд с обработкой ошибок
bot.on('interactionCreate', async (interaction) => {
  try {
    await bot.executeInteraction(interaction)
  } catch (error) {
    const incidentId = captureError(error)

    if (!interaction.isRepliable()) {
      return
    }

    const embed = createErrorEmbed(
      incidentId,
      undefined,
      error instanceof Error ? error : undefined
    )

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        embeds: [embed]
      })
    } else {
      await interaction.reply({
        ephemeral: true,
        embeds: [embed]
      })
    }
  }
})
