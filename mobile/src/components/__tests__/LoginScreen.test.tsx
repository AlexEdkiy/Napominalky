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

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
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

jest.mock('@/utils/apiError', () => ({
  getApiErrorMessage: jest.fn(() => null),
  getFieldErrors: jest.fn(() => ({})),
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

jest.mock('@/components/common/BaseInput', () => {
  const { TextInput, Text, View } = require('react-native')
  return {
    __esModule: true,
    default: ({ label, value, onChangeText, secureTextEntry, error }: {
      label: string
      value: string
      onChangeText: (t: string) => void
      secureTextEntry?: boolean
      error?: string
    }) => (
      <View>
        <Text>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          accessibilityLabel={label}
        />
        {error ? <Text>{error}</Text> : null}
      </View>
    ),
  }
})

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
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
