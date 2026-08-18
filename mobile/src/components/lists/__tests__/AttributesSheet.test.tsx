/**
 * Тесты единой шторки «Допатрибуты» (замена сетки чипов + шторки одного
 * атрибута): все атрибуты пункта + название + количество + футер
 * «Удалить пункт» с подтверждением; свайп вниз закрывает (useSheetDragToClose).
 */
import React from 'react'
import { Alert, Animated, Keyboard, PanResponder, Platform } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'

import AttributesSheet from '../AttributesSheet'
import { EMPTY_ATTRIBUTE_VALUES, type ItemAttributeValues } from '@/utils/itemAttributes'

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
      danger: '#FF3B30',
      amber: '#F59E0B',
      amberBg: '#FBEFD6',
    },
  }),
}))

const accentColor = '#d99a3e'
const accentBg = '#fbf3e4'

const baseProps = {
  visible: true,
  values: EMPTY_ATTRIBUTE_VALUES,
  accentColor,
  accentBg,
}

describe('AttributesSheet — структура (все атрибуты в одной шторке)', () => {
  it('visible=false ничего не рендерит', async () => {
    const { queryByText } = await render(
      <AttributesSheet {...baseProps} visible={false} onChangeAttribute={jest.fn()} onClose={jest.fn()} />,
    )
    expect(queryByText('Допатрибуты')).toBeNull()
  })

  it('показывает заголовок «Допатрибуты» и строки всех 4 атрибутов', async () => {
    const { getByText, getByLabelText } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByText('Допатрибуты')).toBeTruthy()
    expect(getByLabelText('Добавить: Дедлайн')).toBeTruthy()
    expect(getByLabelText('Добавить: Напоминание')).toBeTruthy()
    expect(getByLabelText('Добавить: Ссылка')).toBeTruthy()
    expect(getByLabelText('Добавить: Тег')).toBeTruthy()
  })

  it('заполненные атрибуты показывают значение (токен), незаполненные — «Не задано»', async () => {
    const values: ItemAttributeValues = {
      deadline: '2026-07-10',
      reminderAt: null,
      link: 'https://example.com/path',
      tags: ['срочно', 'дом'],
    }
    const { getByLabelText, getAllByText } = await render(
      <AttributesSheet {...baseProps} values={values} onChangeAttribute={jest.fn()} onClose={jest.fn()} />,
    )
    expect(getByLabelText('Дедлайн: 10 июл')).toBeTruthy()
    expect(getByLabelText('Ссылка: example.com')).toBeTruthy()
    expect(getByLabelText('Тег: срочно, дом')).toBeTruthy()
    // Напоминание не задано
    expect(getByLabelText('Добавить: Напоминание')).toBeTruthy()
    expect(getAllByText('Не задано').length).toBe(1)
  })

  it('«×» на заданном атрибуте очищает его (deadline → null, tag → [])', async () => {
    const onChangeAttribute = jest.fn()
    const values: ItemAttributeValues = {
      ...EMPTY_ATTRIBUTE_VALUES,
      deadline: '2026-07-10',
      tags: ['дом'],
    }
    const { getByLabelText } = await render(
      <AttributesSheet {...baseProps} values={values} onChangeAttribute={onChangeAttribute} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Удалить дедлайн'))
    })
    expect(onChangeAttribute).toHaveBeenCalledWith('deadline', null)
    await act(async () => {
      fireEvent.press(getByLabelText('Удалить тег'))
    })
    expect(onChangeAttribute).toHaveBeenCalledWith('tag', [])
  })

  it('тап по скриму вызывает onClose', async () => {
    const onClose = jest.fn()
    const { getByLabelText } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} onClose={onClose} />,
    )
    fireEvent.press(getByLabelText('Закрыть'))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('AttributesSheet — инлайн-редакторы атрибутов', () => {
  it('раскрытие «Дедлайн» показывает пресеты; «Сегодня» коммитит YYYY-MM-DD сразу', async () => {
    const onChangeAttribute = jest.fn()
    const { getByLabelText } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={onChangeAttribute} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Дедлайн'))
    })
    expect(getByLabelText('Завтра')).toBeTruthy()
    expect(getByLabelText('Выбрать дату')).toBeTruthy()
    await act(async () => {
      fireEvent.press(getByLabelText('Сегодня'))
    })
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    expect(onChangeAttribute).toHaveBeenCalledWith('deadline', `${y}-${m}-${d}`)
  })

  it('раскрытие «Напоминание»: пресет «За 1 час» коммитит ISO не в прошлом', async () => {
    const onChangeAttribute = jest.fn()
    const { getByLabelText } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={onChangeAttribute} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Напоминание'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('За 1 час'))
    })
    const [attr, value] = onChangeAttribute.mock.calls[0] as [string, string]
    expect(attr).toBe('reminder')
    expect(new Date(value).getTime()).toBeGreaterThan(Date.now())
  })

  it('пресет напоминания считается от дедлайна, если он задан', async () => {
    const onChangeAttribute = jest.fn()
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, deadline: '2026-08-01' }
    const { getByLabelText } = await render(
      <AttributesSheet {...baseProps} values={values} onChangeAttribute={onChangeAttribute} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Напоминание'))
    })
    await act(async () => {
      fireEvent.press(getByLabelText('За день'))
    })
    const value = onChangeAttribute.mock.calls[0]?.[1] as string
    const date = new Date(value)
    // дедлайн 2026-08-01 09:00 минус 1 день = 2026-07-31 09:00
    expect(date.getDate()).toBe(31)
    expect(date.getMonth()).toBe(6) // июль (0-indexed)
  })

  it('раскрытие «Ссылка»: ввод + blur коммитит строку', async () => {
    const onChangeAttribute = jest.fn()
    const { getByLabelText, getByPlaceholderText } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={onChangeAttribute} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Ссылка'))
    })
    const input = getByPlaceholderText('Вставьте ссылку')
    await act(async () => {
      fireEvent.changeText(input, 'https://example.com')
    })
    await act(async () => {
      fireEvent(input, 'blur')
    })
    expect(onChangeAttribute).toHaveBeenCalledWith('link', 'https://example.com')
  })

  it('очистка текста ссылки + Enter коммитит null (снять ссылку)', async () => {
    const onChangeAttribute = jest.fn()
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, link: 'https://a.com' }
    const { getByLabelText, getByPlaceholderText } = await render(
      <AttributesSheet {...baseProps} values={values} onChangeAttribute={onChangeAttribute} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Ссылка: a.com'))
    })
    const input = getByPlaceholderText('Вставьте ссылку')
    await act(async () => {
      fireEvent.changeText(input, '')
    })
    await act(async () => {
      fireEvent(input, 'submitEditing')
    })
    expect(onChangeAttribute).toHaveBeenCalledWith('link', null)
  })

  it('раскрытие «Тег»: пилюли-пресеты, тап коммитит массив сразу', async () => {
    const onChangeAttribute = jest.fn()
    const { getByLabelText } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={onChangeAttribute} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Тег'))
    })
    expect(getByLabelText('Работа')).toBeTruthy()
    await act(async () => {
      fireEvent.press(getByLabelText('Срочно'))
    })
    expect(onChangeAttribute).toHaveBeenCalledWith('tag', ['Срочно'])
  })

  it('новый тег через поле + Enter добавляется к тегам', async () => {
    const onChangeAttribute = jest.fn()
    const { getByLabelText } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={onChangeAttribute} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Тег'))
    })
    await act(async () => {
      fireEvent.changeText(getByLabelText('Новый тег'), 'Ремонт')
    })
    await act(async () => {
      fireEvent(getByLabelText('Новый тег'), 'submitEditing')
    })
    expect(onChangeAttribute).toHaveBeenCalledWith('tag', ['Ремонт'])
  })

  it('«висящий» текст нового тега коммитится при сворачивании строки', async () => {
    const onChangeAttribute = jest.fn()
    const { getByLabelText } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={onChangeAttribute} onClose={jest.fn()} />,
    )
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Тег'))
    })
    await act(async () => {
      fireEvent.changeText(getByLabelText('Новый тег'), 'Дача')
    })
    // Сворачиваем строку тега без явного submit
    await act(async () => {
      fireEvent.press(getByLabelText('Добавить: Тег'))
    })
    expect(onChangeAttribute).toHaveBeenCalledWith('tag', ['Дача'])
  })
})

