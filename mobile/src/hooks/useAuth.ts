import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'

import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/stores/authStore'
import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types/auth'

function useAuthSession() {
  const queryClient = useQueryClient()
  const setToken = useAuthStore((state) => state.setToken)
  const setUser = useAuthStore((state) => state.setUser)

  const onAuthSuccess = async (response: AuthResponse): Promise<void> => {
    await setToken(response.token)
    setUser(response.user)
    queryClient.clear()
    router.replace('/(tabs)')
  }

  return { onAuthSuccess }
}

export function useAuth() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const guestMode = useAuthStore((state) => state.guestMode)
  const setGuestMode = useAuthStore((state) => state.setGuestMode)
  const logoutStore = useAuthStore((state) => state.logout)
  const { onAuthSuccess } = useAuthSession()

  const login = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: onAuthSuccess,
  })

  const register = useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: onAuthSuccess,
  })

  const logout = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => logoutStore(),
  })

  const continueAsGuest = (): void => {
    setGuestMode(true)
    router.replace('/(tabs)')
  }

  return {
    user,
    token,
    isAuthenticated: !!token,
    guestMode,
    continueAsGuest,
    login,
    register,
    logout,
  }
}
