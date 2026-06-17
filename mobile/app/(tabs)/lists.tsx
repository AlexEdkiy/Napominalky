import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'

import ListCard from '@/components/lists/ListCard'
import ScreenTitle from '@/components/ui/ScreenTitle'
import { useShoppingLists } from '@/hooks/useShoppingLists'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

export default function ListsScreen() {
  const { colors } = useTheme()
  const { lists, isLoading } = useShoppingLists()

  const handleOpen = (uuid: string): void => {
    router.push(`/lists/${uuid}`)
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.screenBg }]}>
      <View style={styles.header}>
        <ScreenTitle text="Списки" color={colors.textPrimary} />
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.uuid}
          renderItem={({ item }) => <ListCard list={item} onPress={handleOpen} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState color={colors.textSecondary} />}
        />
      )}
    </SafeAreaView>
  )
}

const EmptyState: React.FC<{ color: string }> = ({ color }) => (
  <View style={styles.empty}>
    <Text style={[styles.emptyTitle, { color }]}>Списков покупок пока нет</Text>
    <Text style={[styles.emptyHint, { color }]}>Нажмите «+», чтобы создать первый</Text>
  </View>
)

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  loader: { marginTop: 32 },
  list: { padding: 16, paddingBottom: 24, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { ...typography.cardTitle },
  emptyHint: { ...typography.body },
})
