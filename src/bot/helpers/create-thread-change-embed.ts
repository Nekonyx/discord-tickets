import { EmbedBuilder, ThreadChannel, inlineCode } from 'discord.js'

import { Color } from '../../constants'

export function createThreadNameChangeEmbed({
  oldThread,
  newThread
}: {
  oldThread: ThreadChannel
  newThread: ThreadChannel
}) {
  return new EmbedBuilder()
    .setTitle('Изменение названия')
    .addFields(
      {
        name: 'Было',
        value: inlineCode(oldThread.name),
        inline: true
      },
      {
        name: 'Стало',
        value: inlineCode(newThread.name),
        inline: true
      }
    )
    .setColor(Color.Yellow)
}
