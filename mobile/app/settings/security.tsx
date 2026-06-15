import React, { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'

import BaseButton from '@/components/common/BaseButton'
import BaseInput from '@/components/common/BaseInput'
import { useAppLock } from '@/hooks/useAppLock'
import { usePinSetup } from '@/hooks/usePinSetup'
import { isBiometricAvailable } from '@/services/appLock'

type PinMode = 'idle' | 'setup' | 'change'

export default function SecurityScreen() {
  const { pinSet, biometricEnabled, setupPin, removePin, enableBiometric, disableBiometric } =
    useAppLock()

  const [pinMode, setPinMode] = useState<PinMode>('idle')
  const [bioAvailable, setBioAvailable] = useState(false)
  const [loading, setLoading] = useState(false)
  const { pin, confirm, error, setPin, setConfirm, validate, reset } = usePinSetup()

  useEffect(() => {
    void isBiometricAvailable().then(setBioAvailable)
  }, [])

  const handlePinToggle = (value: boolean): void => {
    if (value) {
      setPinMode('setup')
      reset()
    } else {
      Alert.alert('Отключить PIN?', 'Блокировка приложения будет отключена.', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Отключить', style: 'destructive', onPress: () => void handleRemovePin() },
      ])
    }
  }

  const handleRemovePin = async (): Promise<void> => {
    setLoading(true)
    await removePin()
    setLoading(false)
    setPinMode('idle')
    reset()
  }

  const handleSavePin = async (): Promise<void> => {
    if (!validate()) return
    setLoading(true)
    await setupPin(pin)
    setLoading(false)
    setPinMode('idle')
    reset()
  }

  const handleBioToggle = async (value: boolean): Promise<void> => {
    setLoading(true)
    if (value) {
      const ok = await enableBiometric()
      if (!ok) Alert.alert('Биометрия недоступна', 'Убедитесь, что биометрия настроена на устройстве.')
    } else {
      await disableBiometric()
    }
    setLoading(false)
  }

  const bioSwitchDisabled = !pinSet || !bioAvailable || loading

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Блокировка приложения</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Блокировка по PIN</Text>
            <Switch
              value={pinSet}
              onValueChange={handlePinToggle}
              disabled={loading}
              accessibilityLabel="Блокировка по PIN"
            />
          </View>

          {pinSet && pinMode === 'idle' ? (
            <BaseButton label="Сменить PIN" onPress={() => { setPinMode('change'); reset() }} variant="secondary" />
          ) : null}
        </View>

        {pinMode !== 'idle' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {pinMode === 'setup' ? 'Установка PIN' : 'Смена PIN'}
            </Text>
            <BaseInput
              label="Новый PIN"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              error={error ?? undefined}
            />
            <BaseInput
              label="Подтвердите PIN"
              value={confirm}
              onChangeText={setConfirm}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            <View style={styles.buttonRow}>
              <BaseButton label="Отмена" onPress={() => { setPinMode('idle'); reset() }} variant="secondary" />
              <BaseButton label="Сохранить" onPress={() => { void handleSavePin() }} loading={loading} />
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Биометрия</Text>
          <View style={styles.row}>
            <View style={styles.rowLabelBlock}>
              <Text style={styles.rowLabel}>Вход по биометрии</Text>
              {!bioAvailable ? (
                <Text style={styles.rowHint}>Биометрия не настроена на устройстве</Text>
              ) : !pinSet ? (
                <Text style={styles.rowHint}>Сначала установите PIN</Text>
              ) : null}
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={(v) => { void handleBioToggle(v) }}
              disabled={bioSwitchDisabled}
              accessibilityLabel="Вход по биометрии"
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 16 },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6a6a6a', textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  rowLabelBlock: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 16, color: '#1a1a1a' },
  rowHint: { fontSize: 12, color: '#94a3b8' },
  buttonRow: { flexDirection: 'row', gap: 12 },
})
