import React from 'react'
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { statusBadgeColors } from '@/components/lists/StatusBadge'
import { useSheetDragToClose } from '@/hooks/useSheetDragToClose'
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  type TaskStatus,
} from '@/constants/taskStatus'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

/** 'auto' — сброс ручного закрепления статуса задачи (только для списка). */
export type StatusSheetValue = TaskStatus | 'auto'

export interface StatusSheetProps {
  visible: boolean
  title: string
  /** Текущий статус (галочка в списке вариантов). */
  current: TaskStatus
  /** Показывать пункт «Авто» (для задачи; у пунктов его нет). */
  showAuto?: boolean
  /** true = статус сейчас выведен автоматически (галочка на «Авто»). */
  isAuto?: boolean
  onSelect: (value: StatusSheetValue) => void
  onClose: () => void
}

/**
 * Шторка выбора статуса задачи/пункта: 4 статуса (+ опционально «Авто» —
 * сброс ручного закрепления). Паттерн Modal transparent + Animated, как в
 * AttributeSheet; scrim закрывает по тапу.
 */
const StatusSheet: React.FC<StatusSheetProps> = ({
  visible,
  title,
  current,
  showAuto = false,
  isAuto = false,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  // Свайп вниз закрывает шторку (как в CommentsSheet/AttributeSheet);
  // resetKey = visible → spring-появление при открытии.
  const { panHandlers, translateY } = useSheetDragToClose(visible ? 'open' : null, onClose)

  if (!visible) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.flex}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Закрыть" />
        <Animated.View
          testID="status-sheet"
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY }],
            },
          ]}
        >
          <View testID="status-sheet-drag-zone" {...panHandlers}>
            <View style={styles.grabber} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          </View>

          {TASK_STATUS_ORDER.map((status) => (
            <StatusOption
              key={status}
              status={status}
              selected={status === current && !(showAuto && isAuto)}
              onPress={() => onSelect(status)}
            />
          ))}

          {showAuto && (
            <AutoOption selected={isAuto} onPress={() => onSelect('auto')} />
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}

// ---- StatusOption ----------------------------------------------------------

interface StatusOptionProps {
  status: TaskStatus
  selected: boolean
  onPress: () => void
}

const StatusOption: React.FC<StatusOptionProps> = ({ status, selected, onPress }) => {
  const { colors } = useTheme()
  const { fg, bg } = statusBadgeColors(status, colors)
  const label = TASK_STATUS_LABELS[status]

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.option, { backgroundColor: selected ? bg : 'transparent' }]}
    >
      <View style={[styles.optionDot, { backgroundColor: fg }]} />
      <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={18} color={fg} />}
    </Pressable>
  )
}

// ---- AutoOption ------------------------------------------------------------

interface AutoOptionProps {
  selected: boolean
  onPress: () => void
}

/** «Авто» — снять ручное закрепление, статус выводится из пунктов. */
const AutoOption: React.FC<AutoOptionProps> = ({ selected, onPress }) => {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Авто"
      accessibilityState={{ selected }}
      style={[
        styles.option,
        styles.autoOption,
        { borderTopColor: colors.borderSubtle },
      ]}
    >
      <Ionicons name="sync-outline" size={16} color={colors.textSecondary} />
      <View style={styles.autoTextCol}>
        <Text style={[styles.autoLabel, { color: colors.textPrimary }]}>Авто</Text>
        <Text style={[styles.autoHint, { color: colors.textSecondary }]}>
          Статус определяется по пунктам
        </Text>
      </View>
      {selected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(31,38,34,0.32)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 4,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e2e2',
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: { ...typography.body, fontSize: 17, fontWeight: '700', marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  optionDot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { ...typography.body, fontSize: 15.5, fontWeight: '600', flex: 1 },
  autoOption: { marginTop: 6, borderTopWidth: 1, borderRadius: 0, paddingTop: 10 },
  autoLabel: { ...typography.body, fontSize: 15.5, fontWeight: '600' },
  autoTextCol: { flex: 1, gap: 1 },
  autoHint: { ...typography.bodySm, fontSize: 12 },
})

export default StatusSheet
