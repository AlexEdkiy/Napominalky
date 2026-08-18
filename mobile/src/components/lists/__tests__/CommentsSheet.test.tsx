jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { Alert, Animated, PanResponder } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'

import CommentsSheet from '../CommentsSheet'
import type { ShoppingListItemComment } from '@/db/repositories/itemCommentsRepo'
import { formatCommentTimestamp } from '@/utils/datetime'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
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

jest.mock('@/theme/typography', () => ({
  typography: {
    body: { fontSize: 15 },
    bodySm: { fontSize: 13 },
    buttonLabel: { fontSize: 16, fontWeight: '700' },
  },
}))

// Управляемый мок треда: данные и spy-мутации задаются переменными-синглтонами.
let mockComments: ShoppingListItemComment[] = []
const mockAddMutate = jest.fn()
const mockDeleteMutate = jest.fn()

jest.mock('@/hooks/useItemComments', () => ({
  useItemComments: () => ({
    comments: mockComments,
    isLoading: false,
    addComment: { mutate: mockAddMutate },
    deleteComment: { mutate: mockDeleteMutate },
  }),
  useItemCommentCounts: () => new Map<string, number>(),
}))

const makeComment = (over: Partial<ShoppingListItemComment>): ShoppingListItemComment => ({
  uuid: 'c1',
  shoppingListItemUuid: 'i1',
  userId: 'u1',
  authorName: 'Алексей',
  body: 'Взять свежее',
  serverRevision: null,
  createdAt: '2026-01-05T10:30:00Z',
  updatedAt: '2026-01-05T10:30:00Z',
  deletedAt: null,
  ...over,
})

const baseProps = {
  itemUuid: 'i1',
  listUuid: 'l1',
  accentColor: '#d99a3e',
  accentBg: '#fbf3e4',
  onClose: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockComments = []
})

