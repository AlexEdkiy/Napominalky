import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, FlatList, Keyboard, PanResponder, StyleSheet, View,
  type FlatListProps, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme'

interface OrderedItem { uuid: string; updatedAt?: string }
interface Props<T> extends Omit<FlatListProps<T>, 'data' | 'renderItem' | 'keyExtractor'> {
  data: T[]; onReorder: (uuids: string[]) => void; disabled?: boolean
  renderRow: (item: T, handle: React.ReactNode, dragging: boolean) => React.ReactElement
}
interface CellProps<T> {
  item: T; children?: React.ReactNode; onLayout?: ((event: LayoutChangeEvent) => void) | undefined
  style?: StyleProp<ViewStyle>
}
interface Drag<T> { item: T; target: string; pointer: number; grab: number; signature: string }
interface HandleProps {
  uuid: string; disabled: boolean; start: (y: number) => void; move: (y: number) => void
  finish: (save: boolean) => void; step: (delta: number) => void
}
const CellDrag = createContext({ uuid: '', target: '', translation: new Animated.Value(0) })

const DragHandle: React.FC<HandleProps> = (props) => {
  const { colors } = useTheme()
  const latest = useRef(props)
  latest.current = props
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !latest.current.disabled,
    onMoveShouldSetPanResponder: () => !latest.current.disabled,
    onPanResponderGrant: (event) => latest.current.start(event.nativeEvent.pageY),
    onPanResponderMove: (_event, gesture) => latest.current.move(gesture.moveY),
    onPanResponderRelease: () => latest.current.finish(true),
    onPanResponderTerminate: () => latest.current.finish(false),
    onPanResponderTerminationRequest: () => false,
  }), [])
  return <View {...responder.panHandlers} style={styles.handle} accessible accessibilityRole="adjustable"
    accessibilityLabel="Порядок пункта" accessibilityHint="Перетащите вверх или вниз за ручку"
    accessibilityState={{ disabled: props.disabled }} testID={`drag-handle-${props.uuid}`}
    accessibilityActions={[{ name: 'increment', label: 'Ниже' }, { name: 'decrement', label: 'Выше' }]}
    onAccessibilityAction={(event) => {
      if (!props.disabled) props.step(event.nativeEvent.actionName === 'increment' ? 1 : -1)
    }}>
    <Ionicons name="reorder-three-outline" size={26} color={colors.textSecondary} />
  </View>
}

