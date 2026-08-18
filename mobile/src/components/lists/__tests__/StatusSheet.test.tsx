import React from 'react'
import { Animated, PanResponder } from 'react-native'
import { fireEvent, render } from '@testing-library/react-native'

import StatusSheet, { type StatusSheetProps } from '../StatusSheet'

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

const baseProps: StatusSheetProps = {
  visible: true,
  title: 'Статус пункта',
  current: 'new',
  onSelect: jest.fn(),
  onClose: jest.fn(),
}

describe('StatusSheet', () => {
  it('тап по скриму вызывает onClose', async () => {
    const onClose = jest.fn()
    const { getByLabelText } = await render(<StatusSheet {...baseProps} onClose={onClose} />)
    fireEvent.press(getByLabelText('Закрыть'))
    expect(onClose).toHaveBeenCalled()
  })
})

// Свайп вниз закрывает шторку статусов (общий хук useSheetDragToClose, тот же
// подход к тестам, что у CommentsSheet: перехват конфига PanResponder.create,
// анимации Animated мокируются — RAF нестабилен в jest).
describe('StatusSheet — свайп вниз закрывает шторку', () => {
  it('на drag-зоне (grabber+title) навешаны обработчики свайпа', async () => {
    const { getByTestId } = await render(<StatusSheet {...baseProps} />)
    const dragZone = getByTestId('status-sheet-drag-zone')
    expect(typeof dragZone.props.onStartShouldSetResponder).toBe('function')
    expect(typeof dragZone.props.onMoveShouldSetResponder).toBe('function')
    expect(typeof dragZone.props.onResponderRelease).toBe('function')
  })

  type ReleaseConfig = {
    onPanResponderRelease?: (evt: unknown, gesture: { dy: number; dx: number; vy: number }) => void
  }

  const withMockedGesture = async (onClose: () => void, release: (config: ReleaseConfig) => void): Promise<void> => {
    let config: ReleaseConfig = {}
    const createSpy = jest.spyOn(PanResponder, 'create').mockImplementation((cfg) => {
      config = cfg as ReleaseConfig
      return { panHandlers: {} }
    })
    const timingSpy = jest.spyOn(Animated, 'timing').mockReturnValue({
      start: (cb?: (result: { finished: boolean }) => void) => cb?.({ finished: true }),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation)
    const springSpy = jest.spyOn(Animated, 'spring').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation)

    const { unmount } = await render(<StatusSheet {...baseProps} onClose={onClose} />)
    release(config)
    unmount()
    createSpy.mockRestore()
    timingSpy.mockRestore()
    springSpy.mockRestore()
  }

  it('свайп вниз дальше порога (>100px) вызывает onClose', async () => {
    const onClose = jest.fn()
    await withMockedGesture(onClose, (config) => {
      config.onPanResponderRelease?.({}, { dy: 150, dx: 0, vy: 0.2 })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('свайп вниз ниже порога НЕ закрывает шторку', async () => {
    const onClose = jest.fn()
    await withMockedGesture(onClose, (config) => {
      config.onPanResponderRelease?.({}, { dy: 20, dx: 0, vy: 0.1 })
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})