describe('AttributesSheet — название пункта (переехало из раскрытой панели)', () => {
  const renderWithName = async (onRename: jest.Mock) =>
    render(
      <AttributesSheet
        {...baseProps}
        name="Тестовый пункт"
        onRename={onRename}
        onChangeAttribute={jest.fn()}
        onClose={jest.fn()}
      />,
    )

  it('поле названия показывает текущее имя', async () => {
    const { getByTestId } = await renderWithName(jest.fn())
    expect(getByTestId('item-name-input').props.value).toBe('Тестовый пункт')
  })

  it('без name/onRename поле названия не рендерится', async () => {
    const { queryByTestId } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} onClose={jest.fn()} />,
    )
    expect(queryByTestId('item-name-input')).toBeNull()
  })

  it('ввод нового имени + blur вызывает onRename с trim', async () => {
    const onRename = jest.fn()
    const { getByTestId } = await renderWithName(onRename)
    const input = getByTestId('item-name-input')
    await act(async () => {
      fireEvent.changeText(input, '  Новое имя  ')
    })
    await act(async () => {
      fireEvent(input, 'blur')
    })
    expect(onRename).toHaveBeenCalledWith('Новое имя')
  })

  it('Enter (submitEditing) тоже сохраняет новое имя', async () => {
    const onRename = jest.fn()
    const { getByTestId } = await renderWithName(onRename)
    const input = getByTestId('item-name-input')
    await act(async () => {
      fireEvent.changeText(input, 'Через Enter')
    })
    await act(async () => {
      fireEvent(input, 'submitEditing')
    })
    expect(onRename).toHaveBeenCalledWith('Через Enter')
  })

  it('пустое имя НЕ сохраняется: onRename не вызван, поле вернулось к прежнему', async () => {
    const onRename = jest.fn()
    const { getByTestId } = await renderWithName(onRename)
    const input = getByTestId('item-name-input')
    await act(async () => {
      fireEvent.changeText(input, '   ')
    })
    await act(async () => {
      fireEvent(input, 'blur')
    })
    expect(onRename).not.toHaveBeenCalled()
    expect(getByTestId('item-name-input').props.value).toBe('Тестовый пункт')
  })

  it('неизменённое имя не сохраняется (нет лишней outbox-мутации)', async () => {
    const onRename = jest.fn()
    const { getByTestId } = await renderWithName(onRename)
    await act(async () => {
      fireEvent(getByTestId('item-name-input'), 'blur')
    })
    expect(onRename).not.toHaveBeenCalled()
  })
})

