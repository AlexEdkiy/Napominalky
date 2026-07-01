import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'

import ItemRow, { type MetaPatch } from '@/components/lists/ItemRow'
import ProgressRing from '@/components/lists/ProgressRing'
import QuickAddItem from '@/components/lists/QuickAddItem'
import type { ListType, ShoppingList, ShoppingListItem } from '@/db/repositories/shoppingListsRepo'
import { parseTags, serializeTags } from '@/db/repositories/shoppingListsRepo'
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

const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ---- Reminder picker state machine -----------------------------------------

type ReminderStep = 'date' | 'time'

interface ReminderPickerState {
  itemUuid: string
  step: ReminderStep
  date: Date
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
  const [reminderPicker, setReminderPicker] = useState<ReminderPickerState | null>(null)

  const accentColor = list?.type === 'tasks' ? colors.amber : colors.accent
  const accentBg = list?.type === 'tasks' ? colors.amberBg : colors.accentSoftBg
  const listType: ListType = list?.type ?? 'goods'

  const handleAdd = (name: string): void => {
    addItem.mutate({ name })
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

  const handleReminderPress = (itemUuid: string): void => {
    const item = items.find((i) => i.uuid === itemUuid)
    const initial =
      item?.reminderAt !== null && item?.reminderAt !== undefined
        ? new Date(item.reminderAt)
        : new Date()
    setReminderPicker({ itemUuid, step: 'date', date: initial })
  }

  const handleUpdateMeta = (itemUuid: string, patch: MetaPatch): void => {
    updateItem.mutate({ uuid: itemUuid, patch })
  }

  const handleUpdateListTags = (tags: string[]): void => {
    updateList.mutate({ uuid: listUuid, patch: { tags: serializeTags(tags) } })
  }

  const handleDateChange = (_: unknown, date?: Date): void => {
    if (Platform.OS === 'android') setDatePickerItem(null)
    if (date !== undefined && datePickerItem !== null) {
      updateItem.mutate({ uuid: datePickerItem, patch: { deadline: formatDateLocal(date) } })
    }
    if (Platform.OS === 'ios' && date === undefined) setDatePickerItem(null)
  }

  const handleDateDismiss = (): void => {
    setDatePickerItem(null)
  }

  const handleReminderDateChange = (_: unknown, date?: Date): void => {
    if (reminderPicker === null) return
    if (date === undefined) {
      setReminderPicker(null)
      return
    }
    if (Platform.OS === 'android') {
      const iso = date.toISOString()
      updateItem.mutate({ uuid: reminderPicker.itemUuid, patch: { reminderAt: iso } })
      setReminderPicker(null)
      return
    }
    if (reminderPicker.step === 'date') {
      setReminderPicker({ ...reminderPicker, step: 'time', date })
    } else {
      const iso = date.toISOString()
      updateItem.mutate({ uuid: reminderPicker.itemUuid, patch: { reminderAt: iso } })
      setReminderPicker(null)
    }
  }

  const handleReminderDone = (): void => {
    if (reminderPicker === null) return
    if (reminderPicker.step === 'date') {
      setReminderPicker({ ...reminderPicker, step: 'time' })
      return
    }
    const iso = reminderPicker.date.toISOString()
    updateItem.mutate({ uuid: reminderPicker.itemUuid, patch: { reminderAt: iso } })
    setReminderPicker(null)
  }

  const confirmDeleteList = (): void => {
    Alert.alert('Удалить задачу?', 'Задача и все пункты будут удалены.', [
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
        <Text style={[styles.missing, { color: colors.textSecondary }]}>Задача не найдена</Text>
      </View>
    )
  }

  const filtered = filterItems(items, itemFilter)
  const doneLabel = listType === 'tasks' ? 'сделано' : 'куплено'
  const emptyHint = listType === 'tasks' ? 'Задач пока нет' : 'Пусто пока'
  const emptySubHint =
    listType === 'tasks' ? 'Добавьте первую задачу' : 'Добавьте первый товар'
  const progressSubtitle =
    listType === 'tasks' ? 'Отмечайте выполненные задачи' : 'Отмечайте купленные товары'

  const deadlinePickerItem = items.find((i) => i.uuid === datePickerItem)

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.screenBg }]}>
      {/* DEF-06: кастомная шапка — ← + название + «Удалить» */}
      <CustomHeader
        title={list.title}
        onBack={() => router.back()}
        onDelete={confirmDeleteList}
        deleteColor={colors.danger}
        bg={colors.screenBg}
        textPrimary={colors.textPrimary}
      />

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.screenBg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.uuid}
          keyboardShouldPersistTaps="handled"
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
              onReminderPress={handleReminderPress}
              onUpdateMeta={handleUpdateMeta}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <ListHeader
              list={list}
              listType={listType}
              accentColor={accentColor}
              accentBg={accentBg}
              doneLabel={doneLabel}
              progressSubtitle={progressSubtitle}
              itemFilter={itemFilter}
              onFilterChange={setItemFilter}
              onAdd={handleAdd}
              onUpdateListTags={handleUpdateListTags}
              isEmpty={items.length === 0}
              emptyHint={emptyHint}
              emptySubHint={emptySubHint}
            />
          }
          ListEmptyComponent={
            items.length > 0 ? (
              <View style={styles.emptyFilter}>
                <Text style={[styles.emptyFilterText, { color: colors.textSecondary }]}>
                  Нет пунктов в этой категории
                </Text>
              </View>
            ) : null
          }
        />

        {datePickerItem !== null && (
          <>
            {Platform.OS === 'ios' && (
              <View style={[styles.iosPickerWrap, { backgroundColor: colors.surface }]}>
                <Pressable onPress={handleDateDismiss} style={styles.iosPickerDone}>
                  <Text style={[styles.iosPickerDoneText, { color: accentColor }]}>Готово</Text>
                </Pressable>
                <DateTimePicker
                  value={
                    deadlinePickerItem?.deadline != null
                      ? new Date(deadlinePickerItem.deadline)
                      : new Date()
                  }
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                />
              </View>
            )}
            {Platform.OS === 'android' && (
              <DateTimePicker
                value={
                  deadlinePickerItem?.deadline != null
                    ? new Date(deadlinePickerItem.deadline)
                    : new Date()
                }
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </>
        )}

        {reminderPicker !== null && (
          <>
            {Platform.OS === 'ios' && (
              <View style={[styles.iosPickerWrap, { backgroundColor: colors.surface }]}>
                <View style={styles.iosPickerHeader}>
                  <Text style={[styles.iosPickerTitle, { color: colors.textSecondary }]}>
                    {reminderPicker.step === 'date' ? 'Дата напоминания' : 'Время напоминания'}
                  </Text>
                  <Pressable onPress={handleReminderDone} style={styles.iosPickerDone}>
                    <Text style={[styles.iosPickerDoneText, { color: accentColor }]}>
                      {reminderPicker.step === 'date' ? 'Далее' : 'Готово'}
                    </Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={reminderPicker.date}
                  mode={reminderPicker.step}
                  display="spinner"
                  onChange={handleReminderDateChange}
                />
              </View>
            )}
            {Platform.OS === 'android' && (
              <DateTimePicker
                value={reminderPicker.date}
                mode="time"
                display="default"
                onChange={handleReminderDateChange}
              />
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ---- CustomHeader ----------------------------------------------------------

interface CustomHeaderProps {
  title: string
  onBack: () => void
  onDelete: () => void
  deleteColor: string
  bg: string
  textPrimary: string
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  onBack,
  onDelete,
  deleteColor,
  bg,
  textPrimary,
}) => {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.customHeader, { backgroundColor: bg, paddingTop: insets.top + 10 }]}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Назад"
        style={styles.headerBack}
      >
        <Ionicons name="chevron-back" size={24} color={textPrimary} />
      </Pressable>
      <Text numberOfLines={1} style={[styles.headerTitle, { color: textPrimary }]}>
        {title}
      </Text>
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="Удалить задачу"
        style={styles.headerDelete}
      >
        <Text style={[styles.headerDeleteText, { color: deleteColor }]}>Удалить</Text>
      </Pressable>
    </View>
  )
}

// ---- Sub-components --------------------------------------------------------

interface ListHeaderProps {
  list: ShoppingList
  listType: ListType
  accentColor: string
  accentBg: string
  doneLabel: string
  progressSubtitle: string
  itemFilter: ItemFilter
  onFilterChange: (f: ItemFilter) => void
  onAdd: (name: string) => void
  onUpdateListTags: (tags: string[]) => void
  isEmpty: boolean
  emptyHint: string
  emptySubHint: string
}

const ListHeader: React.FC<ListHeaderProps> = ({
  list,
  listType,
  accentColor,
  accentBg,
  doneLabel,
  progressSubtitle,
  itemFilter,
  onFilterChange,
  onAdd,
  onUpdateListTags,
  isEmpty,
  emptyHint,
  emptySubHint,
}) => {
  const { colors } = useTheme()

  return (
    <>
      <View style={[styles.progressBlock, { backgroundColor: colors.surface }]}>
        <ProgressRing
          value={list.checkedItemsCount}
          total={list.itemsCount}
          color={accentColor}
          size={52}
        />
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

      {/* DEF-03: теги уровня списка под полем добавления */}
      <ListTagsRow
        tags={parseTags(list.tags ?? null)}
        onUpdateTags={onUpdateListTags}
        accentColor={accentColor}
      />

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

// ---- ListTagsRow (DEF-03) --------------------------------------------------

interface ListTagsRowProps {
  tags: string[]
  onUpdateTags: (tags: string[]) => void
  accentColor: string
}

const ListTagsRow: React.FC<ListTagsRowProps> = ({ tags, onUpdateTags, accentColor }) => {
  const { colors } = useTheme()
  const [tagInput, setTagInput] = useState('')

  const handleAdd = (): void => {
    const trimmed = tagInput.trim()
    if (trimmed.length === 0 || tags.includes(trimmed)) return
    onUpdateTags([...tags, trimmed])
    setTagInput('')
  }

  const handleRemove = (tag: string): void => {
    onUpdateTags(tags.filter((t) => t !== tag))
  }

  return (
    <View style={[styles.listTagsRow, { borderColor: colors.borderSubtle }]}>
      <View style={styles.listTagsChips}>
        {tags.map((tag) => (
          <View key={tag} style={[styles.listTagChip, { backgroundColor: colors.borderSubtle }]}>
            <Text style={[styles.listTagText, { color: colors.textSecondary }]}>#{tag}</Text>
            <Pressable
              onPress={() => handleRemove(tag)}
              accessibilityRole="button"
              accessibilityLabel={`Удалить тег задачи ${tag}`}
              style={styles.listTagRemove}
            >
              <Ionicons name="close" size={12} color={colors.textTertiary} />
            </Pressable>
          </View>
        ))}
        <View style={[styles.listTagInputWrap, { borderColor: colors.borderSubtle }]}>
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={handleAdd}
            placeholder="+ тег"
            placeholderTextColor={accentColor}
            style={[styles.listTagInput, { color: colors.textPrimary }]}
            returnKeyType="done"
            accessibilityLabel="Добавить тег задачи"
          />
        </View>
      </View>
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
  safeArea: { flex: 1 },
  container: { flex: 1 },
  loader: { marginTop: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: { ...typography.body },
  list: { paddingBottom: 40 },
  // DEF-06: кастомная шапка
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack: {
    padding: 8,
    marginRight: 4,
  },
  headerTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 17,
    flex: 1,
  },
  headerDelete: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerDeleteText: {
    fontSize: 16,
    fontWeight: '400',
  },
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
  progressCount: { ...typography.body, fontSize: 15, fontWeight: '700' },
  progressSub: { ...typography.bodySm },
  // DEF-03: теги списка — pill-стиль (светлые овалы)
  listTagsRow: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingBottom: 8,
  },
  listTagsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  listTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  listTagText: { ...typography.bodySm, fontSize: 12 },
  listTagRemove: { padding: 2 },
  listTagInputWrap: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  listTagInput: { ...typography.bodySm, fontSize: 12, minWidth: 48 },
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
  emptyFilter: { alignItems: 'center', paddingTop: 32 },
  emptyFilterText: { ...typography.body },
  iosPickerWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  iosPickerTitle: { ...typography.bodySm },
  iosPickerDone: { alignItems: 'flex-end', paddingVertical: 4 },
  iosPickerDoneText: { ...typography.body, fontWeight: '700' },
})
