import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, SafeAreaView, StyleSheet, Text, View } from 'react-native'

import PinDots from '@/components/common/PinDots'
import PinPad from '@/components/common/PinPad'
import BaseButton from '@/components/common/BaseButton'
import { useAppLock } from '@/hooks/useAppLock'

const PIN_LENGTH = 4

const LockScreen: React.FC = () => {
  const { verifyAndUnlock, unlockWithBiometric, biometricEnabled } = useAppLock()

  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const shakeAnim = useRef(new Animated.Value(0)).current

  const triggerShake = useCallback((): void => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }, [shakeAnim])

  const handleVerify = useCallback(async (candidate: string): Promise<void> => {
    setLoading(true)
    const ok = await verifyAndUnlock(candidate)
    setLoading(false)
    if (!ok) {
      setError('Неверный PIN-код')
      triggerShake()
      setPin('')
    }
  }, [verifyAndUnlock, triggerShake])

  const handleDigit = useCallback((digit: string): void => {
    if (loading) return
    setError(null)
    setPin((prev) => {
      const next = prev.length < PIN_LENGTH ? prev + digit : prev
      if (next.length === PIN_LENGTH) {
        void handleVerify(next)
      }
      return next
    })
  }, [loading, handleVerify])

  const handleDelete = useCallback((): void => {
    if (loading) return
    setError(null)
    setPin((prev) => prev.slice(0, -1))
  }, [loading])

  const handleBiometric = useCallback(async (): Promise<void> => {
    setLoading(true)
    const ok = await unlockWithBiometric()
    setLoading(false)
    if (!ok) {
      setError('Биометрия не подтверждена')
    }
  }, [unlockWithBiometric])

  useEffect(() => {
    if (biometricEnabled) {
      void handleBiometric()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Приложение заблокировано</Text>
        <Text style={styles.subtitle}>Введите PIN-код для входа</Text>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <PinDots length={PIN_LENGTH} filled={pin.length} />
        </Animated.View>

        {error !== null ? <Text style={styles.error}>{error}</Text> : null}

        <PinPad onPress={handleDigit} onDelete={handleDelete} disabled={loading} />

        {biometricEnabled ? (
          <BaseButton
            label="Войти по биометрии"
            onPress={() => { void handleBiometric() }}
            variant="secondary"
            loading={loading}
          />
        ) : null}
      </View>
    </SafeAreaView>
  )
}

export default LockScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6a6a6a', textAlign: 'center' },
  error: { fontSize: 14, color: '#dc2626', textAlign: 'center' },
})
