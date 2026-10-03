import React, { useRef, useState } from 'react'
import { Alert, Pressable, Share, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme'

interface ShareTextButtonProps {
  text: string
  disabled?: boolean
}

/** The user selects Telegram and the recipient in the system share sheet. */
const ShareTextButton: React.FC<ShareTextButtonProps> = ({ text, disabled = false }) => {
  const { colors } = useTheme()
  const pending = useRef(false)
  const [sharing, setSharing] = useState(false)
  const unavailable = disabled || !text.trim() || sharing

  const share = async (): Promise<void> => {
    if (unavailable || pending.current) return
    pending.current = true
    setSharing(true)
    try {
      await Share.share({ message: text }, { dialogTitle: 'Поделиться — выберите Telegram' })
    } catch {
      Alert.alert('Не удалось поделиться', 'Попробуйте ещё раз через меню «Поделиться».')
    } finally {
      pending.current = false
      setSharing(false)
    }
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Поделиться в Telegram"
      accessibilityHint="Выберите Telegram в меню приложений"
      accessibilityState={{ disabled: Boolean(unavailable) }} disabled={Boolean(unavailable)}
      onPress={() => { void share() }} style={[styles.button, unavailable && styles.disabled]}>
      <Ionicons name="share-outline" size={22} color={colors.accent} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  disabled: { opacity: 0.4 },
})

export default ShareTextButton
