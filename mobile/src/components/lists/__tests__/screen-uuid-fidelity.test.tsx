/**
 * UI-fidelity тесты: экран редактора списка (app/lists/[uuid].tsx).
 * Все моки — на уровне модуля. Данные задаются через переменные-синглтоны.
 */
jest.mock('@/db/client', () => ({ db: {} }))

import fs from 'node:fs'
import path from 'node:path'

import React from 'react'
import { Share } from 'react-native'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

// ---- Изменяемые синглтоны для управления данными -------------------------

let mockSearchParams: { uuid: string; itemUuid?: string; showComments?: string } = { uuid: 'list-1' }
let mockItemsLoading = false
beforeEach(() => { mockSearchParams = { uuid: 'list-1' }; mockItemsLoading = false })

let mockListData = {
  uuid: 'list-1',
  userId: null as string | null,
  title: 'Тест список',
  type: 'goods' as 'goods' | 'tasks',
  serverRevision: null as number | null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null as string | null,
  itemsCount: 0,
  checkedItemsCount: 0,
}

let mockItems: Array<{
  uuid: string
  shoppingListUuid: string
  userId: string | null
  name: string
  category: 'products' | 'household' | 'pharmacy' | 'other'
  quantity: number
  deadline: string | null
  reminderAt: string | null
  link: string | null
  comment: string | null
  tags: string | null
  isChecked: boolean
  position: number
  notificationId: string | null
  serverRevision: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}> = []

// ---- Моки ---------------------------------------------------------------

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native')
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  }
})

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Stack: {
    Screen: ({ options }: { options?: { title?: string; headerRight?: () => React.ReactElement | null } }) => {
      const { View } = require('react-native')
      const headerRight = options?.headerRight?.()
      return <View>{headerRight ?? null}</View>
    },
  },
  useLocalSearchParams: () => mockSearchParams,
}))

jest.mock('@react-native-community/datetimepicker', () => () => null)

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#fff',
      screenBg: '#F6F8FA',
      accent: '#0EA5A0',
      accentSoftBg: '#DDF1ED',
      amber: '#F59E0B',
      amberBg: '#FBEFD6',
      textPrimary: '#111',
      textSecondary: '#666',
      textTertiary: '#999',
      textFaint: '#ccc',
      borderSubtle: '#eee',
      borderInput: '#ddd',
      danger: '#FF3B30',
    },
  }),
}))

jest.mock('@/theme/typography', () => ({
  typography: {
    screenTitle: { fontSize: 26, fontWeight: '700' },
    cardTitle: { fontSize: 17, fontWeight: '700' },
    body: { fontSize: 15 },
    bodyMd: { fontSize: 16 },
    bodySm: { fontSize: 13 },
    buttonLabel: { fontSize: 16, fontWeight: '700' },
    sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  },
}))

jest.mock('@/hooks/useShoppingLists', () => ({
  useShoppingLists: () => ({
    lists: [],
    isLoading: false,
    isError: false,
    createList: { mutate: jest.fn(), isPending: false },
    updateList: { mutate: jest.fn() },
    deleteList: { mutate: jest.fn() },
  }),
  useNearestDeadlines: () => new Map(),
  useShoppingList: () => ({
    data: mockListData,
    isLoading: false,
  }),
}))

const mockDeleteItemMutate = jest.fn()

jest.mock('@/hooks/useShoppingListItems', () => ({
  useShoppingListItems: () => ({
    items: mockItems,
    isLoading: mockItemsLoading,
    addItem: { mutate: jest.fn() },
    updateItem: { mutate: jest.fn() },
    deleteItem: { mutate: mockDeleteItemMutate },
    checkItem: { mutate: jest.fn() },
  }),
}))

// Тред комментариев: экран использует счётчики, CommentsSheet — тред пункта.
jest.mock('@/hooks/useItemComments', () => ({
  useItemComments: () => ({
    comments: [],
    isLoading: false,
    addComment: { mutate: jest.fn() },
    deleteComment: { mutate: jest.fn() },
  }),
  useItemCommentCounts: () => new Map<string, number>(),
}))

// ---- Хелперы ------------------------------------------------------------

const resetToGoodsEmpty = () => {
  mockListData = {
    uuid: 'list-1',
    userId: null,
    title: 'Продукты',
    type: 'goods',
    serverRevision: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    itemsCount: 0,
    checkedItemsCount: 0,
  }
  mockItems = []
}

const resetToTasksEmpty = () => {
  mockListData = {
    uuid: 'list-1',
    userId: null,
    title: 'Задачи на неделю',
    type: 'tasks',
    serverRevision: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    itemsCount: 0,
    checkedItemsCount: 0,
  }
  mockItems = []
}

