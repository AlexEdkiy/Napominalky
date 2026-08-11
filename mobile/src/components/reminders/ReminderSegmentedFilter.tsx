import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

/** Сегмент экрана «Напоминания». */
export type ReminderSegment = 'overdue' | 'planned'

interface ReminderSegmentedFilterProps {
  active: ReminderSegment
  overdueCount: number
  plannedCount: number
  onChange: (segment: ReminderSegment) => void
}

interface SegmentButtonProps {
  label: string
  count: number
  selected: boolean
  danger: boolean
  onPress: () => void
}

const SegmentButton: React.FC<SegmentButtonProps> = ({
  label, count, selected, danger, onPress,
}) => {
  const { colors } = useTheme()
  // Фон бейджа контрастирует с фоном пилюли: активная пилюля — surface(белый),
  // значит бейдж серый (appBg); неактивная пилюля сливается с контейнером
  // сегмента (appBg), значит бейдж белый (surface). Иначе счётчик неактивной
  // пилюли выглядел бы голым текстом. Красный danger-бейдж виден на любом фоне.
  const neutralBadgeBg = selected ? colors.appBg : colors.surface
  const badgeBg = danger && count > 0 ? colors.danger : neutralBadgeBg
  const badgeColor = danger && count > 0 ? '#FFFFFF' : colors.textSecondary

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.segment, selected && { backgroundColor: colors.surface }]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.segmentLabel,
          { color: selected ? colors.textPrimary : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
      <View testID={`segment-badge-${label}`} style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.badgeText, { color: badgeColor }]}>{count}</Text>
      </View>
    </Pressable>
  )
}

/** Пилюля-переключатель «Просроченные N / Запланированные M» со счётчиками. */
const ReminderSegmentedFilter: React.FC<ReminderSegmentedFilterProps> = ({
  active, overdueCount, plannedCount, onChange,
}) => {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <SegmentButton
        label="Просроченные"
        count={overdueCount}
        selected={active === 'overdue'}
        danger
        onPress={() => onChange('overdue')}
      />
      <SegmentButton
        label="Запланированные"
        count={plannedCount}
        selected={active === 'planned'}
        danger={false}
        onPress={() => onChange('planned')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  segmentLabel: {
    ...typography.bodySm,
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.bodySm,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
})

export default ReminderSegmentedFilter
