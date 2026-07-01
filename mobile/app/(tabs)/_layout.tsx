import React from 'react'
import {
  Platform,
  StyleSheet,
} from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@/theme'
import CreateButton from '@/components/tabs/CreateButton'

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
          title: 'Задачи',
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
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notes-list"
        options={{
          title: 'Заметки',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon name="document-text" focused={focused} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
})
