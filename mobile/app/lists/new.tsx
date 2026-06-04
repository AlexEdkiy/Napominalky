import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { router, Stack } from 'expo-router'

import BaseButton from '@/components/common/BaseButton'
import BaseInput from '@/components/common/BaseInput'
import { useShoppingLists } from '@/hooks/useShoppingLists'

export default function NewListScreen() {
  const { createList } = useShoppingLists()
  const [title, setTitle] = useState('')

  const handleCreate = (): void => {
    const trimmed = title.trim()
    if (trimmed.length === 0) return
    createList.mutate(
      { title: trimmed },
      { onSuccess: (list) => router.replace(`/lists/${list.uuid}`) },
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Stack.Screen options={{ title: 'Новый список' }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <BaseInput
          label="Название списка"
          value={title}
          onChangeText={setTitle}
          placeholder="Например, Продукты на неделю"
          autoFocus
        />
        <View style={styles.actions}>
          <BaseButton
            label="Создать"
            onPress={handleCreate}
            loading={createList.isPending}
            disabled={title.trim().length === 0}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 16 },
  actions: { gap: 12 },
})
