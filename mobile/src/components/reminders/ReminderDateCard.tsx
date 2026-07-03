import React, { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'

import IconSquare from '@/components/ui/IconSquare'
import { formatRelativeReminder, isValidIso } from '@/utils/datetime'
import { inOneHour, thisEvening, tomorrowMorning } from '@/utils/quickTime'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

interface ReminderDateCardProps {
  value: string
  onChange: (iso: string) => void
}

type AndroidStep = 'idle' | 'date' | 'time'

const QUICK_PRESETS = [
  { key: 'hour', label: 'Через час', compute: inOneHour },
  { key: 'evening', label: 'Вечером', compute: thisEvening },
  { key: 'tomorrow', label: 'Завтра утром', compute: tomorrowMorning },
] as const

const ReminderDateCard: React.FC<ReminderDateCardProps> = ({ value, onChange }) => {
  const { colors } = useTheme()
  const hasValue = value.trim().length > 0 && isValidIso(value)

  const [iosOpen, setIosOpen] = useState(false)
  const [androidStep, setAndroidStep] = useState<AndroidStep>('idle')
  const [draftDate, setDraftDate] = useState<Date>(new Date())
  // Ключ последнего нажатого быстрого чипа — подсвечивает его, пока значение
  // не изменено вручную через пикер (сравнение ISO-строк ненадёжно из-за
  // дрейфа секунд в «Через час»).
  const [activePresetKey, setActivePresetKey] = useState<string | null>(null)

  const handleOpen = (): void => {
    const base = hasValue ? new Date(value) : new Date()
    setDraftDate(base)
    if (Platform.OS === 'android') setAndroidStep('date')
    else setIosOpen(true)
  }

  const handlePreset = (preset: (typeof QUICK_PRESETS)[number]): void => {
    onChange(preset.compute())
    setActivePresetKey(preset.key)
  }

  const handleAndroidChange = (event: DateTimePickerEvent, picked?: Date): void => {
    if (event.type === 'dismissed' || !picked) { setAndroidStep('idle'); return }
    if (androidStep === 'date') { setDraftDate(picked); setAndroidStep('time'); return }
    setAndroidStep('idle')
    const merged = new Date(draftDate)
    merged.setHours(picked.getHours(), picked.getMinutes(), 0, 0)
    setActivePresetKey(null)
    onChange(merged.toISOString())
  }

  const handleIosChange = (_e: DateTimePickerEvent, picked?: Date): void => {
    if (!picked) return
    setDraftDate(picked)
    setActivePresetKey(null)
    onChange(picked.toISOString())
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel="Выбрать дату и время"
        style={[styles.card, { backgroundColor: colors.surface }]}
      >
        <IconSquare icon="alarm" iconColor={colors.amber} bgColor={colors.amberBg} size={48} radius={15} />
        <View style={styles.textBlock}>
          <Text style={[typography.cardTitle, styles.title, { color: colors.textPrimary }]}>
            Дата и время
          </Text>
          <Text style={[typography.bodySm, { color: hasValue ? colors.textBody : colors.textTertiary }]}>
            {hasValue ? formatRelativeReminder(value) : 'Выбрать дату и время'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>

      <View style={styles.chips}>
        {QUICK_PRESETS.map((p) => {
          const active = activePresetKey === p.key
          return (
            <Pressable
              key={p.key}
              accessibilityRole="button"
              accessibilityLabel={p.label}
              accessibilityState={{ selected: active }}
              onPress={() => handlePreset(p)}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: active ? colors.amber : colors.amberBg },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[typography.bodySm, styles.chipLabel, { color: active ? '#FFFFFF' : colors.amber }]}>
                {p.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker value={draftDate} mode="datetime" display="spinner" onChange={handleIosChange} />
      ) : null}
      {Platform.OS === 'android' && androidStep !== 'idle' ? (
        <DateTimePicker value={draftDate} mode={androidStep} display="default" onChange={handleAndroidChange} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 9 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    padding: 16,
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  textBlock: { flex: 1, gap: 2 },
  title: { fontSize: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 99 },
  chipLabel: { fontWeight: '700' },
  pressed: { opacity: 0.7 },
})

export default ReminderDateCard
