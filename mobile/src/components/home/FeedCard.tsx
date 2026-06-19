import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { typography } from '@/theme/typography'
import type { ColorPalette } from '@/theme/colors'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

interface FeedCardProps {
  uuid: string
  title: string
  subtitle: string
  subtitleColor?: string | undefined
  iconName: IoniconName
  iconColor: string
  iconBg: string
  onPress: (uuid: string) => void
  colors: ColorPalette
}

const FeedCard: React.FC<FeedCardProps> = ({
  uuid,
  title,
  subtitle,
  subtitleColor,
  iconName,
  iconColor,
  iconBg,
  onPress,
  colors,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    onPress={() => onPress(uuid)}
    style={({ pressed }) => [
      styles.card,
      {
        backgroundColor: colors.surface,
        borderColor: colors.borderSubtle,
      },
      pressed && styles.pressed,
    ]}
  >
    <View style={[styles.iconSquare, { backgroundColor: iconBg }]}>
      <Ionicons name={iconName} size={20} color={iconColor} />
    </View>
    <View style={styles.texts}>
      <Text numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.subtitle, { color: subtitleColor ?? colors.textSecondary }]}
      >
        {subtitle}
      </Text>
    </View>
  </Pressable>
)

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
  },
  pressed: { opacity: 0.82 },
  iconSquare: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  title: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySm,
    fontSize: 13,
  },
})

export default FeedCard
