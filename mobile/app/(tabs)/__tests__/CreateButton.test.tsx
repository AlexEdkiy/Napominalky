// Моки до импортов
// ВАЖНО: jest.mock hoistится до объявлений переменных.
// Поэтому mockPush и mockPathname не могут быть замкнуты в factory jest.mock.
// Используем jest.fn() напрямую в factory и получаем ссылки через require/import.

let mockPathname = '/'

jest.mock('@expo/vector-icons', () => {
  const React = require('react')
  const { View } = require('react-native')
  const Ionicons = ({ name }: { name: string }) =>
    React.createElement(View, { testID: `icon-${name}` })
  return { Ionicons }
})

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  usePathname: () => mockPathname,
}))

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { accent: '#0D9488' },
  }),
}))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import CreateButton, { resolveCreateRoute } from '@/components/tabs/CreateButton'

const mockPush = router.push as jest.MockedFunction<typeof router.push>

beforeEach(() => {
  mockPush.mockClear()
})

// --- Модульные тесты маппинга ---

describe('resolveCreateRoute', () => {
  it('«/» → «/create»', () => {
    expect(resolveCreateRoute('/')).toBe('/create')
  })

  it('«/lists» → «/lists/new»', () => {
    expect(resolveCreateRoute('/lists')).toBe('/lists/new')
  })

  it('«/notes-list» → «/notes/new»', () => {
    expect(resolveCreateRoute('/notes-list')).toBe('/notes/new')
  })

  it('«/reminders-tab» (список напоминаний) → «/reminders/new»', () => {
    expect(resolveCreateRoute('/reminders-tab')).toBe('/reminders/new')
  })

  it('«/reminders-tab/calendar» (календарь) → «/reminders/new»', () => {
    expect(resolveCreateRoute('/reminders-tab/calendar')).toBe('/reminders/new')
  })

  it('неизвестный путь → «/create»', () => {
    expect(resolveCreateRoute('/unknown')).toBe('/create')
    expect(resolveCreateRoute('/calendar')).toBe('/create')
    expect(resolveCreateRoute('')).toBe('/create')
  })
})

// --- Интеграционные тесты компонента ---

describe('CreateButton — нажатие вызывает push с нужным маршрутом', () => {
  it('на «/» — push «/create»', async () => {
    mockPathname = '/'
    const { getByLabelText } = await render(<CreateButton />)
    fireEvent.press(getByLabelText('Создать'))
    expect(mockPush).toHaveBeenCalledWith('/create')
  })

  it('на «/lists» — push «/lists/new»', async () => {
    mockPathname = '/lists'
    const { getByLabelText } = await render(<CreateButton />)
    fireEvent.press(getByLabelText('Создать'))
    expect(mockPush).toHaveBeenCalledWith('/lists/new')
  })

  it('на «/notes-list» — push «/notes/new»', async () => {
    mockPathname = '/notes-list'
    const { getByLabelText } = await render(<CreateButton />)
    fireEvent.press(getByLabelText('Создать'))
    expect(mockPush).toHaveBeenCalledWith('/notes/new')
  })

  it('на «/reminders-tab» — push «/reminders/new»', async () => {
    mockPathname = '/reminders-tab'
    const { getByLabelText } = await render(<CreateButton />)
    fireEvent.press(getByLabelText('Создать'))
    expect(mockPush).toHaveBeenCalledWith('/reminders/new')
  })

  it('на «/reminders-tab/calendar» — push «/reminders/new»', async () => {
    mockPathname = '/reminders-tab/calendar'
    const { getByLabelText } = await render(<CreateButton />)
    fireEvent.press(getByLabelText('Создать'))
    expect(mockPush).toHaveBeenCalledWith('/reminders/new')
  })
})
