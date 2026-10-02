import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface DarkHeaderProps {
  title: string
  onAvatarPress?: () => void
  /** Хлебная крошка «‹ Заголовок»: стрелка назад слева от title. */
  onBack?: () => void
  /** Кнопка-иконка календаря в шапке (рядом с поиском/аватаром). */
  onCalendarPress?: () => void
  withSearch?: boolean
  collapsibleSearch?: boolean
  searchValue?: string
  onSearchChange?: (text: string) => void
  onSearchPress?: () => void
  onGlobalSearch?: (text: string) => void
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
  onBack,
  onCalendarPress,
  withSearch = false,
  collapsibleSearch = false,
  searchValue = '',
  onSearchChange,
  onGlobalSearch,
  onSearchPress,
}) => {
  const insets = useSafeAreaInsets()
  const [searchOpen, setSearchOpen] = useState(false)

  const handleSearchToggle = (): void => {
    if (onSearchPress) { onSearchPress(); return }
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
        {onBack !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Назад"
            onPress={onBack}
            hitSlop={8}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={26} color="#ffffff" />
          </Pressable>
        )}

        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        {onCalendarPress !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Открыть календарь"
            onPress={onCalendarPress}
            style={styles.calendarBtn}
          >
            <Ionicons name="calendar" size={20} color="#ffffff" />
          </Pressable>
        )}

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
            returnKeyType={onGlobalSearch ? 'search' : 'done'}
            onSubmitEditing={() => onGlobalSearch?.(searchValue)}
            autoFocus={collapsibleSearch && searchOpen}
            style={styles.searchInput}
          />
        </View>
      )}
      {showSearchRow && onGlobalSearch && (
        <Pressable accessibilityRole="button" accessibilityLabel="Искать везде"
          onPress={() => onGlobalSearch(searchValue)} style={styles.globalSearch}>
          <Text style={styles.globalSearchText}>Искать везде →</Text>
        </Pressable>
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  globalSearch: { paddingVertical: 12, alignSelf: 'flex-end' },
  globalSearchText: { color: '#fff', fontSize: 15, fontWeight: '600' },
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
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  backBtn: {
    width: 32,
    height: 38,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginRight: 2,
  },
  calendarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
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
