/**
 * Тесты app/(auth)/_layout.tsx:
 * - headerShown: false для всех экранов группы (крошка «Sign In» скрыта)
 */
import React from 'react'
import { render } from '@testing-library/react-native'

const screenNames: string[] = []
const screenOptions: Record<string, Record<string, unknown>> = {}
let rootScreenOptions: Record<string, unknown> = {}

jest.mock('expo-router', () => {
  const { View } = require('react-native')

  const Screen = ({
    name,
    options,
  }: {
    name?: string
    options?: Record<string, unknown>
  }) => {
    if (name !== undefined) {
      screenNames.push(name)
      if (options !== undefined) screenOptions[name] = options
    }
    return null
  }

  const Stack = ({ children, screenOptions: so }: {
    children?: React.ReactNode
    screenOptions?: Record<string, unknown>
  }) => {
    if (so !== undefined) rootScreenOptions = so
    const { View: V } = require('react-native')
    return <V testID="stack-container">{children}</V>
  }
  Stack.Screen = Screen

  return { Stack }
})

import AuthLayout from '../../../app/(auth)/_layout'

describe('AuthLayout', () => {
  beforeEach(() => {
    screenNames.length = 0
    Object.keys(screenOptions).forEach((k) => { delete screenOptions[k] })
    rootScreenOptions = {}
  })

  it('рендерит без ошибок', async () => {
    const { getByTestId } = await render(<AuthLayout />)
    expect(getByTestId('stack-container')).toBeTruthy()
  })

  it('headerShown: false задан через screenOptions (крошка скрыта)', async () => {
    await render(<AuthLayout />)
    expect(rootScreenOptions['headerShown']).toBe(false)
  })

  it('экран login зарегистрирован', async () => {
    await render(<AuthLayout />)
    expect(screenNames).toContain('login')
  })

  it('экран register зарегистрирован', async () => {
    await render(<AuthLayout />)
    expect(screenNames).toContain('register')
  })

  it('у экрана login НЕТ title Sign In', async () => {
    await render(<AuthLayout />)
    const opts = screenOptions['login']
    // screenOptions не должен содержать title: 'Sign In'
    expect(opts?.['title']).not.toBe('Sign In')
  })
})
