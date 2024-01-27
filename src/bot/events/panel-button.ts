import {
  ThreadAutoArchiveDuration,
  BaseGuildTextChannel,
  ButtonInteraction,
  ChannelType,
  userMention
} from 'discord.js'
import { ButtonComponent, Discord } from 'discordx'

import {
  deserializePanelButtonId,
  panelButtonIdPattern,
  isPanelButtonId
} from '../utils'
import { PanelCategoryService } from '../../services/panel-category.service'
import { TicketService } from '../../services/ticket.service'

@Discord()
export class PanelButtonEvents {
  private readonly panelCategoryService = new PanelCategoryService()
  private readonly ticketService = new TicketService()

  @ButtonComponent({
    id: panelButtonIdPattern
  })
  public async onButtonInteraction(interaction: ButtonInteraction) {
    if (!isPanelButtonId(interaction.customId)) {
      return
    }

    await interaction.deferReply({
      ephemeral: true
    })

    const panelCategory = await this.panelCategoryService.getOne({
      id: deserializePanelButtonId(interaction.customId)
    })

    if (!panelCategory) {
      console.error('Panel category was not found')
      return await interaction.followUp({
        content: 'Категория не найдена, свяжитесь с разработчиком'
      })
    }

    const channel = await interaction.guild!.channels.fetch(
      panelCategory.channelId
    )

    if (!channel) {
      console.error(`Channel ${panelCategory.channelId} was not found`)
      return await interaction.followUp({
        content: 'Канал не найден, свяжитесь с разработчиком'
      })
    }

    await interaction.followUp({
      content: `Создаём тикет в категории ${panelCategory.name}`
    })

    const thread = await (channel as BaseGuildTextChannel).threads
      .create({
        name: panelCategory.slug + '-' + interaction.user.username,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        type: ChannelType.PrivateThread
      })
      .catch((e) => {
        console.error(e)
        return null
      })

    if (!thread) {
      console.error('Thread was not created')
      await interaction.followUp({
        content: 'Не удалось создать тикет, свяжитесь с разработчиком',
        ephemeral: true
      })
      return
    }

    await thread.send({
      content: userMention(interaction.user.id),
      embeds: [panelCategory.embed]
    })

    await this.ticketService.create({
      categoryId: panelCategory.id,
      userId: interaction.user.id,
      channelId: thread.id
    })
  }
}
