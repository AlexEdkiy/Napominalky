import React from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

interface ProgressRingProps {
  /** Доля выполнения от 0 до 1. */
  progress: number
  size?: number
  strokeWidth?: number
  color: string
  trackColor: string
  children?: React.ReactNode
}

const clampProgress = (value: number): number => Math.min(1, Math.max(0, value))

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 40,
  strokeWidth = 3,
  color,
  trackColor,
  children,
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = clampProgress(progress)
  const strokeDashoffset = circumference * (1 - clamped)
  const center = size / 2

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} testID="progress-ring-svg">
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default ProgressRing
