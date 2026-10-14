import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import * as Notifications from 'expo-notifications'
import { activateDatabase, type Database } from '@/db/client'
import { getAccountDatabase, getLegacyDatabase, GUEST_OWNER, type AccountDatabase } from '@/db/accountStorage'
import { ensureSchemaPullVersion } from '@/services/sync/syncMeta'
import { syncEngine } from '@/services/sync/syncEngine'
import { useAuthStore } from '@/stores/authStore'
import ErrorScreen from '@/components/ErrorScreen'

const DbContext = createContext<Database | null>(null)

/** Never render old-account screens while storage for the next session is loading. */
const DbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, guestMode, accountId, isHydrated, isSwitching } = useAuthStore()
  const queryClient = useQueryClient()
  const key = !isHydrated || isSwitching ? null : token ? `account:${accountId ?? 'legacy'}`
    : guestMode ? 'guest' : 'signed-out'
  const [ready, setReady] = useState<{ key: string; storage: AccountDatabase } | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (key === null) return
    let cancelled = false
    setError(null)
    const prepare = async (): Promise<void> => {
      await syncEngine.stop()
      if (cancelled) return
      await queryClient.cancelQueries()
      if (cancelled) return
      queryClient.clear()
      await Notifications.cancelAllScheduledNotificationsAsync()
      if (cancelled) return
      await Notifications.dismissAllNotificationsAsync()
      if (cancelled) return
      let owner = token ? accountId : GUEST_OWNER
      if (!owner) {
        owner = (await getLegacyDatabase()).owner
        if (owner === GUEST_OWNER || owner === 'unclaimed') {
          if (!cancelled) await useAuthStore.getState().logout(true)
          return
        }
        if (!cancelled) useAuthStore.setState({ accountId: owner })
        return
      }
      const storage = await getAccountDatabase(owner)
      await ensureSchemaPullVersion(storage.db)
      if (cancelled) return
      activateDatabase(storage.db, storage.name)
      setReady({ key, storage })
    }
    void prepare().catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason : new Error(String(reason)))
    })
    return () => { cancelled = true }
  }, [key, token, accountId, queryClient])

  if (error) return <ErrorScreen title="Ошибка открытия данных" message={error.message} stack={null} />
  if (key === null || ready?.key !== key) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>
  }
  return <DbContext.Provider key={key} value={ready.storage.db}>{children}</DbContext.Provider>
}

export const useDb = (): Database => {
  const context = useContext(DbContext)
  if (context === null) throw new Error('useDb must be used within a DbProvider')
  return context
}
const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } })
export default DbProvider
