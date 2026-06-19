import { toSnakeCase, toSnakeCaseKeys } from '../snakeCase'

describe('toSnakeCase', () => {
  it('converts single camelCase word', () => {
    expect(toSnakeCase('isPinned')).toBe('is_pinned')
  })

  it('converts multi-word camelCase', () => {
    expect(toSnakeCase('shoppingListUuid')).toBe('shopping_list_uuid')
  })

  it('leaves already snake_case string unchanged', () => {
    expect(toSnakeCase('title')).toBe('title')
    expect(toSnakeCase('uuid')).toBe('uuid')
  })

  it('converts isCompleted → is_completed', () => {
    expect(toSnakeCase('isCompleted')).toBe('is_completed')
  })

  it('converts remindAt → remind_at', () => {
    expect(toSnakeCase('remindAt')).toBe('remind_at')
  })

  it('converts snoozedUntil → snoozed_until', () => {
    expect(toSnakeCase('snoozedUntil')).toBe('snoozed_until')
  })

  it('converts completedAt → completed_at', () => {
    expect(toSnakeCase('completedAt')).toBe('completed_at')
  })

  it('converts sourceUuid → source_uuid', () => {
    expect(toSnakeCase('sourceUuid')).toBe('source_uuid')
  })

  it('converts sourceType → source_type', () => {
    expect(toSnakeCase('sourceType')).toBe('source_type')
  })

  it('converts isChecked → is_checked', () => {
    expect(toSnakeCase('isChecked')).toBe('is_checked')
  })

  it('converts isArchived → is_archived', () => {
    expect(toSnakeCase('isArchived')).toBe('is_archived')
  })
})

describe('toSnakeCaseKeys — note payload', () => {
  it('converts all note camelCase keys to snake_case, preserving 0/1 values', () => {
    const row = {
      uuid: 'note-uuid',
      userId: 'user-1',
      title: 'My note',
      body: 'Some body',
      isPinned: 1,
      isArchived: 0,
      serverRevision: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      deletedAt: null,
    }

    const result = toSnakeCaseKeys(row)

    expect(result).toMatchObject({
      uuid: 'note-uuid',
      user_id: 'user-1',
      title: 'My note',
      body: 'Some body',
      is_pinned: 1,
      is_archived: 0,
      server_revision: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      deleted_at: null,
    })
  })

  it('does NOT contain camelCase keys in note payload', () => {
    const row = { isPinned: 1, isArchived: 0, userId: 'u1', createdAt: 'ts', updatedAt: 'ts' }
    const result = toSnakeCaseKeys(row)
    expect(Object.keys(result)).not.toContain('isPinned')
    expect(Object.keys(result)).not.toContain('isArchived')
    expect(Object.keys(result)).not.toContain('userId')
    expect(Object.keys(result)).not.toContain('createdAt')
    expect(Object.keys(result)).not.toContain('updatedAt')
  })
})

describe('toSnakeCaseKeys — shopping_list_item payload', () => {
  it('converts shopping_list_item keys including shoppingListUuid and isChecked', () => {
    const row = {
      uuid: 'item-uuid',
      shoppingListUuid: 'list-uuid',
      userId: 'user-1',
      name: 'Bread',
      category: 'products',
      isChecked: 0,
      position: 2,
      serverRevision: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      deletedAt: null,
    }

    const result = toSnakeCaseKeys(row)

    expect(result['uuid']).toBe('item-uuid')
    expect(result['shopping_list_uuid']).toBe('list-uuid')
    expect(result['is_checked']).toBe(0)
    expect(result['name']).toBe('Bread')
    expect(result['category']).toBe('products')
    expect(result['position']).toBe(2)
  })

  it('does NOT contain shoppingListUuid or isChecked (camelCase) keys', () => {
    const row = { shoppingListUuid: 'l1', isChecked: 0, userId: 'u1' }
    const result = toSnakeCaseKeys(row)
    expect(Object.keys(result)).not.toContain('shoppingListUuid')
    expect(Object.keys(result)).not.toContain('isChecked')
    expect(Object.keys(result)).not.toContain('userId')
  })
})

describe('toSnakeCaseKeys — reminder payload', () => {
  it('converts all reminder camelCase keys to snake_case', () => {
    const row = {
      uuid: 'rem-uuid',
      userId: 'user-1',
      title: 'Call doctor',
      notes: 'Urgent',
      remindAt: '2026-06-10T09:00:00Z',
      recurrence: 'none',
      isCompleted: 0,
      completedAt: null,
      snoozedUntil: null,
      sourceUuid: null,
      sourceType: null,
      notificationId: 'notif-1',
      serverRevision: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      deletedAt: null,
    }

    const result = toSnakeCaseKeys(row)

    expect(result['remind_at']).toBe('2026-06-10T09:00:00Z')
    expect(result['is_completed']).toBe(0)
    expect(result['completed_at']).toBeNull()
    expect(result['snoozed_until']).toBeNull()
    expect(result['source_uuid']).toBeNull()
    expect(result['source_type']).toBeNull()
    expect(result['notification_id']).toBe('notif-1')
  })

  it('does NOT contain camelCase reminder keys', () => {
    const row = {
      remindAt: 'ts',
      isCompleted: 0,
      completedAt: null,
      snoozedUntil: null,
      sourceUuid: null,
      sourceType: null,
      notificationId: null,
    }
    const result = toSnakeCaseKeys(row)
    const camelKeys = ['remindAt', 'isCompleted', 'completedAt', 'snoozedUntil',
      'sourceUuid', 'sourceType', 'notificationId']
    for (const key of camelKeys) {
      expect(Object.keys(result)).not.toContain(key)
    }
  })
})

describe('toSnakeCaseKeys — value preservation', () => {
  it('preserves 0/1 integer booleans without casting', () => {
    const result = toSnakeCaseKeys({ isChecked: 0, isPinned: 1 })
    expect(result['is_checked']).toBe(0)
    expect(result['is_pinned']).toBe(1)
  })

  it('preserves null values', () => {
    const result = toSnakeCaseKeys({ deletedAt: null, completedAt: null })
    expect(result['deleted_at']).toBeNull()
    expect(result['completed_at']).toBeNull()
  })

  it('preserves string values', () => {
    const result = toSnakeCaseKeys({ remindAt: '2026-06-10T09:00:00Z' })
    expect(result['remind_at']).toBe('2026-06-10T09:00:00Z')
  })
})
