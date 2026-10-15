import React from 'react'
import { FlatList, PanResponder, Text, View, type GestureResponderEvent, type PanResponderCallbacks,
  type PanResponderGestureState } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'
import ReorderableItems from '../ReorderableItems'

const rows = [{ uuid: 'a' }, { uuid: 'b' }, { uuid: 'c' }]
let gestures: PanResponderCallbacks[]
const state = {} as PanResponderGestureState
const event = (y: number) => ({ nativeEvent: { pageY: y } }) as GestureResponderEvent
beforeEach(() => {
  gestures = []
  jest.spyOn(PanResponder, 'create').mockImplementation((callbacks) => {
    gestures.push(callbacks)
    return { panHandlers: {} }
  })
})
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers() })
const Row = (item: { uuid: string }, handle: React.ReactNode) => <View><Text>{item.uuid}</Text>{handle}</View>
const setup = async (data = rows) => {
  const save = jest.fn()
  const view = await render(<ReorderableItems data={data} onReorder={save} renderRow={Row} />)
  await fireEvent(view.getByTestId('reorder-viewport'), 'layout', { nativeEvent: { layout: { y: 0, height: 400 } } })
  for (let i = 0; i < data.length; i++) await fireEvent(view.getByTestId(`reorder-cell-${data[i]!.uuid}`),
    'layout', { nativeEvent: { layout: { y: i * 100, height: 100 } } })
  return { view, save }
}

it('moves the grabbed row down and persists the resulting visible order only on release', async () => {
  const { save } = await setup()
  const handle = gestures[0]!
  await act(async () => handle.onPanResponderGrant?.(event(50), state))
  await act(async () => handle.onPanResponderMove?.(event(250), { ...state, moveY: 250 }))
  expect(save).not.toHaveBeenCalled()
  await act(async () => handle.onPanResponderRelease?.(event(250), state))
  expect(save).toHaveBeenCalledWith(['b', 'c', 'a'])
})

it('does not save a cancelled gesture or move an ordinary item across the favorites group', async () => {
  const data = [{ uuid: 'a', isFavorite: true }, { uuid: 'b', isFavorite: false }, { uuid: 'c', isFavorite: false }]
  const { view, save } = await setup(data)
  const handle = gestures[2]!
  await act(async () => handle.onPanResponderGrant?.(event(250), state))
  await act(async () => handle.onPanResponderMove?.(event(0), { ...state, moveY: 0 }))
  await act(async () => handle.onPanResponderTerminate?.(event(0), state))
  expect(save).not.toHaveBeenCalled()
  await act(async () => handle.onPanResponderGrant?.(event(250), state))
  await act(async () => handle.onPanResponderMove?.(event(0), { ...state, moveY: 0 }))
  await act(async () => handle.onPanResponderRelease?.(event(0), state))
  expect(save).toHaveBeenCalledWith(['c', 'b'])
  save.mockClear()
  await fireEvent(view.getByTestId('drag-handle-a'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } })
  expect(save).not.toHaveBeenCalled()
})

it('cancels if sync changes the visible data mid-drag', async () => {
  const { view, save } = await setup()
  const handle = gestures[0]!
  await act(async () => handle.onPanResponderGrant?.(event(50), state))
  await act(async () => handle.onPanResponderMove?.(event(250), { ...state, moveY: 250 }))
  await view.rerender(<ReorderableItems data={rows.slice(0, 2)} onReorder={save} renderRow={Row} />)
  await act(async () => handle.onPanResponderRelease?.(event(250), state))
  expect(save).not.toHaveBeenCalled()
})

it('scrolls at the viewport edge and stops the timer when dragging ends', async () => {
  jest.useFakeTimers()
  const scroll = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {})
  const { view } = await setup()
  await fireEvent(view.getByTestId('reorder-list'), 'contentSizeChange', 320, 900)
  const handle = gestures[0]!
  await act(async () => handle.onPanResponderGrant?.(event(50), state))
  await act(async () => handle.onPanResponderMove?.(event(390), { ...state, moveY: 390 }))
  await act(async () => jest.advanceTimersByTime(96))
  expect(scroll).toHaveBeenCalledWith({ offset: 36, animated: false })
  await act(async () => handle.onPanResponderRelease?.(event(390), state))
  const calls = scroll.mock.calls.length
  await act(async () => jest.advanceTimersByTime(96))
  expect(scroll).toHaveBeenCalledTimes(calls)
})
