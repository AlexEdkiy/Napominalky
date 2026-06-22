import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'

import ItemRow from '@/components/lists/ItemRow'
import ProgressRing from '@/components/lists/ProgressRing'
import QuickAddItem from '@/components/lists/QuickAddItem'
import type { ListType, ShoppingListItem } from '@/db/repositories/shoppingListsRepo'
import { useShoppingList, useShoppingLists } from '@/hooks/useShoppingLists'
import { useShoppingListItems } from '@/hooks/useShoppingListItems'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

type ItemFilter = 'all' | 'active' | 'done'

const ITEM_FILTERS: readonly { key: ItemFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Не выполнено' },
  { key: 'done', label: 'Выполнено' },
]

const filterItems = (items: ShoppingListItem[], filter: ItemFilter): ShoppingListItem[] => {
  if (filter === 'active') return items.filter((i) => !i.isChecked)
  if (filter === 'done') return items.filter((i) => i.isChecked)
  return items
}

const formatDate = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function ListDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const listUuid = uuid ?? ''
  const { colors } = useTheme()
  const { data: list, isLoading } = useShoppingList(listUuid)
  const { deleteList, updateList } = useShoppingLists()
  const { items, addItem, updateItem, deleteItem, checkItem } = useShoppingListItems(listUuid)

  const [itemFilter, setItemFilter] = useState<ItemFilter>('all')
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null)
  const [datePickerItem, setDatePickerItem] = useState<string | null>(null)

  const accentColor = list?.type === 'tasks' ? colors.amber : colors.accent
  const accentBg = list?.type === 'tasks' ? colors.amberBg : colors.accentSoftBg
  const listType: ListType = list?.type ?? 'goods'

  const handleAdd = (name: string): void => {
    addItem.mutate({ name })
  }

  const handleToggleType = (newType: ListType): void => {
    updateList.mutate({ uuid: listUuid, patch: { type: newType } })
  }

  const handleExpand = (itemUuid: string): void => {
    setExpandedUuid((prev) => (prev === itemUuid ? null : itemUuid))
  }

  const handleQuantityChange = (itemUuid: string, quantity: number): void => {
    updateItem.mutate({ uuid: itemUuid, patch: { quantity } })
  }

  const handleDeadlinePress = (itemUuid: string): void => {
    setDatePickerItem(itemUuid)
  }

  const handleDateChange = (_: unknown, date?: Date): void => {
    if (Platform.OS === 'android') setDatePickerItem(null)
    if (date !== undefined && datePickerItem !== null) {
      updateItem.mutate({ uuid: datePickerItem, patch: { deadline: formatDate(date) } })
    }
    if (Platform.OS === 'ios' && date === undefined) setDatePickerItem(null)
  }

  const handleDateDismiss = (): void => {
    setDatePickerItem(null)
  }

  const confirmDeleteList = (): void => {
    Alert.alert('Удалить список?', 'Список и все пункты будут удалены.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteList.mutate(listUuid, { onSuccess: () => router.back() }),
      },
    ])
  }

  const confirmDeleteItem = (itemUuid: string): void => {
    Alert.alert('Удалить пункт?', 'Действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => deleteItem.mutate(itemUuid) },
    ])
  }

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.loader} color={colors.accent} />
  }

  if (list == null) {
    return (
      <View style={[styles.center, { backgroundColor: colors.screenBg }]}>
        <Text style={[styles.missing, { color: colors.textSecondary }]}>Список не найден</Text>
      </View>
    )
  }

  const filtered = filterItems(items, itemFilter)
  const ratio = list.itemsCount > 0 ? list.checkedItemsCount / list.itemsCount : 0
  const doneLabel = listType === 'tasks' ? 'сделано' : 'куплено'
  const emptyHint = listType === 'tasks' ? 'Задач пока нет' : 'Список пока пуст'
  const emptySubHint =
    listType === 'tasks' ? 'Добавьте первую задачу сверху' : 'Добавьте первый товар сверху'
  const progressSubtitle =
    listType === 'tasks' ? 'Отмечайте выполненные задачи' : 'Отмечайте купленные товары'

  const pickerItem = items.find((i) => i.uuid === datePickerItem)

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBg }]}>
      <Stack.Screen
        options={{
          title: list.title,
          headerRight: () => <DeleteButton onPress={confirmDeleteList} color={colors.danger} />,
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            listType={listType}
            onToggle={(itemUuid, checked) => checkItem.mutate({ uuid: itemUuid, checked })}
            onDelete={confirmDeleteItem}
            onExpand={handleExpand}
            isExpanded={expandedUuid === item.uuid}
            onQuantityChange={handleQuantityChange}
            onDeadlinePress={handleDeadlinePress}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <ListHeader
            list={list}
            listType={listType}
            ratio={ratio}
            accentColor={accentColor}
            accentBg={accentBg}
            doneLabel={doneLabel}
            progressSubtitle={progressSubtitle}
            itemFilter={itemFilter}
            onFilterChange={setItemFilter}
            onTypeChange={handleToggleType}
            onAdd={handleAdd}
            isEmpty={items.length === 0}
            emptyHint={emptyHint}
            emptySubHint={emptySubHint}
          />
        }
        ListEmptyComponent={items.length > 0 ? (
          <View style={styles.emptyFilter}>
            <Text style={[styles.emptyFilterText, { color: colors.textSecondary }]}>
              Нет пунктов в этой категории
            </Text>
          </View>
        ) : null}
      />

      {datePickerItem !== null && (
        <>
          {Platform.OS === 'ios' && (
            <View style={[styles.iosPickerWrap, { backgroundColor: colors.surface }]}>
              <Pressable onPress={handleDateDismiss} style={styles.iosPickerDone}>
                <Text style={[styles.iosPickerDoneText, { color: accentColor }]}>Готово</Text>
              </Pressable>
              <DateTimePicker
                value={pickerItem?.deadline != null ? new Date(pickerItem.deadline) : new Date()}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
              />
            </View>
          )}
          {Platform.OS === 'android' && (
            <DateTimePicker
              value={pickerItem?.deadline != null ? new Date(pickerItem.deadline) : new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </>
      )}
    </View>
  )
}

interface ListHeaderProps {
  list: { title: string; checkedItemsCount: number; itemsCount: number; type: ListType }
  listType: ListType
  ratio: number
  accentColor: string
  accentBg: string
  doneLabel: string
  progressSubtitle: string
  itemFilter: ItemFilter
  onFilterChange: (f: ItemFilter) => void
  onTypeChange: (t: ListType) => void
  onAdd: (name: string) => void
  isEmpty: boolean
  emptyHint: string
  emptySubHint: string
}

const ListHeader: React.FC<ListHeaderProps> = ({
  list,
  listType,
  ratio,
  accentColor,
  accentBg,
  doneLabel,
  progressSubtitle,
  itemFilter,
  onFilterChange,
  onTypeChange,
  onAdd,
  isEmpty,
  emptyHint,
  emptySubHint,
}) => {
  const { colors } = useTheme()

  return (
    <>
      <TypeSegment listType={listType} onTypeChange={onTypeChange} accentColor={accentColor} />

      <View style={[styles.progressBlock, { backgroundColor: colors.surface }]}>
        <ProgressRing value={list.checkedItemsCount} total={list.itemsCount} color={accentColor} size={72} />
        <View style={styles.progressInfo}>
          <Text style={[styles.progressCount, { color: colors.textPrimary }]}>
            {list.checkedItemsCount}/{list.itemsCount} {doneLabel}
          </Text>
          <Text style={[styles.progressSub, { color: colors.textSecondary }]}>
            {progressSubtitle}
          </Text>
        </View>
      </View>

      <QuickAddItem listType={listType} onAdd={onAdd} autoFocus={false} />

      {isEmpty ? (
        <EmptyBanner accentBg={accentBg} accentColor={accentColor} listType={listType} hint={emptyHint} subHint={emptySubHint} />
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

interface TypeSegmentProps {
  listType: ListType
  onTypeChange: (t: ListType) => void
  accentColor: string
}

const TypeSegment: React.FC<TypeSegmentProps> = ({ listType, onTypeChange, accentColor }) => {
  const { colors } = useTheme()
  return (
    <View style={[styles.typeSegment, { backgroundColor: colors.borderSubtle }]}>
      {(['goods', 'tasks'] as ListType[]).map((t) => {
        const isActive = t === listType
        const label = t === 'goods' ? 'Товары' : 'Задачи'
        return (
          <Pressable
            key={t}
            onPress={() => onTypeChange(t)}
            style={[
              styles.typeSegmentItem,
              isActive && { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.typeSegmentLabel, { color: isActive ? accentColor : colors.textSecondary }]}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

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
    <View style={[styles.filterRow, { borderBottomColor: colors.borderSubtle }]}>
      {filters.map((f) => {
        const isActive = f.key === active
        return (
          <Pressable
            key={f.key}
            onPress={() => onSelect(f.key)}
            style={[styles.filterTab, isActive && { borderBottomColor: accentColor }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.filterLabel, { color: isActive ? accentColor : colors.textSecondary }]}>
              {f.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

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
    listType === 'tasks' ? 'checkbox-outline' : 'bag-handle-outline'
  return (
    <View style={[styles.emptyBanner, { backgroundColor: accentBg }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={32} color={accentColor} />
      </View>
      <Text style={[styles.emptyBannerTitle, { color: colors.textPrimary }]}>{hint}</Text>
      <Text style={[styles.emptyBannerSub, { color: colors.textSecondary }]}>{subHint}</Text>
    </View>
  )
}

interface DeleteButtonProps {
  onPress: () => void
  color: string
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ onPress, color }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Удалить список"
    onPress={onPress}
    style={styles.deleteHeaderBtn}
  >
    <Text style={[styles.deleteHeaderText, { color }]}>Удалить</Text>
  </Pressable>
)

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: { ...typography.body },
  list: { paddingBottom: 40 },
  progressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
  },
  progressInfo: { flex: 1, gap: 4 },
  progressCount: { ...typography.cardTitle },
  progressSub: { ...typography.bodySm },
  typeSegment: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  typeSegmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  typeSegmentLabel: { ...typography.body, fontWeight: '700' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  filterTab: {
    paddingVertical: 10,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterLabel: { ...typography.bodySm, fontWeight: '600' },
  emptyBanner: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBannerTitle: { ...typography.cardTitle, textAlign: 'center' },
  emptyBannerSub: { ...typography.body, textAlign: 'center' },
  emptyFilter: { alignItems: 'center', paddingTop: 32 },
  emptyFilterText: { ...typography.body },
  deleteHeaderBtn: { paddingHorizontal: 4 },
  deleteHeaderText: { fontSize: 16 },
  iosPickerWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  iosPickerDone: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 12 },
  iosPickerDoneText: { ...typography.body, fontWeight: '700' },
})
