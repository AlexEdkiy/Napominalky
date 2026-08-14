import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { TASK_STATUS_LABELS, type TaskStatus } from '@/constants/taskStatus'
import { useTheme, type ColorPalette } from '@/theme'
import { typography } from '@/theme/typography'

interface StatusBadgeProps {
  status: TaskStatus
  /** Тап по бейджу (открыть меню смены статуса). Без onPress — только вид. */
  onPress?: (() => void) | undefined
  testID?: string | undefined
}

interface BadgeColors {
  fg: string
  bg: string
}

/**
 * Цвета пилюли статуса (зеркало веб-палитры, адаптировано под тему МП):
 * Новая — синий, В работе — amber, Отложена — фиолетовый, Выполнена — зелёный.
 */
export const statusBadgeColors = (
  status: TaskStatus,
  colors: ColorPalette,
): BadgeColors => {
  switch (status) {
    case 'in_progress':
      return { fg: colors.amber, bg: colors.amberBg }
    case 'postponed':
      return { fg: colors.purple, bg: colors.purpleBg }
    case 'done':
      return { fg: colors.accent, bg: colors.accentSoftBg }
    default:
      return { fg: colors.noteBlue, bg: colors.noteBlueBg }
  }
}

/** Компактная пилюля статуса задачи/пункта (только для type='tasks'). */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, onPress, testID }) => {
  const { colors } = useTheme()
  const { fg, bg } = statusBadgeColors(status, colors)
  const label = TASK_STATUS_LABELS[status]

  const pill = (
    <View style={[styles.pill, { backgroundColor: bg }]} testID={testID}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  )

  if (onPress === undefined) return pill

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Статус: ${label}`}
      hitSlop={6}
    >
      {pill}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { ...typography.bodySm, fontSize: 11.5, fontWeight: '700' },
})

export default StatusBadge
