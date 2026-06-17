import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { typography } from '@/theme/typography'

interface SectionLabelProps {
  text: string
  color?: string
}

const SectionLabel: React.FC<SectionLabelProps> = ({ text, color = '#9AA6B2' }) => (
  <Text style={[styles.label, { color }]}>{text}</Text>
)

const styles = StyleSheet.create({
  label: {
    ...typography.sectionLabel,
  },
})

export default SectionLabel
