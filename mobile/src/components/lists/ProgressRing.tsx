import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface ProgressRingProps {
  value: number
  total: number
  color: string
  size?: number
}

/**
 * Прогресс-кольцо без SVG: два концентрических View с border + процент внутри.
 * Внешний круг — серый track, внутренний — цветная дуга через overflow-clip и
 * поворот. Используется аппроксимация дуги через два полукруга (CSS-border hack).
 */
const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  total,
  color,
  size = 72,
}) => {
  const ratio = total > 0 ? Math.min(value / total, 1) : 0
  const percent = Math.round(ratio * 100)
  const stroke = Math.round(size * 0.1)
  const inner = size - stroke * 2

  return (
    <View
      testID="progress-ring"
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: value }}
      style={[styles.wrapper, { width: size, height: size }]}
    >
      <View
        style={[
          styles.track,
          { width: size, height: size, borderRadius: size / 2, borderWidth: stroke },
        ]}
      />
      <ArcFill ratio={ratio} color={color} size={size} stroke={stroke} />
      <View
        style={[
          styles.inner,
          { width: inner, height: inner, borderRadius: inner / 2 },
        ]}
      >
        <Text style={[styles.pct, { fontSize: size * 0.22, color }]}>{percent}%</Text>
      </View>
    </View>
  )
}

interface ArcFillProps {
  ratio: number
  color: string
  size: number
  stroke: number
}

/**
 * Дуга через два полукруга (техника CSS border-clip). Левый и правый clip
 * покрывают 0–50% и 50–100% в зависимости от ratio. Точность достаточна
 * для прогресс-индикатора (не претендует на pixel-perfect SVG).
 */
const ArcFill: React.FC<ArcFillProps> = ({ ratio, color, size, stroke }) => {
  const half = size / 2
  const deg = ratio * 360

  if (ratio === 0) return null

  const leftDeg = Math.min(deg, 180)
  const rightDeg = Math.max(deg - 180, 0)

  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: half, overflow: 'hidden' }]}>
      {/* Правая половина (0–180°) */}
      <View
        style={[
          styles.halfBase,
          {
            right: 0,
            width: half,
            height: size,
            borderTopRightRadius: half,
            borderBottomRightRadius: half,
            overflow: 'hidden',
          },
        ]}
      >
        <View
          style={[
            styles.halfFill,
            {
              width: size,
              height: size,
              borderRadius: half,
              borderWidth: stroke,
              borderColor: color,
              left: -half,
              transform: [{ rotate: `${leftDeg - 90}deg` }],
            },
          ]}
        />
      </View>
      {/* Левая половина (180–360°) */}
      {rightDeg > 0 && (
        <View
          style={[
            styles.halfBase,
            {
              left: 0,
              width: half,
              height: size,
              borderTopLeftRadius: half,
              borderBottomLeftRadius: half,
              overflow: 'hidden',
            },
          ]}
        >
          <View
            style={[
              styles.halfFill,
              {
                width: size,
                height: size,
                borderRadius: half,
                borderWidth: stroke,
                borderColor: color,
                right: -half,
                transform: [{ rotate: `${rightDeg - 90}deg` }],
              },
            ]}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    borderColor: '#EFF3F6',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  pct: {
    fontWeight: '700',
  },
  halfBase: {
    position: 'absolute',
    top: 0,
  },
  halfFill: {
    position: 'absolute',
    top: 0,
  },
})

export default ProgressRing
