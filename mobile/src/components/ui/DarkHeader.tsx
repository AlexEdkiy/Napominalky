import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface DarkHeaderProps {
  title: string
  onAvatarPress?: () => void
  withSearch?: boolean
  collapsibleSearch?: boolean
  searchValue?: string
  onSearchChange?: (text: string) => void
}

const GRAD_START = { x: 0, y: 0 }
const GRAD_END = { x: 1, y: 1 }
const GRAD_COLORS: [string, string] = ['#1aa08e', '#17897a']

const SEARCH_BTN_CLOSED_BG = 'rgba(255,255,255,0.16)'
const SEARCH_BTN_OPEN_BG = '#ffffff'
const SEARCH_ICON_OPEN_COLOR = '#17897a'

const DarkHeader: React.FC<DarkHeaderProps> = ({
  title,
  onAvatarPress,
  withSearch = false,
  collapsibleSearch = false,
  searchValue = '',
  onSearchChange,
}) => {
  const insets = useSafeAreaInsets()
  const [searchOpen, setSearchOpen] = useState(false)

  const handleSearchToggle = (): void => {
    setSearchOpen((prev) => !prev)
  }

  const showSearchRow = withSearch || (collapsibleSearch && searchOpen)

  return (
    <LinearGradient
      colors={GRAD_COLORS}
      start={GRAD_START}
      end={GRAD_END}
      style={[styles.gradient, { paddingTop: insets.top }]}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        {collapsibleSearch && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Поиск"
            onPress={handleSearchToggle}
            style={[
              styles.searchToggleBtn,
              { backgroundColor: searchOpen ? SEARCH_BTN_OPEN_BG : SEARCH_BTN_CLOSED_BG },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={searchOpen ? SEARCH_ICON_OPEN_COLOR : '#ffffff'}
            />
          </Pressable>
        )}

        {onAvatarPress !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Профиль"
            onPress={onAvatarPress}
            style={styles.avatar}
          >
            <Ionicons name="person" size={20} color="#ffffff" />
          </Pressable>
        )}
      </View>

      {showSearchRow && (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="#9aa39f" style={styles.searchIcon} />
          <TextInput
            accessibilityLabel="Поиск"
            placeholder="Поиск"
            placeholderTextColor="#9aa39f"
            value={searchValue}
            onChangeText={onSearchChange}
            autoFocus={collapsibleSearch && searchOpen}
            style={styles.searchInput}
          />
        </View>
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    flex: 1,
  },
  searchToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 26,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#141414',
    paddingVertical: 0,
  },
})

export default DarkHeader
