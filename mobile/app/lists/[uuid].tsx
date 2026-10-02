import React, { useEffect, useRef, useState } from 'react'
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

import AttributesSheet from '@/components/lists/AttributesSheet'
import CommentsSheet from '@/components/lists/CommentsSheet'
import ItemRow from '@/components/lists/ItemRow'
import ListDetailHeader, { type ItemFilter } from '@/components/lists/ListDetailHeader'
import StatusSheet, { type StatusSheetValue } from '@/components/lists/StatusSheet'
import type {
  CreateItemData,
  ListType,
  ShoppingListItem,
  UpdateItemPatch,
} from '@/db/repositories/shoppingListsRepo'
import { parseTags, serializeTags } from '@/db/repositories/shoppingListsRepo'
import { useShoppingList, useShoppingLists } from '@/hooks/useShoppingLists'
import { useShoppingListItems } from '@/hooks/useShoppingListItems'
import { useItemCommentCounts } from '@/hooks/useItemComments'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import type { AttributeSheetValue, ItemAttribute } from '@/utils/itemAttributes'

const filterItems = (items: ShoppingListItem[], filter: ItemFilter): ShoppingListItem[] => {
  if (filter === 'active') return items.filter((i) => !i.isChecked)
  if (filter === 'done') return items.filter((i) => i.isChecked)
  return items
}

/** Цель шторки статуса: сама задача (list) либо пункт по uuid. */
type StatusSheetTarget = { kind: 'list' } | { kind: 'item'; itemUuid: string }

