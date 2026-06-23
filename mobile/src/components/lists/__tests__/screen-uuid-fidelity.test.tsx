/**
 * UI-fidelity тесты: экран редактора списка (app/lists/[uuid].tsx).
 * Все моки — на уровне модуля. Данные задаются через переменные-синглтоны.
 */
jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { render } from '@testing-library/react-native'

// ---- Изменяемые синглтоны для управления данными -------------------------

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
  useLocalSearchParams: () => ({ uuid: 'list-1' }),
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

jest.mock('@/hooks/useShoppingListItems', () => ({
  useShoppingListItems: () => ({
    items: mockItems,
    addItem: { mutate: jest.fn() },
    updateItem: { mutate: jest.fn() },
    deleteItem: { mutate: jest.fn() },
    checkItem: { mutate: jest.fn() },
  }),
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
    expect(getByLabelText('Удалить список')).toBeTruthy()
  })
})

// ============================================================
// Тип goods — пустой список
// ============================================================

describe('Экран [uuid] — goods, пустой список', () => {
  beforeEach(() => { resetToGoodsEmpty() })

  it('сегмент типа содержит вкладки «Товары» и «Задачи»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Товары')).toBeTruthy()
    expect(getByText('Задачи')).toBeTruthy()
  })

  it('сегмент типа: «Товары» активен для goods', async () => {
    const { getAllByRole } = await render(<Screen />)
    const tabs = getAllByRole('tab')
    // TypeSegment: первые два таба — Товары/Задачи
    const typeSegmentTabs = tabs.slice(0, 2)
    expect(typeSegmentTabs[0]?.props.accessibilityState?.selected).toBe(true)
    expect(typeSegmentTabs[1]?.props.accessibilityState?.selected).toBe(false)
  })

  it('прогресс-кольцо отображает 0%', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('0%')).toBeTruthy()
  })

  it('показывает «0/0 куплено»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('0/0 куплено')).toBeTruthy()
  })

  it('субтайтл «Отмечайте купленные товары»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Отмечайте купленные товары')).toBeTruthy()
  })

  it('поле добавления с placeholder «Добавить товар»', async () => {
    const { getByPlaceholderText } = await render(<Screen />)
    expect(getByPlaceholderText('Добавить товар')).toBeTruthy()
  })

  it('баннер «Список создан — добавьте первый товар»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Список создан — добавьте первый товар')).toBeTruthy()
  })

  it('текст «Список пока пуст»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Список пока пуст')).toBeTruthy()
  })
})

// ============================================================
// Тип tasks — пустой список
// ============================================================

describe('Экран [uuid] — tasks, пустой список', () => {
  beforeEach(() => { resetToTasksEmpty() })

  it('сегмент типа: «Задачи» активен для tasks', async () => {
    const { getAllByRole } = await render(<Screen />)
    const tabs = getAllByRole('tab')
    const typeSegmentTabs = tabs.slice(0, 2)
    expect(typeSegmentTabs[0]?.props.accessibilityState?.selected).toBe(false)
    expect(typeSegmentTabs[1]?.props.accessibilityState?.selected).toBe(true)
  })

  it('показывает «0/0 сделано»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('0/0 сделано')).toBeTruthy()
  })

  it('субтайтл «Отмечайте выполненные задачи»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Отмечайте выполненные задачи')).toBeTruthy()
  })

  it('поле добавления с placeholder «Новая задача»', async () => {
    const { getByPlaceholderText } = await render(<Screen />)
    expect(getByPlaceholderText('Новая задача')).toBeTruthy()
  })

  it('баннер «Список создан — добавьте первую задачу»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('Список создан — добавьте первую задачу')).toBeTruthy()
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

  it('показывает «1/2 куплено»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('1/2 куплено')).toBeTruthy()
  })

  it('прогресс «50%»', async () => {
    const { getByText } = await render(<Screen />)
    expect(getByText('50%')).toBeTruthy()
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
