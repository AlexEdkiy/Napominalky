import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, Stack } from 'expo-router'

import ReminderCard from '@/components/reminders/ReminderCard'
import { useReminders } from '@/hooks/useReminders'

export default function RemindersListScreen() {
  const { reminders, isLoading } = useReminders({ status: 'pending' })

  const handleOpen = (uuid: string): void => {
    router.push(`/reminders/${uuid}`)
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Напоминания' }} />
      {isLoading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.uuid}
          renderItem={({ item }) => <ReminderCard reminder={item} onPress={handleOpen} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState />}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Создать напоминание"
        onPress={() => router.push('/reminders/new')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  )
}

const EmptyState = () => (
  <View style={styles.empty}>
    <Text style={styles.emptyTitle}>Напоминаний пока нет</Text>
    <Text style={styles.emptyHint}>Нажмите «+», чтобы создать первое</Text>
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  loader: { marginTop: 32 },
  list: { padding: 16, paddingBottom: 96, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  emptyHint: { fontSize: 14, color: '#71717a' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: { opacity: 0.85 },
  fabIcon: { color: '#fff', fontSize: 32, lineHeight: 36 },
})
