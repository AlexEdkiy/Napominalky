jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }))
import React from 'react'
import { render, cleanup } from '@testing-library/react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import SessionNavigation from '../SessionNavigation'

afterEach(cleanup)
it.each(['home', 'login'] as const)('navigates to %s only after mounting and consumes the request', async (target) => {
  jest.clearAllMocks()
  useAuthStore.setState({ navigationTarget: target })
  expect(router.replace).not.toHaveBeenCalled()
  await render(<SessionNavigation />)
  expect(router.replace).toHaveBeenCalledWith(target === 'home' ? '/(tabs)' : '/(auth)/login')
  expect(useAuthStore.getState().navigationTarget).toBeNull()
})
