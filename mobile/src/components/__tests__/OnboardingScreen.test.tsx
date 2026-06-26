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
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    continueAsGuest: jest.fn(),
    login: { mutate: jest.fn(), isPending: false },
    logout: { mutate: jest.fn(), isPending: false },
    register: { mutate: jest.fn(), isPending: false },
    user: null,
    token: null,
    isAuthenticated: false,
    guestMode: false,
  }),
}))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import OnboardingScreen from '../../../app/(onboarding)/index'
import { router } from 'expo-router'

describe('OnboardingScreen', () => {
  it('рендерит заголовок «Напоминалки»', async () => {
    const { getByText } = await render(<OnboardingScreen />)
    expect(getByText('Напоминалки')).toBeTruthy()
  })

  it('рендерит подзаголовок', async () => {
    const { getByText } = await render(<OnboardingScreen />)
    expect(
      getByText('Заметки, списки покупок и напоминания — всегда под рукой.'),
    ).toBeTruthy()
  })

  it('рендерит кнопку «Начать без регистрации»', async () => {
    const { getByLabelText } = await render(<OnboardingScreen />)
    expect(getByLabelText('Начать без регистрации')).toBeTruthy()
  })

  it('рендерит кнопку «Войти»', async () => {
    const { getByLabelText } = await render(<OnboardingScreen />)
    expect(getByLabelText('Войти')).toBeTruthy()
  })

  it('рендерит три фичи', async () => {
    const { getByText } = await render(<OnboardingScreen />)
    expect(getByText('Работает офлайн')).toBeTruthy()
    expect(getByText('Данные у вас')).toBeTruthy()
    expect(getByText('Синхронизация')).toBeTruthy()
  })

  it('нажатие «Войти» переходит на экран логина', async () => {
    const { getByLabelText } = await render(<OnboardingScreen />)
    fireEvent.press(getByLabelText('Войти'))
    expect(router.push).toHaveBeenCalledWith('/(auth)/login')
  })

  it('рендерит иконку-колокольчик', async () => {
    const { getByTestId } = await render(<OnboardingScreen />)
    expect(getByTestId('icon-notifications')).toBeTruthy()
  })
})
