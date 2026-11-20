import * as SecureStore from 'expo-secure-store'
import { t, translate, useLanguageStore } from '..'
import { formatDeadlineDisplay, formatRelativeReminder } from '@/utils/datetime'
import { formatMonthTitle } from '@/utils/dateRange'
import { pluralizeDays, pluralizeEvents } from '@/utils/pluralize'
import { listStatusLabel } from '@/utils/lists'
import { listShareText, noteShareText } from '@/utils/shareText'
import { groupPlanned } from '@/utils/reminderGrouping'

beforeEach(() => {
  jest.clearAllMocks()
  useLanguageStore.setState({ language: 'ru', isHydrated: false })
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null)
  jest.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined)
})

it('keeps Russian for existing installations and unsupported saved values', async () => {
  for (const saved of [null, 'de', '{invalid}']) {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(saved)
    await useLanguageStore.getState().hydrate()
    expect(useLanguageStore.getState()).toMatchObject({ language: 'ru', isHydrated: true })
  }
})

it('persists English separately from account and sync settings and restores it', async () => {
  await useLanguageStore.getState().setLanguage('en')
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('app_language', 'en')
  expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1)
  useLanguageStore.setState({ language: 'ru', isHydrated: false })
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue('en')
  await useLanguageStore.getState().hydrate()
  expect(t('Настройки')).toBe('Settings')
})

it('does not overwrite a user choice when hydration finishes late', async () => {
  let finish: (value: string | null) => void = () => {}
  jest.mocked(SecureStore.getItemAsync).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  const hydration = useLanguageStore.getState().hydrate()
  await useLanguageStore.getState().setLanguage('en')
  finish('ru')
  await hydration
  expect(useLanguageStore.getState().language).toBe('en')
})

it('keeps the current language on storage failure and can retry', async () => {
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('storage unavailable'))
  await expect(useLanguageStore.getState().setLanguage('en')).rejects.toThrow('storage unavailable')
  expect(t('Настройки')).toBe('Настройки')
  await useLanguageStore.getState().setLanguage('en')
  expect(t('Настройки')).toBe('Settings')
})

it('serializes quick choices so the last selected language survives a restart', async () => {
  await Promise.all([useLanguageStore.getState().setLanguage('en'), useLanguageStore.getState().setLanguage('ru')])
  expect(jest.mocked(SecureStore.setItemAsync).mock.calls).toEqual([['app_language', 'en'], ['app_language', 'ru']])
  expect(useLanguageStore.getState().language).toBe('ru')
})

it('interpolates user text literally without translating it or interpreting its placeholders', () => {
  expect(translate('Открыть: {0}', 'en', ['Сегодня {1} <script>'])).toBe('Open: Сегодня {1} <script>')
  expect(translate(' · Выполнено', 'en')).toBe(' · Done')
  expect(translate('toString', 'en')).toBe('toString')
})

it('updates dates, plurals, groups and share statuses at call time, preserving user content', async () => {
  const now = new Date(2026, 10, 20, 9)
  jest.useFakeTimers().setSystemTime(now)
  try {
    await useLanguageStore.getState().setLanguage('en')
    expect(formatMonthTitle(2026, 10)).toBe('November 2026')
    expect(formatDeadlineDisplay('2026-11-21')).toBe('21 Nov')
    expect(formatRelativeReminder(new Date(2026, 10, 20, 12).toISOString())).toBe('Today · 12:00')
    expect(pluralizeDays(1)).toBe('1 day')
    expect(pluralizeDays(21)).toBe('21 days')
    expect(pluralizeEvents(0)).toBe('0 events')
    expect(listStatusLabel({ type: 'goods', itemsCount: 1, checkedItemsCount: 0 })).toBe('1 item · 0 bought')
    expect(groupPlanned([{ remindAt: new Date(2026, 10, 20, 12).toISOString() }], now)[0]?.title).toBe('Today')
    expect(noteShareText('Сегодня', 'Новая заметка')).toBe('Сегодня\n\nНовая заметка')
    expect(listShareText('Работа', 'tasks', [{ name: 'Новая', status: 'in_progress', isChecked: false, quantity: 1 }]))
      .toBe('Работа\n\n☐ Новая — In progress')
    await useLanguageStore.getState().setLanguage('ru')
    expect(formatMonthTitle(2026, 10)).toBe('Ноябрь 2026')
    expect(pluralizeDays(21)).toBe('21 день')
  } finally { jest.useRealTimers() }
})
