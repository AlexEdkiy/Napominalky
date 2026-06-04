import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import BaseButton from '@/components/common/BaseButton'
import { snoozeUntil, type SnoozeInterval } from '@/utils/snooze'

interface SnoozeSheetProps {
  visible: boolean
  onClose: () => void
  onSnooze: (snoozedUntilIso: string) => void
}

interface SnoozeOption {
  interval: SnoozeInterval
  label: string
}

const OPTIONS: readonly SnoozeOption[] = [
  { interval: '10m', label: 'Отложить на 10 минут' },
  { interval: '1h', label: 'Отложить на 1 час' },
]

const SnoozeSheet: React.FC<SnoozeSheetProps> = ({ visible, onClose, onSnooze }) => {
  const handleSelect = (interval: SnoozeInterval): void => {
    onSnooze(snoozeUntil(interval))
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть" />
      <View style={styles.sheet}>
        <Text style={styles.title}>Отложить напоминание</Text>
        {OPTIONS.map((option) => (
          <BaseButton
            key={option.interval}
            label={option.label}
            variant="secondary"
            onPress={() => handleSelect(option.interval)}
          />
        ))}
        <BaseButton label="Отмена" variant="secondary" onPress={onClose} />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
})

export default SnoozeSheet
