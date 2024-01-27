export const panelButtonPrefix = 'ticket-create'
export const panelButtonIdPattern = new RegExp(
  `^${panelButtonPrefix}\\-(.+?)+$`
)
export const createCategoryModalPrefix = 'panel-category-create'
export const createCategoryModalIdPattern = new RegExp(
  `^${createCategoryModalPrefix}`
)
export const editModalId = 'panel-edit'
export const editModalIdPattern = new RegExp(`^${editModalId}`)

/**
 * Создаёт Custom ID кнопки создания тикета
 * @param categoryId ID категории панели
 * @returns Custom ID кнопки создания тикета
 */
export function serializePanelButtonId(categoryId: string): string {
  return `${panelButtonPrefix}-${categoryId}`
}

/**
 * Десериализует Custom ID кнопки создания тикета
 * @param id Custom ID кнопки создания тикета
 * @returns ID категории панели
 */
export function deserializePanelButtonId(id: string): string {
  return id.replace(`${panelButtonPrefix}-`, '')
}

/**
 * Проверяет, является ли строка Custom ID кнопки создания тикета
 * @param id Custom ID кнопки создания тикета
 * @returns Результат проверки
 */
export function isPanelButtonId(id: string): boolean {
  return id.startsWith(panelButtonPrefix)
}

// create category ↓
/**
 * Создаёт Custom ID модального окна создания категории для панели
 * @param channelId ID канала, в котором будет создаваться тикет категории
 * @param panelID ID панели, которой будет принадлежать категория
 * @returns Custom ID модального окна создания категории
 */
export function serializeCreateCategoryModalId({
  channelId,
  panelId
}: {
  channelId: string
  panelId: string
}): string {
  return `${createCategoryModalPrefix}%${channelId}%${panelId}` // ≈80 chars
}

/**
 * Десериализует Custom ID модального окна создания категории в панели
 * @param id Custom ID модального окна создания категории
 * @returns channelId ID канала, в котором будет создаваться тикет категории
 * @returns panelID ID панели, которой будет принадлежать категория
 */
export function deserializeCreateCategoryModalId(id: string): {
  channelId: string
  panelId: string
} {
  const [channelId, panelId] = id.split('%').slice(1)
  return { channelId, panelId }
}

/**
 * Проверяет, является ли строка Custom ID модального окна создания категории для панели
 * @param id строка для проверки
 * @returns Результат проверки
 */
export function isCreateCategoryModalId(id: string) {
  return !id.match(createCategoryModalIdPattern)
}
// create category ↑

// edit ↓
/**
 * Создаёт Custom ID модального окна для редактирования панели
 * @param panelID ID панели, которую нужно отредактировать
 * @returns Custom ID модального окна редактирования панели
 */
export function serializeEditModalId({ panelId }: { panelId: string }): string {
  return `${editModalId}%${panelId}`
}

/**
 * Десериализует Custom ID модального окна редактирования панели
 * @param id Custom ID модального окна редактирования панели
 * @returns panelID ID редактируемой панели
 */
export function deserializeEditModalId(id: string): { panelId: string } {
  const [panelId] = id.split('%').slice(1)
  return { panelId }
}

/**
 * Проверяет, является ли строка Custom ID модального окна редактирования панели
 * @param id строка для проверки
 * @returns Результат проверки
 */
export function isEditModalId(id: string) {
  return !id.match(editModalIdPattern)
}
// edit ↑
