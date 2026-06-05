import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import React, { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { formatDateTime, isValidIso } from '@/utils/datetime'

interface DateTimeFieldProps {
  label: string
  value: string
  onChange: (iso: string) => void
  error?: string | undefined
}

/** Android — двухшаговый императивный пикер (date → time). */
type AndroidStep = 'idle' | 'date' | 'time'

const mergeDateTime = (datePart: Date, timePart: Date): Date => {
  const merged = new Date(datePart.getTime())
  merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0)
  return merged
}

const DateTimeField: React.FC<DateTimeFieldProps> = ({ label, value, onChange, error }) => {
  const hasValue = value.trim().length > 0 && isValidIso(value)
  const baseDate = hasValue ? new Date(value) : new Date()

  const [iosOpen, setIosOpen] = useState(false)
  const [androidStep, setAndroidStep] = useState<AndroidStep>('idle')
  const [draftDate, setDraftDate] = useState<Date>(baseDate)

  const emit = (date: Date): void => onChange(date.toISOString())

  const handleOpen = (): void => {
    setDraftDate(hasValue ? new Date(value) : new Date())
    if (Platform.OS === 'android') setAndroidStep('date')
    else setIosOpen(true)
  }

  const handleAndroidChange = (event: DateTimePickerEvent, picked?: Date): void => {
    if (event.type === 'dismissed' || !picked) {
      setAndroidStep('idle')
      return
    }
    if (androidStep === 'date') {
      setDraftDate(picked)
      setAndroidStep('time')
      return
    }
    setAndroidStep('idle')
    emit(mergeDateTime(draftDate, picked))
  }

  const handleIosChange = (_event: DateTimePickerEvent, picked?: Date): void => {
    if (!picked) return
    setDraftDate(picked)
    emit(picked)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={handleOpen}
        style={({ pressed }) => [styles.field, error ? styles.fieldError : null, pressed && styles.pressed]}
      >
        <Text style={hasValue ? styles.value : styles.placeholder}>
          {hasValue ? formatDateTime(value) : 'Выбрать дату и время'}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker
          value={draftDate}
          mode="datetime"
          display="spinner"
          onChange={handleIosChange}
        />
      ) : null}
      {Platform.OS === 'android' && androidStep !== 'idle' ? (
        <DateTimePicker
          value={draftDate}
          mode={androidStep}
          display="default"
          onChange={handleAndroidChange}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  fieldError: { borderColor: '#dc2626' },
  pressed: { opacity: 0.7 },
  value: { fontSize: 16, color: '#1a1a1a' },
  placeholder: { fontSize: 16, color: '#9a9a9a' },
  error: { fontSize: 13, color: '#dc2626' },
})

export default DateTimeField