describe('CommentsSheet — тред комментариев', () => {
  it('скрыта, когда itemUuid = null', async () => {
    const { queryByTestId } = await render(<CommentsSheet {...baseProps} itemUuid={null} />)
    expect(queryByTestId('comments-sheet')).toBeNull()
  })

  it('показывает заголовок «Комментарии» и пустое состояние', async () => {
    const { getByText } = await render(<CommentsSheet {...baseProps} />)
    expect(getByText('Комментарии')).toBeTruthy()
    expect(getByText('Комментариев пока нет')).toBeTruthy()
  })

  it('рендерит несколько комментариев: автор, время «ЧЧ:ММ ДД.ММ.ГГ», текст', async () => {
    mockComments = [
      makeComment({ uuid: 'c1', authorName: 'Алексей', body: 'Взять свежее' }),
      makeComment({
        uuid: 'c2',
        authorName: 'Мария',
        body: 'Уже куплено',
        createdAt: '2026-01-06T08:15:00Z',
      }),
    ]
    const { getByText } = await render(<CommentsSheet {...baseProps} />)

    expect(getByText('Алексей')).toBeTruthy()
    expect(getByText('Взять свежее')).toBeTruthy()
    expect(getByText('Мария')).toBeTruthy()
    expect(getByText('Уже куплено')).toBeTruthy()
    // Время форматируется тем же хелпером «ЧЧ:ММ ДД.ММ.ГГ» (локальная TZ).
    expect(getByText(formatCommentTimestamp('2026-01-05T10:30:00Z'))).toBeTruthy()
    expect(getByText(formatCommentTimestamp('2026-01-06T08:15:00Z'))).toBeTruthy()
  })

  it('автор выделен жирным (fontWeight 700)', async () => {
    mockComments = [makeComment({})]
    const { getByText } = await render(<CommentsSheet {...baseProps} />)
    const author = getByText('Алексей')
    const flat = Object.assign({}, ...[author.props.style].flat(Infinity))
    expect(flat.fontWeight).toBe('700')
  })

  it('«Отправить» неактивна при пустом вводе', async () => {
    const { getByLabelText } = await render(<CommentsSheet {...baseProps} />)
    expect(getByLabelText('Отправить').props.accessibilityState?.disabled).toBe(true)
  })

  it('ввод + «Отправить» вызывает addComment.mutate с текстом и очищает поле', async () => {
    const { getByLabelText } = await render(<CommentsSheet {...baseProps} />)
    const input = getByLabelText('Новый комментарий')

    await act(async () => {
      fireEvent.changeText(input, '  Новый комментарий в тред  ')
    })
    await act(async () => {
      fireEvent.press(getByLabelText('Отправить'))
    })

    expect(mockAddMutate).toHaveBeenCalledWith('Новый комментарий в тред')
    expect(input.props.value).toBe('')
  })

  it('добавленный комментарий появляется в треде (append после инвалидации)', async () => {
    mockComments = [makeComment({ uuid: 'c1', body: 'Первый' })]
    const screen = await render(<CommentsSheet {...baseProps} />)
    expect(screen.getByText('Первый')).toBeTruthy()
    expect(screen.queryByText('Второй')).toBeNull()

    // Эмулируем результат инвалидации кеша после addComment.mutate.
    mockComments = [
      makeComment({ uuid: 'c1', body: 'Первый' }),
      makeComment({ uuid: 'c2', body: 'Второй', createdAt: '2026-01-07T12:00:00Z' }),
    ]
    await act(async () => {
      screen.rerender(<CommentsSheet {...baseProps} />)
    })

    expect(screen.getByText('Первый')).toBeTruthy()
    expect(screen.getByText('Второй')).toBeTruthy()
  })

  it('«×» показывает подтверждение; «Удалить» вызывает deleteComment.mutate', async () => {
    mockComments = [makeComment({ uuid: 'c1' })]
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      const destructive = buttons?.find((b) => b.style === 'destructive')
      destructive?.onPress?.()
    })

    const { getByLabelText } = await render(<CommentsSheet {...baseProps} />)
    await act(async () => {
      fireEvent.press(getByLabelText('Удалить комментарий'))
    })

    expect(alertSpy).toHaveBeenCalledWith(
      'Удалить комментарий?',
      expect.any(String),
      expect.any(Array),
    )
    expect(mockDeleteMutate).toHaveBeenCalledWith('c1')
    alertSpy.mockRestore()
  })

  it('тап по скриму вызывает onClose', async () => {
    const onClose = jest.fn()
    const { getByLabelText } = await render(<CommentsSheet {...baseProps} onClose={onClose} />)
    fireEvent.press(getByLabelText('Закрыть шторку'))
    expect(onClose).toHaveBeenCalled()
  })

  it('кнопка «×» в шапке вызывает onClose; подзаголовок — название пункта', async () => {
    const onClose = jest.fn()
    const { getByTestId, getByText } = await render(
      <CommentsSheet {...baseProps} itemName="Сверить оплаты за июль" onClose={onClose} />,
    )
    expect(getByText('Сверить оплаты за июль')).toBeTruthy()
    fireEvent.press(getByTestId('comments-sheet-close'))
    expect(onClose).toHaveBeenCalled()
  })
})

// Свайп вниз закрывает шторку — тот же паттерн и подход к тестам, что у
// AttributeSheet: обработчики PanResponder на drag-зоне; логика решения
// (закрыть/спружинить назад) проверяется через перехваченный конфиг
// PanResponder.create, анимации Animated мокируются (RAF нестабилен в jest).
describe('CommentsSheet — свайп вниз закрывает шторку', () => {
  it('на drag-зоне (grabber+header) навешаны обработчики свайпа (PanResponder)', async () => {
    const { getByTestId } = await render(<CommentsSheet {...baseProps} />)
    const dragZone = getByTestId('comments-sheet-drag-zone')
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

    const { unmount } = await render(<CommentsSheet {...baseProps} onClose={onClose} />)
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
})
