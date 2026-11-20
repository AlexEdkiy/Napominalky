import { en } from './en'
import { getLanguage, type Language } from './languageStore'

export { getLanguage, useLanguage, useLanguageStore } from './languageStore'
export type { Language } from './languageStore'

/** Translate interface messages only. Parameters (including user text) are never translated. */
export function translate(message: string, language: Language, values: readonly (string | number)[] = []): string {
  const key = message.trim()
  const entry = en[key]
  const translated = language === 'en' && typeof entry === 'string'
    ? message.slice(0, message.indexOf(key)) + entry + message.slice(message.indexOf(key) + key.length)
    : message
  return translated.replace(/\{(\d+)\}/g, (token, index: string) => {
    const value = values[Number(index)]
    return value === undefined ? token : String(value)
  })
}

// Read at call time: callbacks, notifications and date formatters must not capture an old language.
export const t = (message: string, values?: readonly (string | number)[]): string =>
  translate(message, getLanguage(), values)

export const dateLocale = (): string => getLanguage() === 'en' ? 'en-GB' : 'ru-RU'