const makeItem = (name: string, isChecked: boolean, uuid: string) => ({
  uuid,
  shoppingListUuid: 'list-1',
  userId: null,
  name,
  category: 'products' as const,
  quantity: 1,
  deadline: null,
  reminderAt: null,
  link: null,
  comment: null,
  tags: null,
  isChecked,
  position: 0,
  notificationId: null,
  serverRevision: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
})

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Screen: React.FC = require('../../../../app/lists/[uuid]').default

// ============================================================
// Шапка экрана
// ============================================================

describe('Экран [uuid] — шапка', () => {
  beforeEach(() => { resetToGoodsEmpty() })

  it('кнопка «Удалить» в заголовке присутствует', async () => {
    const { getByLabelText } = await render(<Screen />)
    expect(getByLabelText('Удалить задачу')).toBeTruthy()
  })

  // 3.3: ряд тегов уровня списка («+ тег») удалён — теги задаются на уровне пункта.
  it('поле «+ тег» уровня списка отсутствует', async () => {
    const { queryByPlaceholderText, queryByLabelText } = await render(<Screen />)
    expect(queryByPlaceholderText('+ тег')).toBeNull()
    expect(queryByLabelText('Добавить тег задачи')).toBeNull()
  })
})

// ============================================================
// Тип goods — пустой список
// ============================================================

describe('Экран [uuid] — goods, пустой список', () => {
  beforeEach(() => { resetToGoodsEmpty() })

  // 3.2: переключатель типа «Купить»/«Сделать» удалён с экрана редактирования —
  // тип задачи здесь больше не отображается и не редактируется.
  it('переключатель типа «Купить»/«Сделать» отсутствует на экране редактирования', async () => {
    const { queryByText } = await render(<Screen />)
    expect(queryByText('Купить')).toBeNull()
    expect(queryByText('Сделать')).toBeNull()
  })

  // 3.1: круговой статус-бар (ProgressRing) и связанный текст «N/M …» убраны с шапки.
  it('круговой статус-бар (progress-ring) отсутствует на экране', async () => {
    const { queryByTestId } = await render(<Screen />)
    expect(queryByTestId('progress-ring')).toBeNull()
  })

  it('поле добавления с placeholder «Что купить»', async () => {
    const { getByPlaceholderText } = await render(<Screen />)
    expect(getByPlaceholderText('Что купить')).toBeTruthy()
  })

  it('баннер «Задача создана — добавьте первый пункт»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Задача создана — добавьте первый пункт')).toBeTruthy()
  })

  it('текст «Пусто пока»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Пусто пока')).toBeTruthy()
  })
})

// ============================================================
// Тип tasks — пустой список
// ============================================================

describe('Экран [uuid] — tasks, пустой список', () => {
  beforeEach(() => { resetToTasksEmpty() })

  it('поле добавления с placeholder «Добавить задачи»', async () => {
    const { getByPlaceholderText } = await render(<Screen />)
    expect(getByPlaceholderText('Добавить задачи')).toBeTruthy()
  })

  it('баннер «Задача создана — добавьте первый пункт»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Задача создана — добавьте первый пункт')).toBeTruthy()
  })

  it('текст «Задач пока нет»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Задач пока нет')).toBeTruthy()
  })
})

// ============================================================
// Goods — с пунктами: фильтры и пункты
// ============================================================

describe('Экран [uuid] — goods, с пунктами', () => {
  beforeEach(() => {
    mockListData = {
      uuid: 'list-1',
      userId: null,
      title: 'Список с товарами',
      type: 'goods',
      serverRevision: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      deletedAt: null,
      itemsCount: 2,
      checkedItemsCount: 1,
    }
    mockItems = [
      makeItem('Молоко', false, 'i1'),
      makeItem('Хлеб', true, 'i2'),
    ]
  })

  it('сегмент-фильтр «Все», «Не выполнено», «Выполнено»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Все')).toBeTruthy()
    expect(getByText('Не выполнено')).toBeTruthy()
    expect(getByText('Выполнено')).toBeTruthy()
  })

  it('фильтр «Все» активен по умолчанию', async () => {
    const { getAllByRole } = await render(<Screen />)
    const tabs = getAllByRole('tab')
    // Последние 3 таба — это фильтры
    const filterTabs = tabs.slice(-3)
    expect(filterTabs[0]?.props.accessibilityState?.selected).toBe(true)
    expect(filterTabs[1]?.props.accessibilityState?.selected).toBe(false)
    expect(filterTabs[2]?.props.accessibilityState?.selected).toBe(false)
  })

  it('пункт «Молоко» отображается', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Молоко')).toBeTruthy()
  })

  it('пункт «Хлеб» отображается', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Хлеб')).toBeTruthy()
  })

  it('чекбокс «Хлеб» имеет состояние checked=true', async () => {
    const { getByLabelText } = await render(<Screen />)
    const checkbox = getByLabelText('Отметить Хлеб')
    expect(checkbox.props.accessibilityState?.checked).toBe(true)
  })

  it('чекбокс «Молоко» имеет состояние checked=false', async () => {
    const { getByLabelText } = await render(<Screen />)
    const checkbox = getByLabelText('Отметить Молоко')
    expect(checkbox.props.accessibilityState?.checked).toBe(false)
  })
})

