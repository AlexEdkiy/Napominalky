jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.3', nativeBuildVersion: '45' }))
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }))
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => {
  const { useAuthStore } = require('@/stores/authStore')
  const state = useAuthStore()
  return { user: state.user, isAuthenticated: !!state.token, guestMode: state.guestMode, logout: { mutate: jest.fn(), isPending: false } }
} }))
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { useAuthStore } from '@/stores/authStore'
import ProfileScreen from '../profile'

beforeEach(() => useAuthStore.setState({ token: 'fixture', guestMode: false, profileLoading: false, profileError: null, user: null }))
it('shows account name and the avatar returned by the existing API', async () => {
  useAuthStore.setState({ user: { uuid: 'alice', name: 'Александр', email: 'fixture@example.com', avatar: 'data:image/png;base64,fixture', is_admin: false, sync_enabled: true, created_at: '2026-01-01' } })
  const screen = await render(<ProfileScreen />)
  expect(screen.getByText('Александр')).toBeTruthy()
  expect(screen.getByLabelText('Фото профиля').props.source.uri).toBe('data:image/png;base64,fixture')
  expect(screen.queryByText('Гость')).toBeNull()
  await fireEvent(screen.getByLabelText('Фото профиля'), 'error')
  expect(screen.getByText('А')).toBeTruthy()
})
it('does not call a signed-in account a guest after a network error and offers retry', async () => {
  useAuthStore.setState({ profileError: 'Не удалось обновить профиль. Проверьте подключение.' })
  const screen = await render(<ProfileScreen />)
  expect(screen.getByText('Аккаунт')).toBeTruthy()
  expect(screen.getByText('Обновить профиль')).toBeTruthy()
  expect(screen.queryByText('Гость')).toBeNull()
})
it('retains the guest view when no account is signed in', async () => {
  useAuthStore.setState({ token: null, guestMode: true })
  const screen = await render(<ProfileScreen />)
  expect(screen.getByText('Гость')).toBeTruthy()
  expect(screen.getByText('Войти')).toBeTruthy()
})
