import React from 'react'
import {
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, Stack } from 'expo-router'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'

import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']
type MaterialName = React.ComponentProps<typeof MaterialIcons>['name']

interface CreateOption {
  label: string
  hint: string
  icon: IoniconsName | MaterialName
  iconSet: 'ionicons' | 'material'
  iconColor: string
  iconBg: string
  route: '/notes/new' | '/lists/new' | '/reminders/new'
}

const OPTIONS: CreateOption[] = [
  {
    label: 'Заметка',
    hint: 'Текст, идеи, мысли',
    icon: 'edit-note' as MaterialName,
    iconSet: 'material',
    iconColor: '#0D9488',
    iconBg: '#DDF1ED',
    route: '/notes/new',
  },
  {
    label: 'Список',
    hint: 'Список покупок или задач',
    icon: 'list' as IoniconsName,
    iconSet: 'ionicons',
    iconColor: '#7C6CF0',
    iconBg: '#E9E7FB',
    route: '/lists/new',
  },
  {
    label: 'Напоминание',
    hint: 'Уведомление в нужное время',
    icon: 'alarm' as IoniconsName,
    iconSet: 'ionicons',
    iconColor: '#D9962A',
    iconBg: '#FBEFD6',
    route: '/reminders/new',
  },
]

interface OptionCardProps {
  option: CreateOption
  colors: { surface: string; textPrimary: string; textSecondary: string; borderSubtle: string }
}

const OptionCard: React.FC<OptionCardProps> = ({ option, colors }) => {
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
        styles.card,
        { backgroundColor: colors.surface },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: option.iconBg }]}>
        {option.iconSet === 'material' ? (
          <MaterialIcons name={option.icon as MaterialName} size={28} color={option.iconColor} />
        ) : (
          <Ionicons name={option.icon as IoniconsName} size={28} color={option.iconColor} />
        )}
      </View>
      <View style={styles.texts}>
        <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{option.label}</Text>
        <Text style={[styles.optionHint, { color: colors.textSecondary }]}>{option.hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9AA6B2" />
    </Pressable>
  )
}

export default function CreateScreen() {
  const { colors } = useTheme()

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.screenBg }]}>
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <View style={styles.dragHandle} />
      <View style={styles.appBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.appBarTitle, { color: colors.textPrimary }]}>Создать</Text>
        <View style={styles.appBarSpacer} />
      </View>
      <View style={styles.list}>
        {OPTIONS.map((opt) => (
          <OptionCard
            key={opt.route}
            option={opt}
            colors={{
              surface: colors.surface,
              textPrimary: colors.textPrimary,
              textSecondary: colors.textSecondary,
              borderSubtle: colors.borderSubtle,
            }}
          />
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C3CCD6',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: { ...typography.screenTitle, fontSize: 22, flex: 1 },
  appBarSpacer: { width: 40 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 22,
    padding: 18,
    minHeight: 80,
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  cardPressed: { opacity: 0.8 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 4 },
  optionLabel: { ...typography.cardTitleLg },
  optionHint: { ...typography.bodySm },
})
