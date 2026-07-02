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
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import AttributeSheet, { type AttributeSheetValue } from '@/components/lists/AttributeSheet'
import ItemRow, { type MetaPatch } from '@/components/lists/ItemRow'
import QuickAddItem from '@/components/lists/QuickAddItem'
import type {
  CreateItemData,
  ListType,
  ShoppingListItem,
} from '@/db/repositories/shoppingListsRepo'
import { parseTags, serializeTags } from '@/db/repositories/shoppingListsRepo'
import { useShoppingList, useShoppingLists } from '@/hooks/useShoppingLists'
import { useShoppingListItems } from '@/hooks/useShoppingListItems'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import type { ItemAttribute } from '@/utils/itemAttributes'

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

// ---- AttributeSheet target (какой пункт сейчас редактируется) --------------

interface AttributeSheetTarget {
  itemUuid: string
  attribute: ItemAttribute
}

export default function ListDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const listUuid = uuid ?? ''
  const { colors } = useTheme()
  const { data: list, isLoading } = useShoppingList(listUuid)
  const { deleteList } = useShoppingLists()
  const { items, addItem, updateItem, deleteItem, checkItem } = useShoppingListItems(listUuid)

  const [itemFilter, setItemFilter] = useState<ItemFilter>('all')
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null)
  const [sheetTarget, setSheetTarget] = useState<AttributeSheetTarget | null>(null)

  const accentColor = list?.type === 'tasks' ? colors.amber : colors.accent
  const accentBg = list?.type === 'tasks' ? colors.amberBg : colors.accentSoftBg
  const listType: ListType = list?.type ?? 'goods'
  const sheetItem = items.find((i) => i.uuid === sheetTarget?.itemUuid)

  const handleAdd = (data: CreateItemData): void => {
    addItem.mutate(data)
  }

  const handleExpand = (itemUuid: string): void => {
    setExpandedUuid((prev) => (prev === itemUuid ? null : itemUuid))
  }

  const handleQuantityChange = (itemUuid: string, quantity: number): void => {
    updateItem.mutate({ uuid: itemUuid, patch: { quantity } })
  }

  const handleOpenAttribute = (itemUuid: string, attribute: ItemAttribute): void => {
    setSheetTarget({ itemUuid, attribute })
  }

  const handleUpdateMeta = (itemUuid: string, patch: MetaPatch): void => {
    updateItem.mutate({ uuid: itemUuid, patch })
  }

  const handleConfirmAttribute = (value: AttributeSheetValue): void => {
    if (sheetTarget === null) return
    const patch = buildAttributePatch(sheetTarget.attribute, value)
    updateItem.mutate({ uuid: sheetTarget.itemUuid, patch })
    setSheetTarget(null)
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
  const emptyHint = listType === 'tasks' ? 'Задач пока нет' : 'Пусто пока'
  const emptySubHint =
    listType === 'tasks' ? 'Добавьте первую задачу' : 'Добавьте первый товар'

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
              onOpenAttribute={handleOpenAttribute}
              onUpdateMeta={handleUpdateMeta}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <ListHeader
              listType={listType}
              accentColor={accentColor}
              accentBg={accentBg}
              itemFilter={itemFilter}
              onFilterChange={setItemFilter}
              onAdd={handleAdd}
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

        <AttributeSheet
          attribute={sheetTarget?.attribute ?? null}
          currentDeadline={sheetItem?.deadline ?? null}
          currentReminderAt={sheetItem?.reminderAt ?? null}
          currentLink={sheetItem?.link ?? null}
          currentComment={sheetItem?.comment ?? null}
          currentTags={parseTags(sheetItem?.tags ?? null)}
          accentColor={accentColor}
          accentBg={accentBg}
          onConfirm={handleConfirmAttribute}
          onClose={() => setSheetTarget(null)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ---- buildAttributePatch ----------------------------------------------------

const buildAttributePatch = (attribute: ItemAttribute, value: AttributeSheetValue): MetaPatch => {
  if (attribute === 'deadline') return { deadline: typeof value === 'string' ? value : null }
  if (attribute === 'reminder') return { reminderAt: typeof value === 'string' ? value : null }
  if (attribute === 'link') return { link: typeof value === 'string' ? value : null }
  if (attribute === 'comment') return { comment: typeof value === 'string' ? value : null }
  return { tags: serializeTags(Array.isArray(value) ? value : []) }
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
  listType: ListType
  accentColor: string
  accentBg: string
  itemFilter: ItemFilter
  onFilterChange: (f: ItemFilter) => void
  onAdd: (data: CreateItemData) => void
  isEmpty: boolean
  emptyHint: string
  emptySubHint: string
}

const ListHeader: React.FC<ListHeaderProps> = ({
  listType,
  accentColor,
  accentBg,
  itemFilter,
  onFilterChange,
  onAdd,
  isEmpty,
  emptyHint,
  emptySubHint,
}) => {
  return (
    <>
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
})
