import React from 'react'
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { useTheme } from '@/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface CreateOption {
  label: string
  hint: string
  icon: IoniconsName
  route: '/notes/new' | '/lists/new' | '/reminders/new'
}

const OPTIONS: CreateOption[] = [
  {
    label: 'Заметка',
    hint: 'Текст, идеи, мысли',
    icon: 'document-text-outline',
    route: '/notes/new',
  },
  {
    label: 'Список',
    hint: 'Список покупок или задач',
    icon: 'list-outline',
    route: '/lists/new',
  },
  {
    label: 'Напоминание',
    hint: 'Уведомление в нужное время',
    icon: 'alarm-outline',
    route: '/reminders/new',
  },
]

interface OptionRowProps {
  option: CreateOption
}

const OptionRow: React.FC<OptionRowProps> = ({ option }) => {
  const { colors } = useTheme()

  const handlePress = (): void => {
    router.back()
    router.push(option.route)
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={option.label}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.optionRow,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.optionPressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.accent + '1A' }]}>
        <Ionicons name={option.icon} size={28} color={colors.accent} />
      </View>
      <View style={styles.optionTexts}>
        <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
        <Text style={[styles.optionHint, { color: colors.textSecondary }]}>{option.hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </Pressable>
  )
}

export default function CreateScreen() {
  const { colors } = useTheme()

  const handleClose = (): void => { router.back() }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          presentation: 'modal',
          title: 'Создать',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              onPress={handleClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.list}>
        {OPTIONS.map((opt) => (
          <OptionRow key={opt.route} option={opt} />
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: 16, gap: 12 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    minHeight: 72,
  },
  optionPressed: { opacity: 0.8 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTexts: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 17, fontWeight: '600' },
  optionHint: { fontSize: 13 },
  closeBtn: { padding: 4 },
})
