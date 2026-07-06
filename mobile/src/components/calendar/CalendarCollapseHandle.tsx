import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface CalendarCollapseHandleProps {
  collapsed: boolean
  onToggle: () => void
}

const HANDLE_BAR_COLOR = '#E2E8ED'
const CHEVRON_COLOR = '#9AA6B2'

/** «Ручка» под сеткой календаря: плашка + шеврон, тап переключает collapsed. */
const CalendarCollapseHandle: React.FC<CalendarCollapseHandleProps> = ({
  collapsed,
  onToggle,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={collapsed ? 'Развернуть календарь' : 'Свернуть календарь'}
    accessibilityState={{ expanded: !collapsed }}
    onPress={onToggle}
    style={styles.container}
  >
    <View style={styles.bar} />
    <Ionicons
      name="chevron-up"
      size={18}
      color={CHEVRON_COLOR}
      style={collapsed ? styles.chevronCollapsed : styles.chevronExpanded}
    />
  </Pressable>
)

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 6, paddingBottom: 4, gap: 4 },
  bar: { width: 38, height: 4, borderRadius: 2, backgroundColor: HANDLE_BAR_COLOR },
  chevronExpanded: { transform: [{ rotate: '0deg' }] },
  chevronCollapsed: { transform: [{ rotate: '180deg' }] },
})

export default CalendarCollapseHandle
