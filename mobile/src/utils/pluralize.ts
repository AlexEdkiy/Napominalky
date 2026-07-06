/**
 * Русская плюрализация числительных. Правило: 11–14 всегда «много»,
 * иначе выбор по последней цифре (1 → один, 2–4 → несколько, иначе → много).
 */
const pluralForm = (count: number, one: string, few: string, many: string): string => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

/** «N событие» / «N события» / «N событий» — заголовок списка дня в календаре. */
export const pluralizeEvents = (count: number): string =>
  `${count} ${pluralForm(count, 'событие', 'события', 'событий')}`
