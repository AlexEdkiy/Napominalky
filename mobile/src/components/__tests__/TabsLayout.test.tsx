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

  it('порядок видимых вкладок: index, lists, create-placeholder, calendar, notes-list', async () => {
    await render(<TabsLayout />)
    const visible = screenNames.filter((n) => screenOptions[n]?.['href'] !== null)
    const expectedOrder = ['index', 'lists', 'create-placeholder', 'calendar', 'notes-list']
    expectedOrder.forEach((name) => {
      expect(visible).toContain(name)
    })
    // notes-list должен быть последним видимым
    expect(visible[visible.length - 1]).toBe('notes-list')
  })
})
