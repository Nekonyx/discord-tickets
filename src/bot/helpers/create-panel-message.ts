import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  TextChannel,
  Message
} from 'discord.js'

import { serializePanelButtonId } from '../utils'
import { Panel } from '../../db'

/**
 * Создаёт и отправляет сообщение с панелью
 *
 * @param panel Панель
 * @param channel Канал для отправки сообщения
 *
 * @returns Сообщение с панелью
 */
export async function createPanelMessage(
  panel: Panel,
  channel: TextChannel
): Promise<Message> {
  const row = new ActionRowBuilder<ButtonBuilder>()

  if (!panel.categories) {
    throw new Error('Panel categories are not defined')
  }

  for (const category of panel.categories) {
    const button = new ButtonBuilder(category.button)
      .setDisabled(false)
      .setCustomId(serializePanelButtonId(category.id))

    row.addComponents(button)
  }

  return channel.send({
    components: panel.categories.length ? [row] : [],
    embeds: [new EmbedBuilder(panel.embed)]
  })
}
