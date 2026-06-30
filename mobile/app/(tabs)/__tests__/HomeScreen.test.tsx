// Моки до импортов

jest.mock('@/db/client', () => ({ db: {} }))

jest.mock('@expo/vector-icons', () => {
  const React = require('react')
  const { View } = require('react-native')
  const Ionicons = ({ name }: { name: string }) =>
    React.createElement(View, { testID: `icon-${name}` })
  return { Ionicons }
})

jest.mock('expo-linear-gradient', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'linear-gradient', ...props }, children),
  }
})

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}))

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}))

const mockSyncNow = jest.fn(async () => undefined)

jest.mock('@/hooks/useSyncEngine', () => ({
  useSyncEngine: () => ({
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    syncNow: mockSyncNow,
  }),
}))

jest.mock('@/hooks/useNotes', () => ({
  useNotes: () => ({ notes: [], isLoading: false, deleteNote: { mutate: jest.fn() } }),
}))

jest.mock('@/hooks/useReminders', () => ({
  useReminders: () => ({ reminders: [], isLoading: false }),
}))

jest.mock('@/hooks/useShoppingLists', () => ({
  useShoppingLists: () => ({ lists: [], isLoading: false }),
}))

jest.mock('@/components/home/FilterChips', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'filter-chips' }),
  }
})

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      screenBg: '#fff',
      accent: '#0D9488',
      amber: '#D9962A',
      noteBlue: '#4067a8',
      noteBlueBg: '#dde6f3',
      accentSoftBg: '#DDF1ED',
      amberBg: '#FBEFD6',
      textSecondary: '#76828F',
      textTertiary: '#9AA6B2',
    },
  }),
}))

jest.mock('@/theme/typography', () => ({
  typography: { cardTitle: {}, body: {} },
}))

import React from 'react'
import { render } from '@testing-library/react-native'
import HomeScreen from '../index'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('HomeScreen — заголовок', () => {
  it('рендерит DarkHeader с title «Вспомнить всё!»', async () => {
    const { getByText } = await render(<HomeScreen />)
    expect(getByText('Вспомнить всё!')).toBeTruthy()
  })
})

describe('HomeScreen — pull-to-refresh', () => {
  it('ScrollView (testID=home-scroll) присутствует', async () => {
    const { getByTestId } = await render(<HomeScreen />)
    expect(getByTestId('home-scroll')).toBeTruthy()
  })

  it('ScrollView имеет prop refreshControl', async () => {
    const { getByTestId } = await render(<HomeScreen />)
    const scrollView = getByTestId('home-scroll')
    expect((scrollView.props as Record<string, unknown>).refreshControl).toBeDefined()
  })

  it('onRefresh вызывает syncNow', async () => {
    const { getByTestId } = await render(<HomeScreen />)
    const scrollView = getByTestId('home-scroll')
    const { refreshControl } = scrollView.props as {
      refreshControl: { props: { onRefresh: () => Promise<void> } }
    }
    await refreshControl.props.onRefresh()
    expect(mockSyncNow).toHaveBeenCalledTimes(1)
  })

  it('refreshing = false при isSyncing=false', async () => {
    const { getByTestId } = await render(<HomeScreen />)
    const scrollView = getByTestId('home-scroll')
    const { refreshControl } = scrollView.props as {
      refreshControl: { props: { refreshing: boolean } }
    }
    expect(refreshControl.props.refreshing).toBe(false)
  })
})
