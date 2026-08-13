import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { ColorPalette } from '@/theme'
import { typography } from '@/theme/typography'

interface ExportCalendarRowProps {
  /** Напоминание уже экспортировано — вместо чекбокса статичный статус. */
  exported: boolean
  checked: boolean
  onToggle: () => void
  colors: ColorPalette
}

/**
 * Строка «Добавить в календарь» на форме напоминания. Если напоминание уже
 * экспортировано в системный календарь (exported) — рендерит статичный,
 * некликабельный статус «В календаре» вместо чекбокса, чтобы исключить
 * повторный экспорт.
 */
const ExportCalendarRow: React.FC<ExportCalendarRowProps> = ({
  exported,
  checked,
  onToggle,
  colors,
}) =>
  exported ? (
    <ExportedBadge colors={colors} />
  ) : (
    <ExportCheckbox checked={checked} onToggle={onToggle} colors={colors} />
  )

interface ExportedBadgeProps {
  colors: ColorPalette
}

const ExportedBadge: React.FC<ExportedBadgeProps> = ({ colors }) => (
  <View
    testID="calendar-exported-badge"
    accessibilityLabel="В календаре"
    style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
  >
    <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
    <View style={styles.texts}>
      <Text style={[typography.buttonLabel, { color: colors.textPrimary }]}>В календаре</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        Напоминание уже экспортировано
      </Text>
    </View>
    <Ionicons name="calendar" size={20} color={colors.accent} />
  </View>
)

interface ExportCheckboxProps {
  checked: boolean
  onToggle: () => void
  colors: ColorPalette
}

const ExportCheckbox: React.FC<ExportCheckboxProps> = ({ checked, onToggle, colors }) => (
  <Pressable
    onPress={onToggle}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    accessibilityLabel="Добавить в календарь"
    style={({ pressed }) => [
      styles.row,
      { backgroundColor: colors.surface, borderColor: colors.borderInput },
      pressed && styles.pressed,
    ]}
  >
    <View
      testID="export-checkbox-box"
      style={[
        styles.checkboxBox,
        checked
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { borderColor: colors.borderInput },
      ]}
    >
      {checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
    </View>
    <View style={styles.texts}>
      <Text style={[typography.buttonLabel, { color: colors.textPrimary }]}>
        Добавить в календарь
      </Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        Экспорт произойдёт после сохранения
      </Text>
    </View>
    <Ionicons name="calendar-outline" size={20} color={colors.accent} />
  </Pressable>
)

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  hint: { fontSize: 12 },
  pressed: { opacity: 0.7 },
})

export default ExportCalendarRow
