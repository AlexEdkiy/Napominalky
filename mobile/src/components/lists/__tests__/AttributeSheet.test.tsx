import React from 'react'
import { Animated, Keyboard, PanResponder, Platform } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'

import AttributeSheet from '../AttributeSheet'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native')
  return ({ mode }: { mode: string }) => <View testID={`datetimepicker-${mode}`} />
})

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#fff',
      textPrimary: '#111',
      textSecondary: '#666',
      textTertiary: '#999',
      borderInput: '#ddd',
      borderSubtle: '#eee',
    },
  }),
}))

const accentColor = '#d99a3e'
const accentBg = '#fbf3e4'

const baseProps = {
  currentDeadline: null,
  currentReminderAt: null,
  currentLink: null,
  currentComment: null,
  currentTags: [] as string[],
  accentColor,
  accentBg,
}

describe('AttributeSheet — deadline', () => {
  it('открывается с заголовком «Когда дедлайн» и пресетами', async () => {
    const { getByText, getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="deadline" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByText('Когда дедлайн')).toBeTruthy()
    expect(getByLabelText('Сегодня')).toBeTruthy()
    expect(getByLabelText('Завтра')).toBeTruthy()
    expect(getByLabelText('В выходные')).toBeTruthy()
    expect(getByLabelText('Через неделю')).toBeTruthy()
    expect(getByLabelText('Выбрать дату')).toBeTruthy()
  })

  it('«Готово» disabled при пустом значении', async () => {
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="deadline" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByLabelText('Готово').props.accessibilityState?.disabled).toBe(true)
  })

  it('выбор пресета «Сегодня» + «Готово» вызывает onConfirm с YYYY-MM-DD сегодняшней даты', async () => {
    const onConfirm = jest.fn()
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="deadline" onConfirm={onConfirm} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Сегодня'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    expect(onConfirm).toHaveBeenCalledWith(`${y}-${m}-${d}`)
  })

  // 3.5: дедлайн выбирается как дата И время (mode="datetime"), не только дата.
  it('«Выбрать дату» показывает пикер в режиме datetime (дата + время)', async () => {
    const { getByLabelText, getByTestId } = await render(
      <AttributeSheet {...baseProps} attribute="deadline" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Выбрать дату'))
    })
    expect(getByTestId('datetimepicker-datetime')).toBeTruthy()
  })
})

