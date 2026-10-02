import { useEffect } from 'react'
import { AppState } from 'react-native'
import { authApi } from '@/api/authApi'
import { useDb } from '@/providers/DbProvider'
import { useAuthStore } from '@/stores/authStore'
import { useNetStatus } from '@/services/netStatus'
import { readProfileCache, writeProfileCache } from '@/services/profileCache'

/** Account profile refresh is separate from domain-data synchronization. */
export const useProfileRefresh = (): void => {
  const db = useDb()
  const token = useAuthStore((s) => s.token)
  const ready = useAuthStore((s) => s.isHydrated)
  const user = useAuthStore((s) => s.user)
  const { isOnline } = useNetStatus()
  useEffect(() => {
    if (!ready || !token) return
    if (!useAuthStore.getState().user) {
      const cached = readProfileCache(db)
      if (cached) useAuthStore.getState().setUser(cached)
    }
    const refresh = (): void => { void useAuthStore.getState().rehydrateUser(authApi.getMe) }
    if (isOnline) refresh()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })
    return () => subscription.remove()
  }, [db, ready, token, isOnline])
  useEffect(() => {
    const current = useAuthStore.getState()
    if (token && user && current.token === token && current.user === user) writeProfileCache(db, user)
  }, [db, token, user])
}
