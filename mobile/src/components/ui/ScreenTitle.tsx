import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { typography } from '@/theme/typography'

interface ScreenTitleProps {
  text: string
  color?: string
}

const ScreenTitle: React.FC<ScreenTitleProps> = ({ text, color = '#1B2733' }) => (
  <Text style={[styles.title, { color }]}>{text}</Text>
)

const styles = StyleSheet.create({
  title: {
    ...typography.screenTitle,
  },
})

export default ScreenTitle
