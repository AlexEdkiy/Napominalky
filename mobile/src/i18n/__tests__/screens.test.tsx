jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('expo-router', () => {
  const React = require('react')
  const { Text } = require('react-native')
  return { router: { push: jest.fn() }, Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text> }
})
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null, MaterialIcons: () => null }))
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({
  continueAsGuest: jest.fn(), login: { mutate: jest.fn(), isPending: false, isError: false, error: null },
}) }))
jest.mock('@/theme', () => ({ useTheme: () => ({ colors: {
  screenBg: '#fff', surface: '#fff', textPrimary: '#111', textSecondary: '#666', textTertiary: '#888',
  accent: '#147f71', danger: '#a00', borderSubtle: '#ddd', borderInput: '#ccc',
} }) }))

import React from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { useLanguageStore } from '..'
import LoginScreen from '../../../app/(auth)/login'
import OnboardingScreen from '../../../app/(onboarding)/index'
import LanguageSelector from '@/components/settings/LanguageSelector'
import NoteForm from '@/components/notes/NoteForm'
import StatusBadge from '@/components/lists/StatusBadge'
import RecurrencePicker from '@/components/reminders/RecurrencePicker'

beforeEach(() => { useLanguageStore.setState({ language: 'ru', isHydrated: true }) })

it('switches the onboarding before sign-in and back without restarting', async () => {
  const screen = await render(<OnboardingScreen />)
  await fireEvent.press(screen.getByLabelText('English'))
  await waitFor(() => expect(screen.getByText('Works offline')).toBeTruthy())
  expect(screen.getByLabelText('English').props.accessibilityState.checked).toBe(true)
  expect(screen.getByLabelText('Русский').props.accessibilityState.checked).toBe(false)
  expect(screen.getByText('Start without an account')).toBeTruthy()
  expect(screen.queryByText('Работает офлайн')).toBeNull()
  await fireEvent.press(screen.getByLabelText('Русский'))
  await waitFor(() => expect(screen.getByText('Работает офлайн')).toBeTruthy())
})

it('changes login labels without clearing typed credentials', async () => {
  const screen = await render(<LoginScreen />)
  await fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com')
  await fireEvent.changeText(screen.getByLabelText('Пароль'), 'Новая{0}')
  await fireEvent.press(screen.getByLabelText('English'))
  await waitFor(() => expect(screen.getByLabelText('Password')).toBeTruthy())
  expect(screen.getByLabelText('Email').props.value).toBe('person@example.com')
  expect(screen.getByLabelText('Password').props.value).toBe('Новая{0}')
  expect(screen.getByText('Continue as a guest')).toBeTruthy()
})

it('updates an existing note editor in place without rewriting or autosaving its draft', async () => {
  const save = jest.fn()
  const screen = await render(<><LanguageSelector /><NoteForm mode="existing" autoSaveText={false} onAutoSave={save}
    initialValues={{ title: 'Работа', body: 'Заметки на русском' }} /></>)
  await fireEvent.changeText(screen.getByLabelText('Заголовок заметки'), 'Работа черновик')
  await fireEvent.press(screen.getByLabelText('English'))
  await waitFor(() => expect(screen.getByLabelText('Note title')).toBeTruthy())
  expect(screen.getByLabelText('Note title').props.value).toBe('Работа черновик')
  expect(screen.getByLabelText('Note text').props.value).toBe('Заметки на русском')
  expect(save).not.toHaveBeenCalled()
})

it('updates static status and repeat options after their modules were already imported', async () => {
  const screen = await render(<><StatusBadge status="in_progress" /><RecurrencePicker value="weekly" onChange={jest.fn()} /></>)
  await act(async () => { await useLanguageStore.getState().setLanguage('en') })
  expect(screen.getByText('In progress')).toBeTruthy()
  expect(screen.getByText('Weekly')).toBeTruthy()
  expect(screen.queryByText('В работе')).toBeNull()
})
