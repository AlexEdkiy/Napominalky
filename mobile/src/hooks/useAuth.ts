import { Alert } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'

import { authApi } from '@/api/authApi'
import { useDb } from '@/providers/DbProvider'
import { resetLocalData } from '@/db/resetLocalData'
import { syncOutbox } from '@/db/schema/syncOutbox'
import { getMeta, setMeta, LAST_USER_ID, resetPullCursor } from '@/services/sync/syncMeta'
import { pushChanges } from '@/services/sync/pushChanges'
import { useAuthStore } from '@/stores/authStore'
import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types/auth'
import type { Database } from '@/db/client'

const ALERT_TITLE = 'Есть несинхронизированные изменения'
const ALERT_MSG =
  'Они не были отправлены на сервер. Выйти и удалить локальные данные с устройства?'

/** Показывает guard и резолвит true (выйти) / false (отмена). */
const confirmLogoutWithUnsaved = (): Promise<boolean> =>
  new Promise((resolve) => {
    Alert.alert(ALERT_TITLE, ALERT_MSG, [
      { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Выйти', style: 'destructive', onPress: () => resolve(true) },
    ])
  })

/**
 * Флашит push (пока токен валиден). Успех означает, что очередь действительно
 * пуста: HTTP 200 может оставить неподтверждённые или только что созданные правки.
 * При ошибке push/чтения очереди требуется подтверждение удаления данных.
 */
const tryFlushSync = async (db: Database): Promise<boolean> => {
  try {
    await pushChanges(db)
    return db.select({ id: syncOutbox.id }).from(syncOutbox).limit(1).get() === undefined
  } catch {
    return false
  }
}

/** Полный сброс: очистка данных → отзыв токена → очистка стора и кэша. */
const performLogout = async (
  db: Database,
  logoutStore: () => Promise<void>,
  clearQuery: () => void,
): Promise<void> => {
  await resetLocalData(db)
  try {
    await authApi.logout()
  } catch {
    // Офлайн-логаут допустим — токен просто протухнет на сервере.
  }
  await logoutStore()
  clearQuery()
  router.replace('/(auth)/login')
}

function useLogout(db: Database) {
  const logoutStore = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const pushOk = await tryFlushSync(db)
      if (!pushOk) {
        const confirmed = await confirmLogoutWithUnsaved()
        if (!confirmed) return
      }
      await performLogout(db, logoutStore, () => queryClient.clear())
    },
  })
}

function useAuthSession(db: Database) {
  const queryClient = useQueryClient()
  const setToken = useAuthStore((state) => state.setToken)
  const setUser = useAuthStore((state) => state.setUser)

  const onAuthSuccess = async (response: AuthResponse): Promise<void> => {
    const lastUserId = await getMeta(LAST_USER_ID, db)
    const incomingId = response.user.uuid
    if (lastUserId !== null && lastUserId !== incomingId) {
      await resetLocalData(db)
    }
    // ВАЖНО: sync-метаданные готовим и курсор сбрасываем в 0 ДО setToken/setUser.
    // setToken/setUser запускают useSyncEngine (эффект по token+syncEnabled), и
    // pull должен стартовать уже с курсором 0 (полная реконсиляция аккаунта).
    // Иначе гонка: pull уходит со старым высоким курсором → пустой ответ → данные
    // с сервера не подтягиваются.
    await setMeta(LAST_USER_ID, incomingId, db)
    await resetPullCursor(db)
    queryClient.clear()
    setUser(response.user)
    await setToken(response.token)
    router.replace('/(tabs)')
  }

  return { onAuthSuccess }
}

export function useAuth() {
  const db = useDb()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const guestMode = useAuthStore((state) => state.guestMode)
  const setGuestMode = useAuthStore((state) => state.setGuestMode)
  const { onAuthSuccess } = useAuthSession(db)
  const logout = useLogout(db)

  const login = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: onAuthSuccess,
  })

  const register = useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: onAuthSuccess,
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
