/**
 * Тесты проверяют, что ключевые вкладки используют DarkHeader с нужными заголовками.
 */
jest.mock('@/db/client', () => ({ db: {} }))

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  Stack: { Screen: () => null },
}))

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}))

const MOCK_COLORS = {
  surface: '#fff',
  screenBg: '#eef1f1',
  accent: '#0EA5A0',
  accentDark: '#087f7a',
  accentSoftBg: '#DDF1ED',
  accentOnSoft: '#065f5c',
  amber: '#F59E0B',
  amberBg: '#FBEFD6',
  coral: '#FF6B6B',
  coralSoftBg: '#FFE8E8',
  danger: '#FF3B30',
  dangerSoftBg: '#FFE8E8',
  purple: '#8B5CF6',
  purpleBg: '#EDE9FE',
  noteBlue: '#3B82F6',
  noteBlueBg: '#EFF6FF',
  textPrimary: '#111',
  textSecondary: '#666',
  textTertiary: '#999',
  textFaint: '#ccc',
  borderSubtle: '#eee',
  borderInput: '#ddd',
  background: '#fff',
  appBg: '#eef1f1',
}

jest.mock('@/theme', () => ({
  useTheme: () => ({ colors: MOCK_COLORS }),
}))

jest.mock('@/theme/typography', () => ({
  typography: {
    screenTitle: { fontSize: 26, fontWeight: '700' },
    cardTitle: { fontSize: 17, fontWeight: '700' },
    body: { fontSize: 15 },
    bodyMd: { fontSize: 16 },
    bodySm: { fontSize: 13 },
    h2: { fontSize: 24, fontWeight: '800' },
    buttonLabel: { fontSize: 16, fontWeight: '700' },
    sectionLabel: { fontSize: 11, fontWeight: '700' },
    tabLabel: { fontSize: 11, fontWeight: '600' },
  },
}))

jest.mock('@/hooks/useSyncEngine', () => ({
  useSyncEngine: () => ({
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    syncNow: jest.fn(),
  }),
}))

jest.mock('@/hooks/useNotes', () => ({
  useNotes: () => ({ notes: [], isLoading: false, deleteNote: { mutate: jest.fn() } }),
}))

jest.mock('@/hooks/useReminders', () => ({
  useReminders: () => ({ reminders: [], isLoading: false }),
}))

jest.mock('@/hooks/useShoppingLists', () => ({
  useShoppingLists: () => ({ lists: [], isLoading: false, isError: false }),
  useNearestDeadlines: () => new Map(),
}))

jest.mock('@/hooks/useCalendar', () => ({
  useCalendar: () => ({ byDay: new Map() }),
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    guestMode: true,
    continueAsGuest: jest.fn(),
    login: { mutate: jest.fn(), isPending: false },
    logout: { mutate: jest.fn(), isPending: false },
    register: { mutate: jest.fn(), isPending: false },
  }),
}))

jest.mock('@/utils/datetime', () => ({
  formatRelativeReminder: (s: string) => s,
  formatUpdatedAt: (s: string) => s,
  isReminderUrgent: () => false,
  formatDeadlineChip: (s: string) => s,
}))

jest.mock('@/utils/dateRange', () => ({
  formatMonthTitle: () => 'Июнь 2026',
  ymd: () => '2026-06-26',
}))

jest.mock('@/components/home/FilterChips', () => {
  const { View } = require('react-native')
  const FilterChips = () => <View testID="filter-chips" />
  return { __esModule: true, default: FilterChips }
})

jest.mock('@/components/calendar/MonthGrid', () => {
  const { View } = require('react-native')
  return () => <View testID="month-grid" />
})

jest.mock('@/components/calendar/DayRemindersSheet', () => {
  const { View } = require('react-native')
  return () => <View testID="day-reminders-sheet" />
})

jest.mock('@/components/ui/IconSquare', () => {
  const { View } = require('react-native')
  return () => <View testID="icon-square" />
})

jest.mock('@/components/ui/SectionLabel', () => {
  const { View } = require('react-native')
  return () => <View testID="section-label" />
})

jest.mock('@/components/common/BaseButton', () => {
  const { View } = require('react-native')
  return () => <View testID="base-button" />
})

jest.mock('expo-constants', () => ({
  default: { expoConfig: { version: '1.0.0' } },
}))

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

import HomeScreen from '../../../app/(tabs)/index'
import ListsScreen from '../../../app/(tabs)/lists'
import CalendarScreen from '../../../app/(tabs)/calendar'
import ProfileScreen from '../../../app/(tabs)/profile'
import NotesListScreen from '../../../app/(tabs)/notes-list'

