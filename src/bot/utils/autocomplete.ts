import { AutocompleteInteraction } from 'discord.js'

import { TicketService } from '../../services/ticket.service'
import { PanelService } from '../../services/panel.service'
import { dateToStr } from './date-processing'

export async function panelAutocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  const panelService = new PanelService()
  const panels = await panelService.getList({
    conditions: {
      server: {
        guildId: interaction.guildId!
      }
    }
  })

  await interaction.respond(
    panels.map((panel) => ({
      name: panel.name,
      value: panel.id
    }))
  )
}

export async function ticketAutocomplete(
  interaction: AutocompleteInteraction,
  { returnChannel }: { returnChannel?: boolean } = {}
): Promise<void> {
  const ticketService = new TicketService()
  const tickets = await ticketService.getList({
    conditions: {
      category: {
        panel: {
          server: {
            guildId: interaction.guildId!
          }
        }
      }
    }
  })
  const threads = (await interaction.guild!.channels.fetchActiveThreads())
    .threads

  await interaction.respond(
    tickets.map((ticket) => ({
      name:
        (threads.get(ticket.channelId)?.name || ticket.userId) +
        ` ${dateToStr(ticket.createdAt)}`,
      value: returnChannel ? ticket.channelId : ticket.id
    }))
  )
}