export default function ListDetailScreen() {
  const { uuid, itemUuid, showComments } = useLocalSearchParams<{
    uuid: string; itemUuid?: string; showComments?: string
  }>()
  const listUuid = uuid ?? ''
  const { colors } = useTheme()
  const { data: list, isLoading } = useShoppingList(listUuid)
  const { deleteList, setListStatus } = useShoppingLists()
  const { items, isLoading: itemsLoading, addItem, updateItem, deleteItem, checkItem, setItemStatus } =
    useShoppingListItems(listUuid)

  const [itemFilter, setItemFilter] = useState<ItemFilter>('all')
  /** uuid пункта, чья шторка «Допатрибуты» открыта (null — скрыта). */
  const [attributesItemUuid, setAttributesItemUuid] = useState<string | null>(null)
  const [statusTarget, setStatusTarget] = useState<StatusSheetTarget | null>(null)
  /** uuid пункта, чей тред комментариев открыт (null — шторка скрыта). */
  const [commentsItemUuid, setCommentsItemUuid] = useState<string | null>(null)
  const commentCounts = useItemCommentCounts(listUuid, items.map((i) => i.uuid))
  const openedSearchTarget = useRef('')
  const [searchTargetMissing, setSearchTargetMissing] = useState(false)
  useEffect(() => {
    if (!itemUuid || itemsLoading || isLoading) return
    const target = `${listUuid}:${itemUuid}:${showComments}`
    if (openedSearchTarget.current === target) return
    openedSearchTarget.current = target
    const found = items.some((item) => item.uuid === itemUuid)
    setSearchTargetMissing(!found)
    if (!found) return
    setItemFilter('all')
    if (showComments === '1') setCommentsItemUuid(itemUuid)
    else setAttributesItemUuid(itemUuid)
  }, [itemUuid, showComments, listUuid, itemsLoading, isLoading, items])


  const accentColor = list?.type === 'tasks' ? colors.amber : colors.accent
  const accentBg = list?.type === 'tasks' ? colors.amberBg : colors.accentSoftBg
  const listType: ListType = list?.type ?? 'goods'
  const isTasks = listType === 'tasks'
  const attributesItem = items.find((i) => i.uuid === attributesItemUuid)
  const commentsItem = items.find((i) => i.uuid === commentsItemUuid)
  const statusItem =
    statusTarget?.kind === 'item'
      ? items.find((i) => i.uuid === statusTarget.itemUuid)
      : undefined

  const handleAdd = (data: CreateItemData): void => {
    addItem.mutate(data)
  }

  /** Коммит атрибута из шторки «Допатрибуты» — update + outbox для sync. */
  const handleChangeAttribute = (attribute: ItemAttribute, value: AttributeSheetValue): void => {
    if (attributesItemUuid === null) return
    updateItem.mutate({ uuid: attributesItemUuid, patch: buildAttributePatch(attribute, value) })
  }

  /** Сохранение отредактированного названия пункта (шторка гарантирует
   *  непустое значение) — update + outbox для sync. */
  const handleRename = (name: string): void => {
    if (attributesItemUuid === null) return
    updateItem.mutate({ uuid: attributesItemUuid, patch: { name } })
  }

  const handleQuantityChange = (quantity: number): void => {
    if (attributesItemUuid === null) return
    updateItem.mutate({ uuid: attributesItemUuid, patch: { quantity } })
  }

  /** Удаление из футера шторки «Допатрибуты» (подтверждение — в шторке). */
  const handleDeleteFromSheet = (): void => {
    if (attributesItemUuid === null) return
    deleteItem.mutate(attributesItemUuid)
    setAttributesItemUuid(null)
  }

  /** Выбор в шторке статуса: задача (в т.ч. «Авто») либо пункт (без «Авто»). */
  const handleSelectStatus = (value: StatusSheetValue): void => {
    if (statusTarget === null) return
    if (statusTarget.kind === 'list') {
      setListStatus.mutate({ uuid: listUuid, status: value })
    } else if (value !== 'auto') {
      setItemStatus.mutate({ uuid: statusTarget.itemUuid, status: value })
    }
    setStatusTarget(null)
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

  /**
   * Удаление из свайп-действия строки: кнопка «Удалить» в выехавшей зоне и есть
   * подтверждение (inline, без Alert) — сразу soft delete + sync.
   */
  const handleSwipeDelete = (itemUuid: string): void => {
    deleteItem.mutate(itemUuid)
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
              onOpenStatus={
                isTasks
                  ? (itemUuid) => setStatusTarget({ kind: 'item', itemUuid })
                  : undefined
              }
              commentsCount={commentCounts.get(item.uuid) ?? 0}
              onOpenComments={setCommentsItemUuid}
              onOpenAttributes={setAttributesItemUuid}
              onSwipeDelete={handleSwipeDelete}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            // DEF-07: contentContainerStyle даёт плашкам пунктов горизонтальный
            // отступ от края экрана; шапка уже имеет собственные margin/padding
            // (16), поэтому компенсируем внешний паддинг здесь, чтобы не удвоить его.
            <View style={styles.headerOffset}>
              {searchTargetMissing && <Text accessibilityRole="alert"
                style={[styles.searchMissing, { color: colors.textSecondary }]}>
                Пункт из результатов поиска больше недоступен.
              </Text>}
              <ListDetailHeader
                listType={listType}
                accentColor={accentColor}
                accentBg={accentBg}
                itemFilter={itemFilter}
                onFilterChange={setItemFilter}
                onAdd={handleAdd}
                isEmpty={items.length === 0}
                emptyHint={emptyHint}
                emptySubHint={emptySubHint}
                listStatus={isTasks ? list.status : undefined}
                statusIsManual={list.statusIsManual}
                onOpenListStatus={() => setStatusTarget({ kind: 'list' })}
              />
            </View>
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

        {/* Единая шторка «Допатрибуты» пункта: название + все атрибуты +
            количество (goods) + футер «Удалить пункт» */}
        <AttributesSheet
          visible={attributesItem !== undefined}
          values={{
            deadline: attributesItem?.deadline ?? null,
            reminderAt: attributesItem?.reminderAt ?? null,
            link: attributesItem?.link ?? null,
            tags: parseTags(attributesItem?.tags ?? null),
          }}
          accentColor={accentColor}
          accentBg={accentBg}
          name={attributesItem?.name}
          onRename={handleRename}
          quantity={listType === 'goods' ? attributesItem?.quantity : undefined}
          onQuantityChange={listType === 'goods' ? handleQuantityChange : undefined}
          onChangeAttribute={handleChangeAttribute}
          onDelete={handleDeleteFromSheet}
          onClose={() => setAttributesItemUuid(null)}
        />

        {/* Тред комментариев пункта (заменяет одиночный атрибут «Комментарий») */}
        <CommentsSheet
          itemUuid={commentsItemUuid}
          listUuid={listUuid}
          accentColor={accentColor}
          accentBg={accentBg}
          itemName={commentsItem?.name}
          onClose={() => setCommentsItemUuid(null)}
        />

        {/* Шторка статуса: задача — 4 статуса + «Авто»; пункт — без «Авто» */}
        <StatusSheet
          visible={statusTarget !== null}
          title={statusTarget?.kind === 'list' ? 'Статус задачи' : 'Статус пункта'}
          current={
            statusTarget?.kind === 'list' ? list.status : statusItem?.status ?? 'new'
          }
          showAuto={statusTarget?.kind === 'list'}
          isAuto={!list.statusIsManual}
          onSelect={handleSelectStatus}
          onClose={() => setStatusTarget(null)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ---- buildAttributePatch ----------------------------------------------------

const buildAttributePatch = (
  attribute: ItemAttribute,
  value: AttributeSheetValue,
): UpdateItemPatch => {
  if (attribute === 'deadline') return { deadline: typeof value === 'string' ? value : null }
  if (attribute === 'reminder') return { reminderAt: typeof value === 'string' ? value : null }
  if (attribute === 'link') return { link: typeof value === 'string' ? value : null }
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

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  searchMissing: { padding: 16, fontSize: 15 },
  container: { flex: 1 },
  loader: { marginTop: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: { ...typography.body },
  // DEF-07: плашки пунктов не должны упираться в края экрана
  list: { paddingBottom: 40, paddingHorizontal: 16 },
  // Компенсирует list.paddingHorizontal для шапки FlatList (уже имеет свои margin/padding=16)
  headerOffset: { marginHorizontal: -16 },
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
  emptyFilter: { alignItems: 'center', paddingTop: 32 },
  emptyFilterText: { ...typography.body },
})