describe('Вкладки — DarkHeader', () => {
  describe('HomeScreen', () => {
    it('рендерит DarkHeader с заголовком «Вспомнить всё!»', async () => {
      const { getByText } = await render(<HomeScreen />)
      expect(getByText('Вспомнить всё!')).toBeTruthy()
    })

    it('рендерит LinearGradient (тёмная шапка)', async () => {
      const { getByTestId } = await render(<HomeScreen />)
      expect(getByTestId('linear-gradient')).toBeTruthy()
    })

    it('использует collapsibleSearch — кнопка-лупа видна', async () => {
      const { getByLabelText } = await render(<HomeScreen />)
      // collapsibleSearch: кнопка "Поиск" (лупа) всегда видна в шапке
      expect(getByLabelText('Поиск')).toBeTruthy()
    })

    it('рендерит кнопку аватара (переход в профиль)', async () => {
      const { getByLabelText } = await render(<HomeScreen />)
      expect(getByLabelText('Профиль')).toBeTruthy()
    })
  })

  describe('ListsScreen', () => {
    it('рендерит DarkHeader с заголовком «Списки»', async () => {
      const { getByText } = await render(<ListsScreen />)
      expect(getByText('Списки')).toBeTruthy()
    })

    it('рендерит LinearGradient (тёмная шапка)', async () => {
      const { getByTestId } = await render(<ListsScreen />)
      expect(getByTestId('linear-gradient')).toBeTruthy()
    })
  })

  describe('CalendarScreen', () => {
    it('рендерит DarkHeader с заголовком «Календарь»', async () => {
      const { getByText } = await render(<CalendarScreen />)
      expect(getByText('Календарь')).toBeTruthy()
    })

    it('рендерит LinearGradient (тёмная шапка)', async () => {
      const { getByTestId } = await render(<CalendarScreen />)
      expect(getByTestId('linear-gradient')).toBeTruthy()
    })
  })

  describe('ProfileScreen', () => {
    it('рендерит DarkHeader с заголовком «Профиль»', async () => {
      const { getAllByText } = await render(<ProfileScreen />)
      expect(getAllByText('Профиль').length).toBeGreaterThan(0)
    })

    it('рендерит LinearGradient (тёмная шапка)', async () => {
      const { getByTestId } = await render(<ProfileScreen />)
      expect(getByTestId('linear-gradient')).toBeTruthy()
    })
  })

  describe('NotesListScreen', () => {
    it('рендерит DarkHeader с заголовком «Заметки»', async () => {
      const { getByText } = await render(<NotesListScreen />)
      expect(getByText('Заметки')).toBeTruthy()
    })

    it('рендерит LinearGradient (тёмная шапка)', async () => {
      const { getByTestId } = await render(<NotesListScreen />)
      expect(getByTestId('linear-gradient')).toBeTruthy()
    })

    it('рендерит пустое состояние когда нет заметок', async () => {
      const { getByText } = await render(<NotesListScreen />)
      expect(getByText('Заметок пока нет')).toBeTruthy()
    })

    it('кнопка аватара ведёт на профиль', async () => {
      const { getByLabelText } = await render(<NotesListScreen />)
      const { router } = require('expo-router')
      fireEvent.press(getByLabelText('Профиль'))
      expect(router.push).toHaveBeenCalledWith('/(tabs)/profile')
    })

    it('кнопка-лупа раскрывает строку поиска', async () => {
      const { getByLabelText, getByPlaceholderText } = await render(<NotesListScreen />)
      fireEvent.press(getByLabelText('Поиск'))
      await waitFor(() => expect(getByPlaceholderText('Поиск')).toBeTruthy())
    })

    it('рендерит заметки из useNotes', async () => {
      const mockDeleteNote = { mutate: jest.fn() }
      jest.spyOn(require('@/hooks/useNotes'), 'useNotes').mockReturnValue({
        notes: [
          {
            uuid: 'note-1',
            title: 'Тестовая заметка',
            updatedAt: '2026-06-01T10:00:00Z',
            isPinned: false,
            color: null,
          },
        ],
        isLoading: false,
        deleteNote: mockDeleteNote,
      })
      const { getByText } = await render(<NotesListScreen />)
      expect(getByText('Тестовая заметка')).toBeTruthy()
    })

    it('long-press вызывает диалог удаления', async () => {
      const { Alert } = require('react-native')
      jest.spyOn(Alert, 'alert')
      const mockDeleteNote = { mutate: jest.fn() }
      jest.spyOn(require('@/hooks/useNotes'), 'useNotes').mockReturnValue({
        notes: [
          {
            uuid: 'note-2',
            title: 'Заметка для удаления',
            updatedAt: '2026-06-01T10:00:00Z',
            isPinned: false,
            color: null,
          },
        ],
        isLoading: false,
        deleteNote: mockDeleteNote,
      })
      const { getByLabelText } = await render(<NotesListScreen />)
      fireEvent(getByLabelText('Заметка для удаления'), 'longPress')
      expect(Alert.alert).toHaveBeenCalledWith(
        'Удалить заметку?',
        'Действие нельзя отменить.',
        expect.any(Array),
      )
    })

    it('нажатие на заметку открывает её', async () => {
      const { router } = require('expo-router')
      jest.spyOn(require('@/hooks/useNotes'), 'useNotes').mockReturnValue({
        notes: [
          {
            uuid: 'note-3',
            title: 'Открыть эту заметку',
            updatedAt: '2026-06-01T10:00:00Z',
            isPinned: false,
            color: null,
          },
        ],
        isLoading: false,
        deleteNote: { mutate: jest.fn() },
      })
      const { getByLabelText } = await render(<NotesListScreen />)
      fireEvent.press(getByLabelText('Открыть эту заметку'))
      expect(router.push).toHaveBeenCalledWith('/notes/note-3')
    })
  })
})