/** Handle-only drag over measured, variable-height cells; normal scrolling stays virtualized. */
export default function ReorderableItems<T extends OrderedItem>({
  data, renderRow, onReorder, disabled = false, ...props
}: Props<T>): React.JSX.Element {
  const list = useRef<FlatList<T>>(null)
  const viewport = useRef<View>(null)
  const bounds = useRef({ top: 0, height: 0, content: 0, offset: 0 })
  const layouts = useRef(new Map<string, { y: number; height: number }>())
  const drag = useRef<Drag<T> | null>(null)
  const current = useRef({ data, onReorder, disabled })
  current.current = { data, onReorder, disabled }
  const translation = useRef(new Animated.Value(0)).current
  const [active, setActive] = useState('')
  const [target, setTarget] = useState('')
  const signature = data.map((item) => `${item.uuid}:${item.updatedAt}`).join('|')

  const Cell = useMemo(() => function Cell({ item, children, onLayout, style }: CellProps<T>) {
    const state = useContext(CellDrag)
    return <Animated.View testID={`reorder-cell-${item.uuid}`} style={[style, state.uuid === item.uuid && styles.lifted,
      state.uuid === item.uuid && { transform: [{ translateY: state.translation }] },
      styles.cell]}
      onLayout={(event) => {
        layouts.current.set(item.uuid, event.nativeEvent.layout)
        onLayout?.(event)
      }}>{children}
      {state.target === item.uuid && state.uuid !== item.uuid && <View pointerEvents="none" style={styles.target} />}
    </Animated.View>
  }, [])

  const finish = (save: boolean): void => {
    const moving = drag.current
    drag.current = null
    translation.setValue(0); setActive(''); setTarget('')
    if (!save || !moving || moving.signature !== signature || current.current.disabled) return
    const ids = current.current.data.map((item) => item.uuid)
    const from = ids.indexOf(moving.item.uuid)
    const to = ids.indexOf(moving.target)
    if (from < 0 || to < 0 || from === to) return
    ids.splice(from, 1); ids.splice(to, 0, moving.item.uuid)
    current.current.onReorder(ids)
  }
  const move = (pointer: number): void => {
    const moving = drag.current
    if (!moving) return
    moving.pointer = pointer
    const cell = layouts.current.get(moving.item.uuid)
    if (!cell) return
    const contentY = pointer - bounds.current.top + bounds.current.offset
    translation.setValue(contentY - moving.grab - cell.y)
    const center = contentY - moving.grab + cell.height / 2
    let closest = moving.item.uuid
    let distance = Infinity
    for (const item of current.current.data) {
      const box = layouts.current.get(item.uuid)
      if (!box) continue
      const delta = Math.abs(center - (box.y + box.height / 2))
      if (delta < distance) { closest = item.uuid; distance = delta }
    }
    moving.target = closest; setTarget(closest)
  }
  const callbacks = useRef({ move, finish })
  callbacks.current = { move, finish }
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => {
      const moving = drag.current
      const box = bounds.current
      if (!moving) return
      const y = moving.pointer - box.top
      const step = y < 56 ? -12 : y > box.height - 56 ? 12 : 0
      if (!step) return
      const offset = Math.max(0, Math.min(box.content - box.height, box.offset + step))
      if (offset === box.offset) return
      box.offset = offset
      list.current?.scrollToOffset({ offset, animated: false })
      callbacks.current.move(moving.pointer)
    }, 32)
    return () => clearInterval(timer)
  }, [active])
  useEffect(() => {
    if (drag.current && (disabled || drag.current.signature !== signature)) callbacks.current.finish(false)
  }, [signature, disabled])
  useEffect(() => () => { drag.current = null }, [])

  return <View ref={viewport} testID="reorder-viewport" style={styles.container} onLayout={(event) => {
    bounds.current.height = event.nativeEvent.layout.height
    viewport.current?.measureInWindow((_x, y, _width, height) => {
      bounds.current.top = y; bounds.current.height = height
    })
  }}>
    <CellDrag.Provider value={{ uuid: active, target, translation }}>
      <FlatList {...props} testID="reorder-list" ref={list} data={data} keyExtractor={(item) => item.uuid}
        CellRendererComponent={Cell} scrollEnabled={!active} removeClippedSubviews={false}
        disableVirtualization={active.length > 0} extraData={active}
        onContentSizeChange={(_width, height) => { bounds.current.content = height }}
        onScroll={(event) => { bounds.current.offset = event.nativeEvent.contentOffset.y }} scrollEventThrottle={16}
        renderItem={({ item }) => renderRow(item, <DragHandle uuid={item.uuid} disabled={disabled}
          start={(pointer) => {
            const cell = layouts.current.get(item.uuid)
            if (!cell || disabled || bounds.current.height <= 0) return
            Keyboard.dismiss()
            drag.current = { item, pointer, target: item.uuid, signature,
              grab: pointer - bounds.current.top + bounds.current.offset - cell.y }
            setActive(item.uuid); setTarget(item.uuid)
          }} move={move} finish={finish} step={(delta) => {
            const ids = data.map((row) => row.uuid)
            const from = ids.indexOf(item.uuid)
            const to = from + delta
            if (to < 0 || to >= ids.length) return
            ids.splice(from, 1); ids.splice(to, 0, item.uuid); onReorder(ids)
          }} />, active === item.uuid)} />
    </CellDrag.Provider>
  </View>
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  handle: { width: 44, height: 44, flexShrink: 0, justifyContent: 'center', alignItems: 'center' },
  lifted: { zIndex: 10, elevation: 8, opacity: 0.92 },
  cell: { position: 'relative' },
  target: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: '#138F83' },
})
