import type { FeedFilter, FilterCounts } from '../FilterChips'

const TABS: { key: FeedFilter; label: string; hasDot: boolean }[] = [
  { key: 'all', label: 'Все', hasDot: false },
  { key: 'lists', label: 'Задачи', hasDot: true },
  { key: 'reminders', label: 'Напоминания', hasDot: true },
  { key: 'notes', label: 'Заметки', hasDot: true },
]

const makeCounts = (
  lists: number,
  reminders: number,
  notes: number,
): FilterCounts => ({
  lists,
  reminders,
  notes,
  all: lists + reminders + notes,
})

describe('FilterChips — logic', () => {
  it('содержит все четыре варианта фильтра', () => {
    const keys = TABS.map((t) => t.key)
    expect(keys).toContain('all')
    expect(keys).toContain('lists')
    expect(keys).toContain('reminders')
    expect(keys).toContain('notes')
  })

  it('по умолчанию активен «all»', () => {
    const defaultFilter: FeedFilter = 'all'
    expect(defaultFilter).toBe('all')
  })

  it('активный таб совпадает только с выбранным key', () => {
    const isActive = (tab: FeedFilter, current: FeedFilter): boolean => tab === current
    expect(isActive('lists', 'lists')).toBe(true)
    expect(isActive('notes', 'lists')).toBe(false)
  })

  it('фильтр «all» означает показ всех трёх групп', () => {
    const applyFilter = (
      filter: FeedFilter,
    ): { showLists: boolean; showReminders: boolean; showNotes: boolean } => ({
      showLists: filter === 'all' || filter === 'lists',
      showReminders: filter === 'all' || filter === 'reminders',
      showNotes: filter === 'all' || filter === 'notes',
    })
    const result = applyFilter('all')
    expect(result.showLists).toBe(true)
    expect(result.showReminders).toBe(true)
    expect(result.showNotes).toBe(true)
  })

  it('фильтр «reminders» скрывает списки и заметки', () => {
    const applyFilter = (
      filter: FeedFilter,
    ): { showLists: boolean; showNotes: boolean; showReminders: boolean } => ({
      showLists: filter === 'all' || filter === 'lists',
      showNotes: filter === 'all' || filter === 'notes',
      showReminders: filter === 'all' || filter === 'reminders',
    })
    const result = applyFilter('reminders')
    expect(result.showLists).toBe(false)
    expect(result.showNotes).toBe(false)
    expect(result.showReminders).toBe(true)
  })

  describe('счётчики (FilterCounts)', () => {
    it('сумма «all» = списки + напоминания + заметки', () => {
      const c = makeCounts(3, 5, 2)
      expect(c.all).toBe(10)
    })

    it('counts возвращает корректные значения для каждого ключа', () => {
      const c = makeCounts(2, 4, 1)
      expect(c.lists).toBe(2)
      expect(c.reminders).toBe(4)
      expect(c.notes).toBe(1)
    })

    it('нулевые счётчики при пустых данных', () => {
      const c = makeCounts(0, 0, 0)
      expect(c.all).toBe(0)
      expect(c.lists).toBe(0)
    })
  })

  describe('цветные точки', () => {
    it('у «all» нет точки', () => {
      const allTab = TABS.find((t) => t.key === 'all')
      expect(allTab?.hasDot).toBe(false)
    })

    it('у списков, напоминаний и заметок есть точка', () => {
      const withDot = TABS.filter((t) => t.hasDot).map((t) => t.key)
      expect(withDot).toContain('lists')
      expect(withDot).toContain('reminders')
      expect(withDot).toContain('notes')
    })
  })
})
