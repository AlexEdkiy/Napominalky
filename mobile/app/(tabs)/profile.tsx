import { router } from 'expo-router'
import Constants from 'expo-constants'
import React from 'react'
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'

import BaseButton from '@/components/common/BaseButton'
import DarkHeader from '@/components/ui/DarkHeader'
import IconSquare from '@/components/ui/IconSquare'
import SectionLabel from '@/components/ui/SectionLabel'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

export default function ProfileScreen(): React.JSX.Element {
  const { colors } = useTheme()
  const { user, isAuthenticated, guestMode, logout } = useAuth()

  const displayName = user?.name ?? user?.email ?? 'Гость'
  const initial = displayName.charAt(0).toUpperCase()
  const isGuest = guestMode || !isAuthenticated

  const handleLogout = (): void => {
    Alert.alert('Выйти из аккаунта?', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => { logout.mutate() },
      },
    ])
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBg }]}>
      <StatusBar style="light" />
      <DarkHeader title="Профиль" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AvatarSection
          initial={initial}
          displayName={displayName}
          email={user?.email}
          isGuest={isGuest}
        />

        <View style={styles.section}>
          <SectionLabel text="АККАУНТ" color={colors.textTertiary} />
          {isGuest ? (
            <View style={styles.authButtons}>
              <BaseButton label="Войти" onPress={() => router.push('/(auth)/login')} />
              <BaseButton
                label="Зарегистрироваться"
                onPress={() => router.push('/(auth)/register')}
                variant="secondary"
              />
            </View>
          ) : (
            <BaseButton
              label="Выйти"
              onPress={handleLogout}
              variant="secondary"
              loading={logout.isPending}
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel text="О ПРИЛОЖЕНИИ" color={colors.textTertiary} />
          <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
            <MenuRow
              icon="settings-outline"
              iconBg="#DDF1ED"
              iconColor="#0D9488"
              label="Настройки"
              onPress={() => router.push('/settings')}
            />
            <View style={[styles.separator, { backgroundColor: colors.borderSubtle }]} />
            <MenuRow
              icon="lock-closed-outline"
              iconBg="#FCE7E1"
              iconColor="#E26A4D"
              label="Безопасность"
              onPress={() => router.push('/settings/security')}
            />
          </View>
        </View>

        <VersionLabel colors={colors} />
      </ScrollView>
    </View>
  )
}

interface AvatarSectionProps {
  initial: string
  displayName: string
  email: string | undefined
  isGuest: boolean
}

const AvatarSection: React.FC<AvatarSectionProps> = ({
  initial,
  displayName,
  email,
  isGuest,
}) => (
  <View style={styles.avatarSection}>
    <View style={styles.avatarWrap}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
    <Text style={styles.displayName}>{displayName}</Text>
    {email !== undefined ? <Text style={styles.email}>{email}</Text> : null}
    {isGuest ? (
      <View style={styles.guestBadge}>
        <Text style={styles.guestText}>Гостевой режим</Text>
      </View>
    ) : null}
  </View>
)

interface MenuRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name']
  iconBg: string
  iconColor: string
  label: string
  onPress: () => void
}

const MenuRow: React.FC<MenuRowProps> = ({ icon, iconBg, iconColor, label, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={({ pressed }) => [styles.menuRow, pressed && styles.menuPressed]}
  >
    <IconSquare
      icon={icon}
      bgColor={iconBg}
      iconColor={iconColor}
      size={38}
      radius={10}
    />
    <Text style={styles.menuLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color="#9AA6B2" />
  </Pressable>
)

interface VersionLabelProps {
  colors: ReturnType<typeof import('@/theme').useTheme>['colors']
}

const VersionLabel: React.FC<VersionLabelProps> = ({ colors }) => {
  const version = Constants.expoConfig?.version ?? null
  const buildNumber =
    (Constants.expoConfig?.android?.versionCode as number | undefined) ?? null
  if (version === null) return null
  const label = buildNumber !== null ? `Версия ${version} (${buildNumber})` : `Версия ${version}`
  return <Text style={[styles.versionText, { color: colors.textTertiary }]}>{label}</Text>
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 6 : 0,
  },
  avatarText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fff',
  },
  displayName: { ...typography.h2, fontSize: 24, color: '#1B2733' },
  email: { ...typography.body, color: '#76828F' },
  guestBadge: {
    backgroundColor: '#EEF2F6',
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  guestText: { ...typography.bodySm, color: '#76828F', fontWeight: '600' },
  section: { marginHorizontal: 16, marginTop: 20, gap: 10 },
  authButtons: { gap: 10 },
  menuCard: {
    borderRadius: 22,
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: Platform.OS === 'android' ? 3 : 0,
    overflow: 'hidden',
  },
  separator: { height: 1, marginHorizontal: 16 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuPressed: { opacity: 0.8 },
  menuLabel: { flex: 1, ...typography.body, color: '#1B2733', fontWeight: '600' },
  versionText: {
    ...typography.bodySm,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
})
