import React from 'react'
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  radius?: number
}

const Card: React.FC<CardProps> = ({ children, style, radius = 22 }) => (
  <View style={[styles.card, { borderRadius: radius }, style]}>
    {children}
  </View>
)

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    // Основная тень (iOS)
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    // Лёгкая дополнительная тень (iOS)
    // Для Android
    elevation: Platform.OS === 'android' ? 3 : 0,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
})

export default Card
