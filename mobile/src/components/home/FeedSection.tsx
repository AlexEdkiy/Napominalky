import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { typography } from '@/theme/typography'
import type { ColorPalette } from '@/theme/colors'

interface FeedSectionProps {
  title: string
  count: number
  dotColor: string
  colors: ColorPalette
  children: React.ReactNode
}

const FeedSection: React.FC<FeedSectionProps> = ({
  title,
  count,
  dotColor,
  colors,
  children,
}) => (
  <View style={styles.section}>
    <View style={styles.header}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <View style={[styles.badge, { backgroundColor: colors.borderSubtle }]}>
        <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
          {count}
        </Text>
      </View>
    </View>
    <View style={styles.cards}>{children}</View>
  </View>
)

const styles = StyleSheet.create({
  section: { gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  cards: { gap: 8 },
})

export default FeedSection
