import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { formatReminderChip } from '@/utils/datetime'
import type { Reminder } from '@/db/repositories/remindersRepo'

interface ReminderListItemProps {
  reminder: Reminder
  /** Красная подпись «просрочено на N дней»; null — не показывать. */
  overdueText?: string | null
  onPress: (uuid: string) => void
  onComplete: (uuid: string) => void
}

/**
 * Строка списка напоминаний: иконка будильника в мягком круге, заголовок,
 * чип «дата, время», опциональная подпись просрочки и круглая кнопка
 * «выполнить» справа.
 */
const ReminderListItem: React.FC<ReminderListItemProps> = ({
  reminder, overdueText = null, onPress, onComplete,
}) => {
  const { colors } = useTheme()
  const title = reminder.title.trim().length > 0 ? reminder.title : 'Без названия'
  const isOverdue = overdueText !== null

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
        style={[
          styles.iconCircle,
          { backgroundColor: isOverdue ? colors.coralSoftBg : colors.accentSoftBg },
        ]}
      >
        <Ionicons
          name="alarm"
          size={20}
          color={isOverdue ? colors.danger : colors.accent}
        />
      </View>

      <View style={styles.content}>
        <Text numberOfLines={2} style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.dateChip, { backgroundColor: colors.appBg }]}>
            <Text style={[styles.dateChipText, { color: colors.textBody }]}>
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
  checkBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default ReminderListItem