// ============================================================
// Пункт 1: горизонтальные отступы плашек пунктов (не упираются в края)
// ============================================================

describe('Экран [uuid] — плашки пунктов не упираются в края экрана', () => {
  beforeEach(() => {
    mockListData = {
      uuid: 'list-1',
      userId: null,
      title: 'Список с товарами',
      type: 'goods',
      serverRevision: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      deletedAt: null,
      itemsCount: 1,
      checkedItemsCount: 0,
    }
    mockItems = [makeItem('Молоко', false, 'i1')]
  })

  it('[ПУНКТ 1] плашки пунктов отображаются (структурная проверка)', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Молоко')).toBeTruthy()
  })

  // FlatList (композитный компонент) не прокидывает contentContainerStyle в рендер
  // хоста — проверяем горизонтальный отступ плашек напрямую по исходнику экрана.
  it('[ПУНКТ 1] исходник задаёт contentContainerStyle.paddingHorizontal ≥ 12 (плашки не упираются в края)', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../../../app/lists/[uuid].tsx'), 'utf-8')
    const match = /list:\s*\{[^}]*paddingHorizontal:\s*(\d+)/.exec(source)
    expect(match).not.toBeNull()
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(12)
  })
})

// ============================================================
// Тап с первого раза при открытой клавиатуре: keyboardShouldPersistTaps
// ============================================================

describe('Экран [uuid] — keyboardShouldPersistTaps (тап срабатывает с первого раза)', () => {
  // FlatList — композитный, проп не доходит до хост-рендера в снимке; проверяем
  // по исходнику: без него первый тап по статусу/атрибутам гасит клавиатуру
  // и «съедается», контрол срабатывает лишь со второго раза.
  it('FlatList экрана имеет keyboardShouldPersistTaps="handled" (структурно, по исходнику)', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../../../app/lists/[uuid].tsx'), 'utf-8')
    expect(source).toMatch(/<FlatList[\s\S]*?keyboardShouldPersistTaps="handled"/)
  })

  it('FlatList треда CommentsSheet имеет keyboardShouldPersistTaps="handled" (структурно)', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../CommentsSheet.tsx'), 'utf-8')
    expect(source).toMatch(/<FlatList[\s\S]*?keyboardShouldPersistTaps="handled"/)
  })
})

// ============================================================
// Свайп влево по строке: удаление с подтверждением в строке (без Alert)
// ============================================================