describe('AttributesSheet — количество (goods)', () => {
  it('строка «Количество» с степпером рендерится при quantity+onQuantityChange', async () => {
    const onQuantityChange = jest.fn()
    const { getByText, getByLabelText } = await render(
      <AttributesSheet
        {...baseProps}
        quantity={2}
        onQuantityChange={onQuantityChange}
        onChangeAttribute={jest.fn()}
        onClose={jest.fn()}
      />,
    )
    expect(getByText('Количество')).toBeTruthy()
    fireEvent.press(getByLabelText('Увеличить'))
    expect(onQuantityChange).toHaveBeenCalledWith(3)
  })

  it('«Уменьшить» не опускает количество ниже 1', async () => {
    const onQuantityChange = jest.fn()
    const { getByLabelText } = await render(
      <AttributesSheet
        {...baseProps}
        quantity={1}
        onQuantityChange={onQuantityChange}
        onChangeAttribute={jest.fn()}
        onClose={jest.fn()}
      />,
    )
    fireEvent.press(getByLabelText('Уменьшить'))
    expect(onQuantityChange).toHaveBeenCalledWith(1)
  })

  it('без quantity строка «Количество» не рендерится (tasks)', async () => {
    const { queryByText } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} onClose={jest.fn()} />,
    )
    expect(queryByText('Количество')).toBeNull()
  })
})

describe('AttributesSheet — футер «Удалить пункт» (подтверждение)', () => {
  it('футер рендерится при onDelete; тап показывает подтверждение, «Удалить» вызывает onDelete', async () => {
    const onDelete = jest.fn()
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const { getByTestId } = await render(
      <AttributesSheet {...baseProps} onDelete={onDelete} onChangeAttribute={jest.fn()} onClose={jest.fn()} />,
    )
    fireEvent.press(getByTestId('attributes-sheet-delete'))
    expect(alertSpy).toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled() // без подтверждения не удаляет
    const buttons = alertSpy.mock.calls[0]?.[2] as Array<{ text: string; onPress?: () => void }>
    buttons.find((b) => b.text === 'Удалить')?.onPress?.()
    expect(onDelete).toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('без onDelete футера нет (композер нового пункта)', async () => {
    const { queryByTestId } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} onClose={jest.fn()} />,
    )
    expect(queryByTestId('attributes-sheet-delete')).toBeNull()
  })
})

describe('AttributesSheet — жест закрытия и клавиатура (паттерн CommentsSheet)', () => {
  it('на drag-зоне (grabber+header) навешаны обработчики свайпа (PanResponder)', async () => {
    const { getByTestId } = await render(
      <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} onClose={jest.fn()} />,
    )
    const dragZone = getByTestId('attributes-sheet-drag-zone')
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
      <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} onClose={onClose} />,
    )
    release(config)
    unmount()
    createSpy.mockRestore()
    timingSpy.mockRestore()
    springSpy.mockRestore()
  }

  it('свайп вниз выше порога (>100px) вызывает onClose', async () => {
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
      <AttributesSheet {...baseProps} onChangeAttribute={jest.fn()} onClose={jest.fn()} />,
    )
    const readMarginBottom = (): unknown => {
      const sheet = getByTestId('attributes-sheet')
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
