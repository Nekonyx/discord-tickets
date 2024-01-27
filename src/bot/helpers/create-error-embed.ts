import { EmbedBuilder, codeBlock } from 'discord.js'

import { Color } from '../../constants'

/**
 * Создаёт эмбед с описанием ошибки
 * @param incidentId ID инцидента
 * @param description Описание ошибки
 * @param error Ошибка
 * @returns Эмбед с описанием ошибки
 */
export function createErrorEmbed(
  incidentId: string,
  description?: string,
  error?: Error
): EmbedBuilder {
  description ??= 'Увы, возникла непредвиденная ошибка'
  return new EmbedBuilder()
    .setTitle('Возникла ошибка')
    .setColor(Color.Yellow)
    .setDescription(`${description}:${codeBlock(error?.message || '')}`)
    .addFields({
      value: `Можете сообщить его поддержке:${codeBlock(incidentId)}`,
      name: 'ID инцидента'
    })
}
