import React, { type ReactNode, useEffect, useRef } from 'react'
import { AppState, type AppStateStatus, StyleSheet, View } from 'react-native'

import LockScreen from '../../app/lock'
import { useLockStore } from '@/stores/lockStore'

interface LockProviderProps {
  children: ReactNode
}

/**
 * LockProvider:
 * - Гидрирует lockStore при старте (один раз).
 * - Подписывается на AppState: при уходе в background/inactive вызывает lock().
 * - Рендерит оверлей с LockScreen поверх children, если isLocked && pinSet.
 * - До гидрации рендерит null (splash состояние).
 * Оверлей сохраняет навигационное дерево в памяти.
 */
const LockProvider: React.FC<LockProviderProps> = ({ children }) => {
  const hydrate = useLockStore((s) => s.hydrate)
  const isHydrated = useLockStore((s) => s.isHydrated)
  const isLocked = useLockStore((s) => s.isLocked)
  const pinSet = useLockStore((s) => s.pinSet)
  const lock = useLockStore((s) => s.lock)

  const hydratedRef = useRef(false)

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus): void => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (pinSet) lock()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription.remove()
  }, [pinSet, lock])

  if (!isHydrated) return null

  const showLock = isLocked && pinSet

  return (
    <View style={styles.root}>
      {children}
      {showLock ? (
        <View style={StyleSheet.absoluteFill}>
          <LockScreen />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})

export default LockProvider
