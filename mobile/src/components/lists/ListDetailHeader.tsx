import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import QuickAddItem from '@/components/lists/QuickAddItem'
import StatusBadge from '@/components/lists/StatusBadge'
import type { TaskStatus } from '@/constants/taskStatus'
import type { CreateItemData, ListType } from '@/db/repositories/shoppingListsRepo'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

export type ItemFilter = 'all' | 'active' | 'done'

export const ITEM_FILTERS: readonly { key: ItemFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Не выполнено' },
  { key: 'done', label: 'Выполнено' },
]

interface ListDetailHeaderProps {
  listType: ListType
  accentColor: string
  accentBg: string
  itemFilter: ItemFilter
  onFilterChange: (f: ItemFilter) => void
  onAdd: (data: CreateItemData) => void
  isEmpty: boolean
  emptyHint: string
  emptySubHint: string
  /** Статус задачи (только tasks; для goods строка статуса не рендерится). */
  listStatus?: TaskStatus | undefined
  /** true = статус закреплён вручную (подпись «Вручную», иначе «Авто»). */
  statusIsManual?: boolean | undefined
  /** Тап по бейджу статуса задачи — открыть шторку выбора. */
  onOpenListStatus?: (() => void) | undefined
}

/**
 * Шапка контента детального экрана списка: строка статуса задачи (tasks),
 * быстрый ввод пункта, фильтр-сегмент либо пустое состояние.
 */
const ListDetailHeader: React.FC<ListDetailHeaderProps> = ({
  listType,
  accentColor,
  accentBg,
  itemFilter,
  onFilterChange,
  onAdd,
  isEmpty,
  emptyHint,
  emptySubHint,
  listStatus,
  statusIsManual = false,
  onOpenListStatus,
}) => {
  return (
    <>
      {/* Статус задачи — ТОЛЬКО для tasks; goods без статусов */}
      {listType === 'tasks' && listStatus !== undefined && (
        <ListStatusRow
          status={listStatus}
          statusIsManual={statusIsManual}
          onPress={onOpenListStatus}
        />
      )}

      <QuickAddItem listType={listType} onAdd={onAdd} autoFocus={false} />

      {isEmpty ? (
        <EmptyBanner
          accentBg={accentBg}
          accentColor={accentColor}
          listType={listType}
          hint={emptyHint}
          subHint={emptySubHint}
        />
      ) : (
        <ItemFilterSegment
          filters={ITEM_FILTERS}
          active={itemFilter}
          onSelect={onFilterChange}
          accentColor={accentColor}
        />
      )}
    </>
  )
}

// ---- ListStatusRow ---------------------------------------------------------

interface ListStatusRowProps {
  status: TaskStatus
  statusIsManual: boolean
  onPress?: (() => void) | undefined
}

const ListStatusRow: React.FC<ListStatusRowProps> = ({
  status,
  statusIsManual,
  onPress,
}) => {
  const { colors } = useTheme()
  return (
    <View style={styles.statusRow} testID="list-status-row">
      <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Статус</Text>
      <StatusBadge status={status} onPress={onPress} testID="detail-status-badge" />
      <Text style={[styles.statusMode, { color: colors.textTertiary }]}>
        {statusIsManual ? 'Вручную' : 'Авто'}
      </Text>
    </View>
  )
}

// ---- ItemFilterSegment -----------------------------------------------------

interface ItemFilterSegmentProps {
  filters: readonly { key: ItemFilter; label: string }[]
  active: ItemFilter
  onSelect: (f: ItemFilter) => void
  accentColor: string
}

const ItemFilterSegment: React.FC<ItemFilterSegmentProps> = ({
  filters,
  active,
  onSelect,
  accentColor,
}) => {
  const { colors } = useTheme()
  return (
    <View style={[styles.filterRow, { backgroundColor: colors.borderSubtle }]}>
      {filters.map((f) => {
        const isActive = f.key === active
        return (
          <Pressable
            key={f.key}
            onPress={() => onSelect(f.key)}
            style={[
              styles.filterTab,
              isActive && [styles.filterTabActive, { backgroundColor: colors.surface }],
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.filterLabel,
                { color: isActive ? accentColor : colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// ---- EmptyBanner -----------------------------------------------------------

interface EmptyBannerProps {
  accentBg: string
  accentColor: string
  listType: ListType
  hint: string
  subHint: string
}

const EmptyBanner: React.FC<EmptyBannerProps> = ({
  accentBg,
  accentColor,
  listType,
  hint,
  subHint,
}) => {
  const { colors } = useTheme()
  const icon: React.ComponentProps<typeof Ionicons>['name'] =
    listType === 'tasks' ? 'list' : 'bag-handle'
  const successText = 'Задача создана — добавьте первый пункт'
  return (
    <View style={styles.emptyBannerOuter}>
      <View style={[styles.emptyBannerSuccess, { backgroundColor: accentBg }]}>
        <Ionicons name="checkmark-circle" size={20} color={accentColor} />
        <Text style={[styles.emptyBannerSuccessText, { color: accentColor }]}>{successText}</Text>
      </View>
      <View style={styles.emptyCenter}>
        <View style={[styles.emptyIcon, { backgroundColor: accentBg }]}>
          <Ionicons name={icon} size={40} color={accentColor} />
        </View>
        <Text style={[styles.emptyBannerTitle, { color: colors.textPrimary }]}>{hint}</Text>
        <Text style={[styles.emptyBannerSub, { color: colors.textSecondary }]}>{subHint}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
  },
  statusLabel: { ...typography.bodySm, fontWeight: '600' },
  statusMode: { ...typography.bodySm, fontSize: 11.5 },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  filterTabActive: {
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  filterLabel: { ...typography.bodySm, fontWeight: '600' },
  emptyBannerOuter: { gap: 0 },
  emptyBannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyBannerSuccessText: { ...typography.bodySm, fontWeight: '600', flex: 1 },
  emptyCenter: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 10,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBannerTitle: { ...typography.cardTitle, textAlign: 'center' },
  emptyBannerSub: { ...typography.body, textAlign: 'center' },
})

export default ListDetailHeader
