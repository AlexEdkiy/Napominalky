import React, { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'

import { t, useLanguageStore, type Language } from '@/i18n'
import { useTheme } from '@/theme'

const OPTIONS: { language: Language; label: string }[] = [
  { language: 'ru', label: '🇷🇺 Русский' },
  { language: 'en', label: '🇬🇧 English' },
]

export default function LanguageSelector(): React.JSX.Element {
  const { colors } = useTheme()
  const { language, isHydrated, setLanguage } = useLanguageStore()
  const [saving, setSaving] = useState(false)

  const select = async (next: Language): Promise<void> => {
    if (saving || next === language) return
    setSaving(true)
    try {
      await setLanguage(next)
    } catch {
      Alert.alert(t('Язык приложения'), t('Не удалось сохранить язык. Попробуйте ещё раз.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.row} accessibilityLabel={t('Язык приложения')}>
      {OPTIONS.map((option) => (
        <Pressable
          key={option.language}
          accessibilityRole="radio"
          accessibilityLabel={option.language === 'ru' ? 'Русский' : 'English'}
          accessibilityState={{ checked: language === option.language, disabled: saving || !isHydrated }}
          disabled={saving || !isHydrated}
          onPress={() => { void select(option.language) }}
          style={({ pressed }) => [styles.option, { borderColor: colors.borderInput, backgroundColor: colors.surface }, language === option.language && styles.selected, pressed && styles.pressed]}
        >
          <Text style={[styles.label, { color: colors.textPrimary }, language === option.language && styles.selectedLabel]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center', borderRadius: 14, borderWidth: 1 },
  selected: { borderColor: '#147f71', backgroundColor: '#147f71' },
  label: { fontSize: 15, fontWeight: '600' },
  selectedLabel: { color: '#ffffff' },
  pressed: { opacity: 0.75 },
})
