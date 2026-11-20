import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/authApi'
import { activateDatabase } from '@/db/client'
import { getAccountDatabase } from '@/db/accountStorage'
import { resetPullCursor } from '@/services/sync/syncMeta'
import { syncEngine } from '@/services/sync/syncEngine'
import { useAuthStore } from '@/stores/authStore'
import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types/auth'

export function useAuth() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const guestMode = useAuthStore((state) => state.guestMode)

  const onAuthSuccess = async (response: AuthResponse): Promise<void> => {
    useAuthStore.setState({ isSwitching: true, token: null, user: null, syncEnabled: false })
    try {
      await syncEngine.stop()
      const storage = await getAccountDatabase(response.user.uuid)
      await resetPullCursor(storage.db)
      await queryClient.cancelQueries()
      queryClient.clear()
      activateDatabase(storage.db, storage.name)
      useAuthStore.getState().setUser(response.user)
      await useAuthStore.getState().setToken(response.token)
    } catch (error) {
      await useAuthStore.getState().logout()
      throw error
    } finally {
      useAuthStore.setState({ isSwitching: false })
    }
  }

  const login = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload), onSuccess: onAuthSuccess,
  })
  const register = useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload), onSuccess: onAuthSuccess,
  })
  const logout = useMutation({
    mutationFn: async (): Promise<void> => {
      const previousToken = useAuthStore.getState().token
      await useAuthStore.getState().logout()
      await syncEngine.stop()
      await queryClient.cancelQueries()
      queryClient.clear()
      // Local drafts stay in the account's own database, even without a network.
      if (previousToken) void authApi.logout(previousToken).catch(() => {})
    },
  })
  const continueAsGuest = async (): Promise<void> => {
    if (useAuthStore.getState().token) await useAuthStore.getState().logout()
    await syncEngine.stop()
    useAuthStore.getState().setGuestMode(true)
  }
  return { user, token, isAuthenticated: !!token, guestMode, continueAsGuest, login, register, logout }
}
