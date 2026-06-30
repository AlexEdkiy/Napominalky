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

jest.mock('@/hooks/useShoppingLists', () => ({
  useShoppingLists: () => ({ lists: [], isLoading: false, isError: false }),
  useNearestDeadlines: () => new Map(),
}))

jest.mock('@/components/lists/ListCard', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'list-card' }),
  }
})

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      screenBg: '#fff',
      accent: '#0D9488',
      amber: '#D9962A',
      surface: '#fff',
      borderSubtle: '#EFF3F6',
      textPrimary: '#1B2733',
      textSecondary: '#76828F',
      danger: '#D9583C',
    },
  }),
}))

jest.mock('@/theme/typography', () => ({
  typography: { bodySm: {}, body: {}, cardTitle: {} },
}))

jest.mock('@/utils/datetime', () => ({
  formatDeadlineChip: (d: string) => d,
}))

import React from 'react'
import { render } from '@testing-library/react-native'
import ListsScreen from '../lists'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ListsScreen — pull-to-refresh', () => {
  it('FlatList (testID=lists-flatlist) присутствует', async () => {
    const { getByTestId } = await render(<ListsScreen />)
    expect(getByTestId('lists-flatlist')).toBeTruthy()
  })

  it('FlatList имеет prop refreshControl', async () => {
    const { getByTestId } = await render(<ListsScreen />)
    const flatList = getByTestId('lists-flatlist')
    expect((flatList.props as Record<string, unknown>).refreshControl).toBeDefined()
  })

  it('onRefresh вызывает syncNow', async () => {
    const { getByTestId } = await render(<ListsScreen />)
    const flatList = getByTestId('lists-flatlist')
    const { refreshControl } = flatList.props as {
      refreshControl: { props: { onRefresh: () => Promise<void> } }
    }
    await refreshControl.props.onRefresh()
    expect(mockSyncNow).toHaveBeenCalledTimes(1)
  })
})