describe('Экран [uuid] — свайп-удаление пункта с inline-подтверждением', () => {
  beforeEach(() => {
    resetToGoodsEmpty()
    mockListData = { ...mockListData, itemsCount: 1 }
    mockItems = [makeItem('Молоко', false, 'i1')]
    mockDeleteItemMutate.mockClear()
  })

  it('строка обёрнута в Swipeable: правое действие «Удалить» доступно', async () => {
    const { getByTestId } = await render(<Screen />)
    expect(getByTestId('item-swipe-delete')).toBeTruthy()
  })

  it('тап по «Удалить» вызывает deleteItem.mutate(uuid) БЕЗ Alert-подтверждения', async () => {
    const { Alert } = require('react-native')
    const alertSpy = jest.spyOn(Alert, 'alert')
    const { getByTestId } = await render(<Screen />)

    fireEvent.press(getByTestId('item-swipe-delete'))

    expect(mockDeleteItemMutate).toHaveBeenCalledWith('i1')
    expect(alertSpy).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('без тапа по кнопке удаление не происходит (свайп сам не удаляет)', async () => {
    await render(<Screen />)
    expect(mockDeleteItemMutate).not.toHaveBeenCalled()
  })
})

// ============================================================
// Облегчённая форма: единая шторка «Допатрибуты» вместо раскрытия строки
// ============================================================

describe('Экран [uuid] — шторка «Допатрибуты» пункта', () => {
  beforeEach(() => {
    resetToGoodsEmpty()
    mockListData = { ...mockListData, itemsCount: 1 }
    mockItems = [makeItem('Молоко', false, 'i1')]
    mockDeleteItemMutate.mockClear()
  })

  it('шеврона раскрытия строки на экране больше нет', async () => {
    const { queryByLabelText } = await render(<Screen />)
    expect(queryByLabelText('Развернуть')).toBeNull()
  })

  it('тап по названию пункта открывает шторку «Допатрибуты» с названием и футером', async () => {
    const { getByLabelText, getByTestId, queryByTestId } = await render(<Screen />)
    expect(queryByTestId('attributes-sheet')).toBeNull()
    await act(async () => {
      fireEvent.press(getByLabelText('Молоко'))
    })
    expect(getByTestId('attributes-sheet')).toBeTruthy()
    expect(getByTestId('item-name-input').props.value).toBe('Молоко')
    expect(getByTestId('attributes-sheet-delete')).toBeTruthy()
  })

  it('футер «Удалить пункт»: подтверждение Alert → deleteItem.mutate(uuid)', async () => {
    const { Alert } = require('react-native')
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const { getByLabelText, getByTestId } = await render(<Screen />)
    await act(async () => {
      fireEvent.press(getByLabelText('Молоко'))
    })
    fireEvent.press(getByTestId('attributes-sheet-delete'))
    expect(alertSpy).toHaveBeenCalled()
    expect(mockDeleteItemMutate).not.toHaveBeenCalled() // без подтверждения не удаляет
    const buttons = alertSpy.mock.calls[0]?.[2] as Array<{ text: string; onPress?: () => void }>
    buttons.find((b) => b.text === 'Удалить')?.onPress?.()
    expect(mockDeleteItemMutate).toHaveBeenCalledWith('i1')
    alertSpy.mockRestore()
  })
})


describe('MOB-69 — opening a search item', () => {
  beforeEach(() => { resetToGoodsEmpty(); mockDeleteItemMutate.mockClear() })

  it('waits for items then opens the matching item parameters once', async () => {
    mockSearchParams = { uuid: 'list-1', itemUuid: 'target' }
    mockItemsLoading = true
    const screen = await render(<Screen />)
    expect(screen.queryByTestId('attributes-sheet')).toBeNull()
    mockItems = [makeItem('Другой', false, 'other'), makeItem('Найденный', false, 'target')]
    mockItemsLoading = false
    await screen.rerender(<Screen />)
    await waitFor(() => expect(screen.getByTestId('item-name-input').props.value).toBe('Найденный'))
    await fireEvent.press(screen.getByLabelText('Закрыть'))
    await screen.rerender(<Screen />)
    expect(screen.queryByTestId('attributes-sheet')).toBeNull()
    expect(mockDeleteItemMutate).not.toHaveBeenCalled()
  })

  it('opens comments for a comment match', async () => {
    mockSearchParams = { uuid: 'list-1', itemUuid: 'target', showComments: '1' }
    mockItems = [makeItem('Найденный', false, 'target')]
    const screen = await render(<Screen />)
    await waitFor(() => expect(screen.getByText('Комментарии')).toBeTruthy())
    expect(screen.getByLabelText('Новый комментарий')).toBeTruthy()
    expect(screen.queryByTestId('attributes-sheet')).toBeNull()
  })

  it('reports an item deleted after search instead of opening another row', async () => {
    mockSearchParams = { uuid: 'list-1', itemUuid: 'deleted' }
    mockItems = [makeItem('Другой', false, 'other')]
    const screen = await render(<Screen />)
    expect(screen.getByText('Пункт из результатов поиска больше недоступен.')).toBeTruthy()
    expect(screen.queryByTestId('attributes-sheet')).toBeNull()
  })
})


it.each(['tasks', 'goods'] as const)('shares the entire %s list despite an active UI filter', async type => {
  resetToTasksEmpty()
  mockListData.type = type
  mockListData.title = 'Полный список'
  mockItems = [
    Object.assign(makeItem('Сделано', true, 'done'), { status: 'done', quantity: 2 }),
    Object.assign(makeItem('Осталось', false, 'open'), { status: 'in_progress' }),
  ]
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })
  try {
    const view = await render(<Screen />)
    await act(async () => { fireEvent.press(view.getByText('Не выполнено')) })
    expect(view.queryByText('Сделано')).toBeNull()
    await act(async () => { fireEvent.press(view.getByLabelText('Поделиться в Telegram')) })
    expect(share).toHaveBeenCalledWith({ message: type === 'tasks'
      ? 'Полный список\n\n☑ Сделано — Выполнена\n☐ Осталось — В работе'
      : 'Полный список\n\n☑ Сделано × 2\n☐ Осталось' }, expect.any(Object))
  } finally { share.mockRestore() }
})
