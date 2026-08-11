import React, { useCallback } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { router, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { useTheme } from '@/theme'

type CreateRoute = '/create' | '/lists/new' | '/notes/new' | '/reminders/new'

const ROUTE_MAP: Record<string, CreateRoute> = {
  '/': '/create',
  '/lists': '/lists/new',
  '/notes-list': '/notes/new',
  '/reminders-tab': '/reminders/new',
  '/reminders-tab/calendar': '/reminders/new',
}

export const resolveCreateRoute = (pathname: string): CreateRoute =>
  ROUTE_MAP[pathname] ?? '/create'

const CreateButton: React.FC = () => {
  const { colors } = useTheme()
  const pathname = usePathname()

  const handlePress = useCallback(() => {
    router.push(resolveCreateRoute(pathname))
  }, [pathname])

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Создать"
        onPress={handlePress}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: colors.accent },
          pressed && styles.btnPressed,
        ]}
      >
        <Ionicons name="add" size={30} color="#ffffff" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  btnPressed: { opacity: 0.85 },
})

export default CreateButton
