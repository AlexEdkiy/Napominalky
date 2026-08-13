/**
 * Тесты структуры таб-бара:
 * - profile скрыт (href: null)
 * - notes-list присутствует как видимый таб
 */
import React from 'react'
import { render } from '@testing-library/react-native'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}><Text>{name}</Text></View>
  )
  return { Ionicons }
})

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      accent: '#0D9488',
      textTertiary: '#9AA6B2',
      surface: '#fff',
      borderSubtle: '#eee',
    },
  }),
}))

const screenNames: string[] = []
const screenOptions: Record<string, Record<string, unknown>> = {}

jest.mock('expo-router', () => {
  const { View } = require('react-native')

  const Screen = ({ name, options }: { name: string; options?: Record<string, unknown> }) => {
    screenNames.push(name)
    if (options !== undefined) screenOptions[name] = options
    return null
  }

  const Tabs = ({ children }: { children: React.ReactNode }) => (
    <View testID="tabs-container">{children}</View>
  )
  Tabs.Screen = Screen

  return { Tabs, router: { push: jest.fn() } }
})

import TabsLayout from '../../../app/(tabs)/_layout'

describe('TabsLayout', () => {
  beforeEach(() => {
    screenNames.length = 0
    Object.keys(screenOptions).forEach((k) => { delete screenOptions[k] })
  })

  it('рендерит без ошибок', async () => {
    const { getByTestId } = await render(<TabsLayout />)
    expect(getByTestId('tabs-container')).toBeTruthy()
  })

  it('profile скрыт в таб-баре (href: null)', async () => {
    await render(<TabsLayout />)
    const profileOpts = screenOptions['profile']
    expect(profileOpts).toBeDefined()
    expect(profileOpts?.['href']).toBeNull()
  })

  it('экран notes-list присутствует', async () => {
    await render(<TabsLayout />)
    expect(screenNames).toContain('notes-list')
  })

  it('вкладка reminders-tab присутствует, отдельной вкладки calendar нет', async () => {
    await render(<TabsLayout />)
    expect(screenNames).toContain('reminders-tab')
    expect(screenNames).not.toContain('calendar')
  })

  it('подпись вкладки — короткая «Напомнить» (полная «Напоминания» обрезалась)', async () => {
    await render(<TabsLayout />)
    expect(screenOptions['reminders-tab']?.['title']).toBe('Напомнить')
  })

  it('иконка вкладки «Напоминания» — будильник (alarm / alarm-outline)', async () => {
    await render(<TabsLayout />)
    const tabBarIcon = screenOptions['reminders-tab']?.['tabBarIcon'] as (props: {
      focused: boolean
      color: string
      size: number
    }) => React.ReactElement
    expect(typeof tabBarIcon).toBe('function')
    const focusedRender = await render(tabBarIcon({ focused: true, color: '#000', size: 24 }))
    expect(focusedRender.getByTestId('icon-alarm')).toBeTruthy()
    const blurredRender = await render(tabBarIcon({ focused: false, color: '#000', size: 24 }))
    expect(blurredRender.getByTestId('icon-alarm-outline')).toBeTruthy()
  })

  it('порядок видимых вкладок: index, lists, create-placeholder, reminders-tab, notes-list', async () => {
    await render(<TabsLayout />)
    const visible = screenNames.filter((n) => screenOptions[n]?.['href'] !== null)
    // Строгий порядок как на макете: Главная, Задачи, «+», Напоминания, Заметки
    expect(visible).toEqual(['index', 'lists', 'create-placeholder', 'reminders-tab', 'notes-list'])
  })
})
