import React, { type ReactNode } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

interface SettingRowProps {
  label: string
  right?: ReactNode
  hint?: string | undefined
  onPress?: () => void
}

const SettingRow: React.FC<SettingRowProps> = ({ label, right, hint, onPress }) => {
  const content = (
    <View style={styles.row}>
      <View style={styles.labelBlock}>
        <Text style={styles.label}>{label}</Text>
        {hint !== undefined ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {right !== undefined ? <View style={styles.right}>{right}</View> : null}
    </View>
  )

  if (onPress !== undefined) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {content}
      </Pressable>
    )
  }

  return content
}

const styles = StyleSheet.create({
  pressable: { borderRadius: 8 },
  pressed: { opacity: 0.7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 4,
  },
  labelBlock: { flex: 1, gap: 2 },
  label: { fontSize: 16, color: '#1a1a1a' },
  hint: { fontSize: 12, color: '#94a3b8' },
  right: { marginLeft: 12 },
})

export default SettingRow
