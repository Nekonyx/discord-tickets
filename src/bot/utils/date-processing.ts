import { TimestampStylesString, TimestampStyles } from 'discord.js'

/**
 * Преобразует дату в строку в соответствии с заданным форматом
 * @param date дата
 * @param format формат даты (Y, M, D, m, s, h, y)
 * @example
 * dateToStr(new Date(), 'D.M.Y h:m:s')
 * // 30.10.2021 15:20:30
 * @example
 * dateToStr(new Date(), 'D.M (Y)')
 * // 30.10 (2021)
 * @example
 * dateToStr(new Date(), 'D.M.y')
 * // 30.10.21
 * @returns строка в указанном формате
 */
export function dateToStr(
  date: Date = new Date(),
  format: string = 'D.M.y h:m'
) {
  const pad = (num: number) => num.toString().padStart(2, '0')
  const formatDict = {
    y: date.getFullYear().toString().slice(-2),
    Y: date.getFullYear().toString(),
    M: pad(date.getMonth() + 1),
    m: pad(date.getMinutes()),
    s: pad(date.getSeconds()),
    h: pad(date.getHours()),
    D: pad(date.getDate())
  }
  return format.replace(
    new RegExp(Object.keys(formatDict).join('|'), 'gi'),
    (match) => formatDict[match as keyof typeof formatDict]
  )
}

/**
 * Возвращает объект даты в виде строки-timestamp для дискорда
 * @param date дата
 * @param style формат даты
 * @example
 * dateToStr(new Date(), TimestampStyles.RelativeTime)
 * // <t:1635100000:R> → (5 дн. назад)
 * @example
 * dateToStr(new Date(), TimestampStyles.ShortTime)
 * // <t:1635100000:t> → 15:20
 * @returns строка-timestamp
 */
export function timestamp(
  date: Date,
  style: TimestampStylesString = TimestampStyles.RelativeTime
) {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`
}