describe('AttributeSheet — reminder', () => {
  it('открывается с заголовком «Когда напомнить» и пресетами', async () => {
    const { getByText, getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="reminder" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByText('Когда напомнить')).toBeTruthy()
    expect(getByLabelText('За 10 минут')).toBeTruthy()
    expect(getByLabelText('За 1 час')).toBeTruthy()
    expect(getByLabelText('За день')).toBeTruthy()
    expect(getByLabelText('Своё время')).toBeTruthy()
  })

  it('выбор пресета «За 1 час» без дедлайна вычисляет ISO не в прошлом', async () => {
    const onConfirm = jest.fn()
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="reminder" onConfirm={onConfirm} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('За 1 час'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    const value = onConfirm.mock.calls[0]?.[0] as string
    expect(new Date(value).getTime()).toBeGreaterThan(Date.now())
  })

  it('пресет считается от дедлайна, если currentDeadline задан', async () => {
    const onConfirm = jest.fn()
    const { getByLabelText } = await render(
      <AttributeSheet
        {...baseProps}
        attribute="reminder"
        currentDeadline="2026-08-01"
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('За день'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    const value = onConfirm.mock.calls[0]?.[0] as string
    const date = new Date(value)
    // дедлайн 2026-08-01 09:00 минус 1 день = 2026-07-31 09:00
    expect(date.getDate()).toBe(31)
    expect(date.getMonth()).toBe(6) // июль (0-indexed)
  })
})

describe('AttributeSheet — link', () => {
  it('открывается с заголовком «Ссылка» и placeholder «Вставьте ссылку»', async () => {
    const { getByText, getByPlaceholderText } = await render(
      <AttributeSheet {...baseProps} attribute="link" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByText('Ссылка')).toBeTruthy()
    expect(getByPlaceholderText('Вставьте ссылку')).toBeTruthy()
  })

  it('ввод ссылки + «Готово» вызывает onConfirm со строкой', async () => {
    const onConfirm = jest.fn()
    const { getByPlaceholderText, getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="link" onConfirm={onConfirm} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Вставьте ссылку'), 'https://example.com')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    expect(onConfirm).toHaveBeenCalledWith('https://example.com')
  })

  it('пустое значение — «Готово» disabled', async () => {
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="link" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByLabelText('Готово').props.accessibilityState?.disabled).toBe(true)
  })
})

describe('AttributeSheet — comment', () => {
  it('открывается с заголовком «Комментарий» и placeholder «Добавьте заметку к задаче»', async () => {
    const { getByText, getByPlaceholderText } = await render(
      <AttributeSheet {...baseProps} attribute="comment" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByText('Комментарий')).toBeTruthy()
    expect(getByPlaceholderText('Добавьте заметку к задаче')).toBeTruthy()
  })

  it('ввод комментария + «Готово» вызывает onConfirm со строкой', async () => {
    const onConfirm = jest.fn()
    const { getByPlaceholderText, getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="comment" onConfirm={onConfirm} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Добавьте заметку к задаче'), 'Взять свежее')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    expect(onConfirm).toHaveBeenCalledWith('Взять свежее')
  })
})

describe('AttributeSheet — tag', () => {
  it('открывается с заголовком «Выберите тег» и готовыми пилюлями', async () => {
    const { getByText, getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="tag" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByText('Выберите тег')).toBeTruthy()
    expect(getByLabelText('Срочно')).toBeTruthy()
    expect(getByLabelText('Работа')).toBeTruthy()
    expect(getByLabelText('Дом')).toBeTruthy()
    expect(getByLabelText('Личное')).toBeTruthy()
    expect(getByLabelText('Новый тег').props.placeholder).toBe('＋ Новый тег')
  })

  it('выбор нескольких пилюль + «Готово» вызывает onConfirm с массивом', async () => {
    const onConfirm = jest.fn()
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="tag" onConfirm={onConfirm} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Срочно'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Дом'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    expect(onConfirm).toHaveBeenCalledWith(['Срочно', 'Дом'])
  })

  it('пустой выбор тегов — «Готово» disabled', async () => {
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="tag" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByLabelText('Готово').props.accessibilityState?.disabled).toBe(true)
  })

  it('новый тег через поле ввода добавляется к выбору', async () => {
    const onConfirm = jest.fn()
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="tag" onConfirm={onConfirm} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.changeText(getByLabelText('Новый тег'), 'Ремонт')
    })
    await act(async () => {
      fireEvent(getByLabelText('Новый тег'), 'submitEditing')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Готово'))
    })
    expect(onConfirm).toHaveBeenCalledWith(['Ремонт'])
  })
})

describe('AttributeSheet — общее поведение', () => {
  it('attribute=null ничего не рендерит', async () => {
    const { queryByText } = await render(
      <AttributeSheet {...baseProps} attribute={null} onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    expect(queryByText('Когда дедлайн')).toBeNull()
  })

  it('тап по скриму вызывает onClose', async () => {
    const onClose = jest.fn()
    const { getByLabelText } = await render(
      <AttributeSheet {...baseProps} attribute="link" onConfirm={jest.fn()} onClose={onClose} />,
    )
    fireEvent.press(getByLabelText('Закрыть'))
    expect(onClose).toHaveBeenCalled()
  })

  // 3.4: свайп сверху-вниз по «ручке» шторки закрывает её (PanResponder на drag-зоне).
  // Логика решения (закрыть/вернуть spring'ом) проверяется через перехваченный конфиг
  // PanResponder.create — Animated.spring/timing тоже мокаются, чтобы не запускать
  // реальный RAF-driven native-animation код в тестовой среде (нестабильно в jest-expo).
  it('на drag-зоне (grabber+header) навешаны обработчики свайпа (PanResponder)', async () => {
    const { getByTestId } = await render(
      <AttributeSheet {...baseProps} attribute="link" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    const dragZone = getByTestId('attribute-sheet-drag-zone')
    expect(typeof dragZone.props.onStartShouldSetResponder).toBe('function')
    expect(typeof dragZone.props.onMoveShouldSetResponder).toBe('function')
    expect(typeof dragZone.props.onResponderRelease).toBe('function')
  })

  type ReleaseConfig = {
    onPanResponderRelease?: (evt: unknown, gesture: { dy: number; dx: number; vy: number }) => void
  }

  const withMockedGesture = async (
    onClose: () => void,
    release: (config: ReleaseConfig) => void,
  ): Promise<void> => {
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

    const { unmount } = await render(
      <AttributeSheet {...baseProps} attribute="link" onConfirm={jest.fn()} onClose={onClose} />,
    )
    release(config)
    unmount()
    createSpy.mockRestore()
    timingSpy.mockRestore()
    springSpy.mockRestore()
  }

  it('свайп вниз ниже порога (>100px) вызывает onClose (через конфиг PanResponder)', async () => {
    const onClose = jest.fn()
    await withMockedGesture(onClose, (config) => {
      config.onPanResponderRelease?.({}, { dy: 150, dx: 0, vy: 0.2 })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('быстрый флик вниз (высокая vy) закрывает даже при небольшом dy', async () => {
    const onClose = jest.fn()
    await withMockedGesture(onClose, (config) => {
      config.onPanResponderRelease?.({}, { dy: 30, dx: 0, vy: 1.5 })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('свайп вниз ниже порога НЕ закрывает шторку (возврат spring)', async () => {
    const onClose = jest.fn()
    await withMockedGesture(onClose, (config) => {
      config.onPanResponderRelease?.({}, { dy: 20, dx: 0, vy: 0.1 })
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  // 3.6: клавиатура не должна перекрывать поле ввода — на Android лист сдвигается
  // вручную на высоту клавиатуры (marginBottom), т.к. behavior=undefined её не поднимает.
  it('[Android] шторка сдвигается вверх (marginBottom) при появлении клавиатуры', async () => {
    const originalPlatformOS = Platform.OS
    Platform.OS = 'android'
    const listeners: Record<string, (event: { endCoordinates: { height: number } }) => void> = {}
    const addListenerSpy = jest.spyOn(Keyboard, 'addListener').mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((eventName: string, cb: any) => {
        listeners[eventName] = cb
        return { remove: jest.fn() }
      }) as unknown as typeof Keyboard.addListener,
    )

    const { getByTestId } = await render(
      <AttributeSheet {...baseProps} attribute="link" onConfirm={jest.fn()} onClose={jest.fn()} />,
    )
    const readMarginBottom = (): unknown => {
      const sheet = getByTestId('attribute-sheet')
      const merged = Array.isArray(sheet.props.style)
        ? Object.assign({}, ...sheet.props.style)
        : sheet.props.style
      return merged.marginBottom
    }
    expect(readMarginBottom()).toBe(0)

    await act(async () => {
      listeners.keyboardDidShow?.({ endCoordinates: { height: 260 } })
    })
    expect(readMarginBottom()).toBe(260)

    addListenerSpy.mockRestore()
    Platform.OS = originalPlatformOS
  })
})
