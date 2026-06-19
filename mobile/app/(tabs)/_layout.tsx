import React, { useCallback } from 'react'
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import { Tabs, router, type RelativePathString } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@/theme'

const CREATE_ROUTE = '/create' as RelativePathString

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface TabIconProps {
  name: IoniconsName
  focused: boolean
  color: string
  size: number
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused, color, size }) => {
  const iconName = focused ? name : (`${name}-outline` as IoniconsName)
  return <Ionicons name={iconName} size={size} color={color} />
}

const CreateButton: React.FC = () => {
  const { colors } = useTheme()
  const handlePress = useCallback(() => { router.push(CREATE_ROUTE) }, [])

  return (
    <View style={styles.createWrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Создать"
        onPress={handlePress}
        style={({ pressed }) => [
          styles.createBtn,
          { backgroundColor: colors.accent },
          pressed && styles.createBtnPressed,
        ]}
      >
        <Ionicons name="add" size={30} color="#ffffff" />
      </Pressable>
    </View>
  )
}

export default function TabsLayout() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  // Высота бара + нижний инсет, чтобы кнопки/жесты Android и home-indicator iOS
  // не перекрывали навигацию.
  const baseHeight = Platform.OS === 'ios' ? 60 : 64
  const tabBarStyle = {
    backgroundColor: colors.surface,
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
    height: baseHeight + insets.bottom,
    paddingBottom: insets.bottom + 8,
    paddingTop: 6,
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="home" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: 'Списки',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="list" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="create-placeholder"
        options={{
          title: '',
          tabBarButton: () => <CreateButton />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Календарь',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="calendar" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="person" focused={focused} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  createWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
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
  createBtnPressed: { opacity: 0.85 },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
})
