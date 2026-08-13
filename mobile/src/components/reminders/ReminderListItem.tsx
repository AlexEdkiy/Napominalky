import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { formatReminderChip } from '@/utils/datetime'
import type { Reminder } from '@/db/repositories/remindersRepo'

/** Тон карточки: просроченные — danger, запланированные — amber (как задачи на главной). */
export type ReminderTone = 'overdue' | 'planned'

interface ReminderListItemProps {
  reminder: Reminder
  /** Красная подпись «просрочено на N дней»; null — не показывать. */
  overdueText?: string | null
  /** Явный тон; по умолчанию выводится из наличия overdueText. */
  tone?: ReminderTone
  onPress: (uuid: string) => void
  onComplete: (uuid: string) => void
}

/**
 * Строка списка напоминаний: иконка будильника в мягком круге, заголовок,
 * чип «дата, время», опциональная подпись просрочки и скруглённо-квадратная
 * кнопка «выполнить» справа. Тон (danger/amber) консистентен с главной.
 */
const ReminderListItem: React.FC<ReminderListItemProps> = ({
  reminder, overdueText = null, tone, onPress, onComplete,
}) => {
  const { colors } = useTheme()
  const title = reminder.title.trim().length > 0 ? reminder.title : 'Без названия'
  const isOverdue = (tone ?? (overdueText !== null ? 'overdue' : 'planned')) === 'overdue'
  const toneColor = isOverdue ? colors.danger : colors.amber
  const toneSoftBg = isOverdue ? colors.dangerSoftBg : colors.amberBg

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(reminder.uuid)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}
    >
      <View
        testID="reminder-icon-wrap"
        style={[styles.iconCircle, { backgroundColor: toneSoftBg }]}
      >
        <Ionicons name="alarm" size={20} color={toneColor} />
      </View>

      <View style={styles.content}>
        <Text numberOfLines={2} style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <View style={styles.metaRow}>
          <View
            testID="reminder-date-chip"
            style={[styles.dateChip, { backgroundColor: toneSoftBg }]}
          >
            <Text style={[styles.dateChipText, { color: toneColor }]}>
              {formatReminderChip(reminder.remindAt)}
            </Text>
          </View>
        </View>
        {isOverdue && (
          <Text style={[styles.overdueText, { color: colors.danger }]}>
            {overdueText}
          </Text>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Выполнить: ${title}`}
        onPress={() => onComplete(reminder.uuid)}
        hitSlop={8}
        testID="reminder-check-btn"
        style={({ pressed }) => [
          styles.checkBtn,
          { borderColor: colors.borderInput },
          pressed && { backgroundColor: colors.accentSoftBg },
        ]}
      >
        <Ionicons name="checkmark" size={18} color={colors.accent} />
      </Pressable>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 14,
    gap: 12,
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  pressed: { opacity: 0.85 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 6 },
  title: { ...typography.cardTitle, fontSize: 16, lineHeight: 21 },
  metaRow: { flexDirection: 'row' },
  dateChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dateChipText: { ...typography.bodySm, fontWeight: '600' },
  overdueText: { ...typography.bodySm, fontWeight: '700' },
  // Скруглённый квадрат — как чекбоксы в остальном приложении.
  checkBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default ReminderListItem
