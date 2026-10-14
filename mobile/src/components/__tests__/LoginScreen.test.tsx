import { useAuthStore } from '@/stores/authStore'
/**
 * Smoke-тесты app/(auth)/login.tsx:
 * - рендерит поле Email, поле Пароль, кнопку «Войти»
 * - KeyboardAvoidingView + ScrollView присутствуют (клавиатура не перекрывает)
 */

jest.mock('expo-router', () => ({
  Link: ({ children, href, style }: {
    children: React.ReactNode
    href: string
    style?: unknown
  }) => {
    const { Text } = require('react-native')
    return <Text accessibilityRole="link" style={style}>{children}</Text>
  },
}))

const mockLoginMutate = jest.fn()
const mockGuest = jest.fn()

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    continueAsGuest: mockGuest,
    login: {
      mutate: mockLoginMutate,
      isPending: false,
      isError: false,
      error: null,
    },
  }),
}))

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      screenBg: '#fff',
      textPrimary: '#000',
      danger: '#f00',
      accent: '#0D9488',
    },
  }),
}))

jest.mock('@/theme/typography', () => ({
  typography: {
    h2: { fontSize: 24, fontWeight: '700' },
    body: { fontSize: 16 },
  },
}))

jest.mock('@/components/common/BaseButton', () => {
  const { TouchableOpacity, Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ label, onPress, loading }: {
      label: string
      onPress: () => void
      loading?: boolean
    }) => (
      <TouchableOpacity onPress={onPress} accessibilityLabel={label} disabled={loading}>
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
  }
})

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import * as SecureStore from 'expo-secure-store'
import LoginScreen from '../../../app/(auth)/login'

describe('LoginScreen — smoke', () => {
  it('рендерит заголовок «Вход»', async () => {
    const { getByText } = await render(<LoginScreen />)
    expect(getByText('Вход')).toBeTruthy()
  })

  it('рендерит поле Email', async () => {
    const { getByLabelText } = await render(<LoginScreen />)
    expect(getByLabelText('Email')).toBeTruthy()
  })

  it('рендерит поле Пароль', async () => {
    const { getByLabelText } = await render(<LoginScreen />)
    expect(getByLabelText('Пароль')).toBeTruthy()
  })

  it('рендерит кнопку «Войти»', async () => {
    const { getByLabelText } = await render(<LoginScreen />)
    expect(getByLabelText('Войти')).toBeTruthy()
  })

  it('нажатие «Войти» вызывает login.mutate', async () => {
    mockLoginMutate.mockClear()
    const { getByLabelText } = await render(<LoginScreen />)
    fireEvent.press(getByLabelText('Войти'))
    expect(mockLoginMutate).toHaveBeenCalledTimes(1)
  })

  it('рендерит ссылку «Нет аккаунта?»', async () => {
    const { getByText } = await render(<LoginScreen />)
    expect(getByText('Нет аккаунта? Зарегистрироваться')).toBeTruthy()
  })
})

describe('LoginScreen — запоминание email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('подгружает сохранённый email при монтировании', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('saved@example.com')

    const { findByDisplayValue } = await render(<LoginScreen />)

    expect(await findByDisplayValue('saved@example.com')).toBeTruthy()
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('lk_last_email')
  })

  it('сохраняет email после успешного входа при включённом «Запомнить меня»', async () => {
    const { getByLabelText } = await render(<LoginScreen />)
    await fireEvent.changeText(getByLabelText('Email'), 'user@example.com')
    await fireEvent.press(getByLabelText('Войти'))

    const [, options] = mockLoginMutate.mock.calls[0]
    await options.onSuccess()

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('lk_last_email', 'user@example.com')
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled()
  })

  it('удаляет сохранённый email после входа, если «Запомнить меня» выключено', async () => {
    const { getByLabelText } = await render(<LoginScreen />)
    await fireEvent.changeText(getByLabelText('Email'), 'user@example.com')
    await fireEvent(getByLabelText('Запомнить меня'), 'valueChange', false)
    await fireEvent.press(getByLabelText('Войти'))

    const [, options] = mockLoginMutate.mock.calls[0]
    await options.onSuccess()

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('lk_last_email')
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled()
  })
})

it('explains expired sessions and offers a separate guest session', async () => {
  useAuthStore.setState({ sessionExpired: true })
  const screen = await render(<LoginScreen />)
  expect(screen.getByText(/Сессия истекла.*данные сохранены/)).toBeTruthy()
  fireEvent.press(screen.getByLabelText('Продолжить как гость'))
  expect(mockGuest).toHaveBeenCalledTimes(1)
  useAuthStore.setState({ sessionExpired: false })
})

it('shows and hides the actual password input without changing its value', async () => {
  const screen = await render(<LoginScreen />)
  await fireEvent.changeText(screen.getByLabelText('Пароль'), 'password123')
  expect(screen.getByLabelText('Пароль').props.secureTextEntry).toBe(true)
  await fireEvent.press(screen.getByLabelText('Показать пароль'))
  expect(screen.getByLabelText('Пароль').props.secureTextEntry).toBe(false)
  expect(screen.getByLabelText('Пароль').props.value).toBe('password123')
  await fireEvent.press(screen.getByLabelText('Скрыть пароль'))
  expect(screen.getByLabelText('Пароль').props.secureTextEntry).toBe(true)
})
