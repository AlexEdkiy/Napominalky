import React, { useCallback } from 'react'
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import { Tabs, router, type RelativePathString } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

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
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>
    </View>
  )
}

export default function TabsLayout() {
  const { colors } = useTheme()

  const tabBarStyle = {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  }

  const headerStyle = {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle,
        headerStyle,
        headerTintColor: colors.text,
        headerShadowVisible: false,
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
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  createBtnPressed: { opacity: 0.85 },
})
