import { useEffect, useMemo, useRef } from 'react'
import { Animated, PanResponder, type GestureResponderHandlers } from 'react-native'

/** Порог дистанции (px), после которого отпускание закрывает шторку. */
const CLOSE_DISTANCE = 100
/** Порог скорости (px/ms), при котором флик вниз закрывает даже при малом dy. */
const CLOSE_VELOCITY = 1.2

interface SheetDragToClose {
  /** Обработчики PanResponder — навешиваются на drag-зону (ручка + заголовок). */
  panHandlers: GestureResponderHandlers
  /** Суммарный сдвиг листа: анимация появления + текущий drag пальцем. */
  translateY: Animated.AnimatedAddition<number>
}

/**
 * Общий жест bottom-sheet «свайп вниз закрывает»: спружинивает лист при
 * открытии (resetKey становится не-null), тянет его за пальцем вниз и на
 * отпускании закрывает (onClose) при превышении порога дистанции/скорости,
 * иначе возвращает spring'ом на место. Паттерн AttributeSheet, вынесен
 * для переиспользования (AttributeSheet, CommentsSheet).
 */
export const useSheetDragToClose = (resetKey: unknown, onClose: () => void): SheetDragToClose => {
  const enterY = useRef(new Animated.Value(300)).current
  const dragY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (resetKey === null || resetKey === undefined) return
    enterY.setValue(300)
    dragY.setValue(0)
    Animated.spring(enterY, { toValue: 0, useNativeDriver: true, damping: 18, mass: 0.9 }).start()
  }, [resetKey, enterY, dragY])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dy) > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_evt, gesture) => {
          if (gesture.dy > 0) dragY.setValue(gesture.dy)
        },
        onPanResponderRelease: (_evt, gesture) => {
          const shouldClose = gesture.dy > CLOSE_DISTANCE || gesture.vy > CLOSE_VELOCITY
          if (shouldClose) {
            Animated.timing(dragY, { toValue: 600, duration: 180, useNativeDriver: true }).start(onClose)
            return
          }
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true, damping: 18, mass: 0.9 }).start()
        },
      }),
    [dragY, onClose],
  )

  return useMemo(
    () => ({ panHandlers: panResponder.panHandlers, translateY: Animated.add(enterY, dragY) }),
    [panResponder, enterY, dragY],
  )
}
