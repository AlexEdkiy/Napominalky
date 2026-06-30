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
  useNotes: () => ({
    notes: [],
    isLoading: false,
    deleteNote: { mutate: jest.fn() },
  }),
}))

jest.mock('@/components/home/FeedCard', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'feed-card' }),
  }
})

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      screenBg: '#fff',
      accent: '#0D9488',
      noteBlue: '#4067a8',
      noteBlueBg: '#dde6f3',
      textSecondary: '#76828F',
      textTertiary: '#9AA6B2',
    },
  }),
}))

jest.mock('@/theme/typography', () => ({
  typography: { cardTitle: {}, body: {} },
}))

jest.mock('@/utils/datetime', () => ({
  formatUpdatedAt: (d: string) => d,
}))

jest.mock('@/utils/notes', () => ({
  sortNotesPinnedFirst: (notes: unknown[]) => notes,
}))

import React from 'react'
import { render } from '@testing-library/react-native'
import NotesListScreen from '../notes-list'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('NotesListScreen — pull-to-refresh', () => {
  it('FlatList (testID=notes-flatlist) присутствует', async () => {
    const { getByTestId } = await render(<NotesListScreen />)
    expect(getByTestId('notes-flatlist')).toBeTruthy()
  })

  it('FlatList имеет prop refreshControl', async () => {
    const { getByTestId } = await render(<NotesListScreen />)
    const flatList = getByTestId('notes-flatlist')
    expect((flatList.props as Record<string, unknown>).refreshControl).toBeDefined()
  })

  it('onRefresh вызывает syncNow', async () => {
    const { getByTestId } = await render(<NotesListScreen />)
    const flatList = getByTestId('notes-flatlist')
    const { refreshControl } = flatList.props as {
      refreshControl: { props: { onRefresh: () => Promise<void> } }
    }
    await refreshControl.props.onRefresh()
    expect(mockSyncNow).toHaveBeenCalledTimes(1)
  })
})
