import React from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'

import ItemRow from '@/components/lists/ItemRow'
import ProgressBar from '@/components/lists/ProgressBar'
import QuickAddItem from '@/components/lists/QuickAddItem'
import type { ItemCategory } from '@/db/repositories/shoppingListsRepo'
import { useShoppingList, useShoppingLists } from '@/hooks/useShoppingLists'
import { useShoppingListItems } from '@/hooks/useShoppingListItems'

export default function ListDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const listUuid = uuid ?? ''
  const { data: list, isLoading } = useShoppingList(listUuid)
  const { deleteList } = useShoppingLists()
  const { items, addItem, deleteItem, checkItem } = useShoppingListItems(listUuid)

  const handleAdd = (name: string, category: ItemCategory): void => {
    addItem.mutate({ name, category })
  }

  const confirmDeleteList = (): void => {
    Alert.alert('Удалить список?', 'Список и его товары будут удалены.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteList.mutate(listUuid, { onSuccess: () => router.back() }),
      },
    ])
  }

  const confirmDeleteItem = (itemUuid: string): void => {
    Alert.alert('Удалить товар?', 'Действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => deleteItem.mutate(itemUuid) },
    ])
  }

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.loader} />
  }

  if (!list) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>Список не найден</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: list.title,
          headerRight: () => <DeleteButton onPress={confirmDeleteList} />,
        }}
      />
      <View style={styles.header}>
        <Text style={styles.counter}>
          {list.checkedItemsCount}/{list.itemsCount} куплено
        </Text>
        <ProgressBar value={list.checkedItemsCount} total={list.itemsCount} />
      </View>
      <QuickAddItem onAdd={handleAdd} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            onToggle={(itemUuid, checked) => checkItem.mutate({ uuid: itemUuid, checked })}
            onDelete={confirmDeleteItem}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState />}
      />
    </View>
  )
}

interface DeleteButtonProps {
  onPress: () => void
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ onPress }) => (
  <Pressable accessibilityRole="button" accessibilityLabel="Удалить список" onPress={onPress}>
    <Text style={styles.headerDelete}>Удалить</Text>
  </Pressable>
)

const EmptyState = () => (
  <View style={styles.empty}>
    <Text style={styles.emptyHint}>Товаров пока нет — добавьте первый сверху</Text>
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  loader: { marginTop: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: { fontSize: 16, color: '#71717a' },
  header: { padding: 16, gap: 8, backgroundColor: '#fff' },
  counter: { fontSize: 14, color: '#52525b' },
  headerDelete: { fontSize: 16, color: '#dc2626', paddingHorizontal: 4 },
  list: { padding: 16, paddingBottom: 32, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyHint: { fontSize: 14, color: '#71717a', textAlign: 'center' },
})
