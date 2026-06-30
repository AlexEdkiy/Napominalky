import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { syncEngine } from '@/services/sync/syncEngine'

/**
 * Подписывается на AppState: при уходе приложения в фон ('background')
 * запускает sync через syncEngine (best-effort, не блокирует UI).
 * Гейт движка сам проверит токен / online / syncEnabled.
 * Отписывается при размонтировании.
 */
export const useBackgroundSync = (): void => {
  const prevState = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (prevState.current !== 'background' && nextState === 'background') {
          void syncEngine.sync()
        }
        prevState.current = nextState
      },
    )

    return () => {
      subscription.remove()
    }
  }, [])
}
