import type { FeedFilter } from '../FilterChips'

const CHIPS: { id: FeedFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'lists', label: 'Списки' },
  { id: 'reminders', label: 'Напоминания' },
  { id: 'notes', label: 'Заметки' },
]

describe('FilterChips — logic', () => {
  it('содержит все четыре варианта фильтра', () => {
    const ids = CHIPS.map((c) => c.id)
    expect(ids).toContain('all')
    expect(ids).toContain('lists')
    expect(ids).toContain('reminders')
    expect(ids).toContain('notes')
  })

  it('по умолчанию активен «all»', () => {
    const defaultFilter: FeedFilter = 'all'
    expect(defaultFilter).toBe('all')
  })

  it('активный чип совпадает только с выбранным id', () => {
    const isActive = (chip: FeedFilter, current: FeedFilter): boolean =>
      chip === current
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
})
