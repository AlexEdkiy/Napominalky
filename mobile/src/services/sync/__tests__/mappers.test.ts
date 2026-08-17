import { mappers } from '../mappers'
import type {
  ServerNote,
  ServerReminder,
  ServerShoppingList,
  ServerShoppingListItem,
  ServerShoppingListItemComment,
} from '@/types/sync'

const baseList: ServerShoppingList = {
  uuid: 'l1',
  title: 'Test list',
  type: 'goods',
  tags: null,
  status: 'new',
  status_is_manual: false,
  is_completed: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  deleted_at: null,
}

const baseItem: ServerShoppingListItem = {
  uuid: 'i1',
  shopping_list_uuid: 'l1',
  name: 'Item',
  category: 'products',
  quantity: 1,
  deadline: null,
  reminder_at: null,
  link: null,
  comment: null,
  tags: null,
  is_checked: false,
  status: 'new',
  position: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  deleted_at: null,
}

const baseComment: ServerShoppingListItemComment = {
  uuid: 'c1',
  shopping_list_item_uuid: 'i1',
  author_name: 'Алексей',
  body: 'Взять свежее',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  deleted_at: null,
}

const baseNote: ServerNote = {
  uuid: 'n1',
  title: 'Заметка',
  body: null,
  color: null,
  is_pinned: false,
  is_archived: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  deleted_at: null,
}

const baseReminder: ServerReminder = {
  uuid: 'rem1',
  title: 'Напомнить',
  notes: null,
  remind_at: '2024-06-01T10:00:00Z',
  recurrence: 'none',
  is_completed: false,
  completed_at: null,
  snoozed_until: null,
  source_uuid: null,
  source_type: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  deleted_at: null,
}

describe('shoppingListMapper', () => {
  it('маппит тип goods из сервера', () => {
    const row = mappers.shopping_list.toRow(baseList)
    expect(row.type).toBe('goods')
  })

  it('маппит тип tasks из сервера', () => {
    const row = mappers.shopping_list.toRow({ ...baseList, type: 'tasks' })
    expect(row.type).toBe('tasks')
  })

  it('подставляет goods если type отсутствует (null/undefined)', () => {
    const serverWithoutType = { ...baseList, type: undefined } as unknown as ServerShoppingList
    const row = mappers.shopping_list.toRow(serverWithoutType)
    expect(row.type).toBe('goods')
  })

  it('маппит title, uuid, даты', () => {
    const row = mappers.shopping_list.toRow(baseList)
    expect(row.uuid).toBe('l1')
    expect(row.title).toBe('Test list')
    expect(row.createdAt).toBe('2024-01-01T00:00:00Z')
    expect(row.updatedAt).toBe('2024-01-02T00:00:00Z')
    expect(row.deletedAt).toBeNull()
  })
})

describe('shoppingListItemMapper', () => {
  it('маппит quantity из сервера', () => {
    const row = mappers.shopping_list_item.toRow({ ...baseItem, quantity: 5 })
    expect(row.quantity).toBe(5)
  })

  it('подставляет quantity=1 если отсутствует', () => {
    const serverWithout = { ...baseItem, quantity: undefined } as unknown as ServerShoppingListItem
    const row = mappers.shopping_list_item.toRow(serverWithout)
    expect(row.quantity).toBe(1)
  })

  it('маппит deadline из сервера', () => {
    const row = mappers.shopping_list_item.toRow({ ...baseItem, deadline: '2024-12-31' })
    expect(row.deadline).toBe('2024-12-31')
  })

  it('маппит deadline=null если отсутствует', () => {
    const row = mappers.shopping_list_item.toRow(baseItem)
    expect(row.deadline).toBeNull()
  })

  it('конвертирует is_checked true → 1', () => {
    const row = mappers.shopping_list_item.toRow({ ...baseItem, is_checked: true })
    expect(row.isChecked).toBe(1)
  })

  it('конвертирует is_checked false → 0', () => {
    const row = mappers.shopping_list_item.toRow(baseItem)
    expect(row.isChecked).toBe(0)
  })

  it('маппит shopping_list_uuid, name, category, position', () => {
    const row = mappers.shopping_list_item.toRow(baseItem)
    expect(row.shoppingListUuid).toBe('l1')
    expect(row.name).toBe('Item')
    expect(row.category).toBe('products')
    expect(row.position).toBe(0)
  })

  it('маппит reminder_at (напоминание пункта) из сервера', () => {
    const row = mappers.shopping_list_item.toRow({
      ...baseItem,
      reminder_at: '2026-07-01T18:00:00.000Z',
    })
    expect(row.reminderAt).toBe('2026-07-01T18:00:00.000Z')
  })

  it('маппит reminder_at=null если отсутствует (регресс: раньше поле терялось при sync)', () => {
    const row = mappers.shopping_list_item.toRow(baseItem)
    expect(row.reminderAt).toBeNull()
  })

  it('маппит link, comment, tags из сервера', () => {
    const row = mappers.shopping_list_item.toRow({
      ...baseItem,
      link: 'https://example.com',
      comment: 'Не забыть',
      tags: '["обувь"]',
    })
    expect(row.link).toBe('https://example.com')
    expect(row.comment).toBe('Не забыть')
    expect(row.tags).toBe('["обувь"]')
  })
})

describe('shoppingListItemMapper — NOT NULL фолбэки', () => {
  it('подставляет name="" при null/undefined', () => {
    const s = { ...baseItem, name: undefined } as unknown as ServerShoppingListItem
    expect(mappers.shopping_list_item.toRow(s).name).toBe('')
  })

  it('подставляет category="other" при null/undefined', () => {
    const s = { ...baseItem, category: undefined } as unknown as ServerShoppingListItem
    expect(mappers.shopping_list_item.toRow(s).category).toBe('other')
  })

  it('подставляет position=0 при null/undefined', () => {
    const s = { ...baseItem, position: undefined } as unknown as ServerShoppingListItem
    expect(mappers.shopping_list_item.toRow(s).position).toBe(0)
  })
})

describe('shoppingListMapper — NOT NULL фолбэки', () => {
  it('подставляет title="" при null/undefined', () => {
    const s = { ...baseList, title: undefined } as unknown as ServerShoppingList
    expect(mappers.shopping_list.toRow(s).title).toBe('')
  })
})

describe('noteMapper — NOT NULL фолбэки', () => {
  it('подставляет title="" при null/undefined', () => {
    const s = { ...baseNote, title: undefined } as unknown as ServerNote
    expect(mappers.note.toRow(s).title).toBe('')
  })
})

describe('reminderMapper — NOT NULL фолбэки', () => {
  it('подставляет title="" при null/undefined', () => {
    const s = { ...baseReminder, title: undefined } as unknown as ServerReminder
    expect(mappers.reminder.toRow(s).title).toBe('')
  })

  it('подставляет recurrence="none" при null/undefined', () => {
    const s = { ...baseReminder, recurrence: undefined } as unknown as ServerReminder
    expect(mappers.reminder.toRow(s).recurrence).toBe('none')
  })

  it('использует remind_at если задан', () => {
    const row = mappers.reminder.toRow(baseReminder)
    expect(row.remindAt).toBe('2024-06-01T10:00:00Z')
  })

  it('фолбэк remindAt = updated_at когда remind_at отсутствует', () => {
    const s = {
      ...baseReminder,
      remind_at: undefined,
    } as unknown as ServerReminder
    expect(mappers.reminder.toRow(s).remindAt).toBe('2024-01-02T00:00:00Z')
  })
})

describe('createdAt фолбэк = updated_at при null created_at (сервер не заполняет created_at)', () => {
  it('note', () => {
    const s = { ...baseNote, created_at: null } as unknown as ServerNote
    expect(mappers.note.toRow(s).createdAt).toBe('2024-01-02T00:00:00Z')
  })
  it('shopping_list', () => {
    const s = { ...baseList, created_at: null } as unknown as ServerShoppingList
    expect(mappers.shopping_list.toRow(s).createdAt).toBe('2024-01-02T00:00:00Z')
  })
  it('shopping_list_item', () => {
    const s = { ...baseItem, created_at: null } as unknown as ServerShoppingListItem
    expect(mappers.shopping_list_item.toRow(s).createdAt).toBe('2024-01-02T00:00:00Z')
  })
  it('reminder', () => {
    const s = { ...baseReminder, created_at: null } as unknown as ServerReminder
    expect(mappers.reminder.toRow(s).createdAt).toBe('2024-01-02T00:00:00Z')
  })
})

describe('shoppingListMapper — статусы задач (status/status_is_manual/is_completed)', () => {
  it('маппит status и булевы поля true → 1', () => {
    const row = mappers.shopping_list.toRow({
      ...baseList,
      type: 'tasks',
      status: 'in_progress',
      status_is_manual: true,
      is_completed: false,
    })
    expect(row.status).toBe('in_progress')
    expect(row.statusIsManual).toBe(1)
    expect(row.isCompleted).toBe(0)
  })

  it('маппит done + is_completed=true → 1 (инвариант с сервера)', () => {
    const row = mappers.shopping_list.toRow({
      ...baseList,
      status: 'done',
      status_is_manual: false,
      is_completed: true,
    })
    expect(row.status).toBe('done')
    expect(row.statusIsManual).toBe(0)
    expect(row.isCompleted).toBe(1)
  })

  it('нормализует невалидный/отсутствующий status → new, булевы → 0', () => {
    const s = {
      ...baseList,
      status: undefined,
      status_is_manual: undefined,
      is_completed: undefined,
    } as unknown as ServerShoppingList
    const row = mappers.shopping_list.toRow(s)
    expect(row.status).toBe('new')
    expect(row.statusIsManual).toBe(0)
    expect(row.isCompleted).toBe(0)
    expect(mappers.shopping_list.toRow({ ...baseList, status: 'bogus' }).status).toBe('new')
  })
})

describe('shoppingListItemMapper — статус пункта', () => {
  it('маппит каждый валидный статус как есть', () => {
    for (const status of ['new', 'in_progress', 'postponed', 'done']) {
      const row = mappers.shopping_list_item.toRow({ ...baseItem, status })
      expect(row.status).toBe(status)
    }
  })

  it('нормализует невалидный/отсутствующий status → new', () => {
    const s = { ...baseItem, status: undefined } as unknown as ServerShoppingListItem
    expect(mappers.shopping_list_item.toRow(s).status).toBe('new')
    expect(mappers.shopping_list_item.toRow({ ...baseItem, status: 'x' }).status).toBe('new')
  })

  it('toRow пункта не содержит notificationId — pull не затирает локальное поле', () => {
    const row = mappers.shopping_list_item.toRow(baseItem)
    expect(row).not.toHaveProperty('notificationId')
    expect(row).not.toHaveProperty('notification_id')
  })
})

describe('reminderMapper — локальные поля не попадают в sync', () => {
  it('toRow не содержит notificationId/calendarEventId — pull не затирает локальные поля', () => {
    const row = mappers.reminder.toRow(baseReminder)
    expect(row).not.toHaveProperty('notificationId')
    expect(row).not.toHaveProperty('notification_id')
    expect(row).not.toHaveProperty('calendarEventId')
    expect(row).not.toHaveProperty('calendar_event_id')
  })
})

describe('shoppingListItemCommentMapper — комментарий-тред пункта (round-trip pull)', () => {
  it('маппит все поля контракта в строку локальной схемы', () => {
    const row = mappers.shopping_list_item_comment.toRow(baseComment)
    expect(row.uuid).toBe('c1')
    expect(row.shoppingListItemUuid).toBe('i1')
    expect(row.authorName).toBe('Алексей')
    expect(row.body).toBe('Взять свежее')
    expect(row.createdAt).toBe('2024-01-01T00:00:00Z')
    expect(row.updatedAt).toBe('2024-01-02T00:00:00Z')
    expect(row.deletedAt).toBeNull()
  })

  it('переносит tombstone deleted_at', () => {
    const row = mappers.shopping_list_item_comment.toRow({
      ...baseComment,
      deleted_at: '2024-02-01T00:00:00Z',
    })
    expect(row.deletedAt).toBe('2024-02-01T00:00:00Z')
  })

  it('NOT NULL фолбэки: author_name/body → "" при null/undefined', () => {
    const s = {
      ...baseComment,
      author_name: undefined,
      body: undefined,
    } as unknown as ServerShoppingListItemComment
    const row = mappers.shopping_list_item_comment.toRow(s)
    expect(row.authorName).toBe('')
    expect(row.body).toBe('')
  })

  it('createdAt фолбэк = updated_at при null created_at', () => {
    const s = { ...baseComment, created_at: null } as unknown as ServerShoppingListItemComment
    expect(mappers.shopping_list_item_comment.toRow(s).createdAt).toBe('2024-01-02T00:00:00Z')
  })

  it('целевая таблица маппера — shopping_list_item_comments', () => {
    expect(mappers.shopping_list_item_comment.table).toBeDefined()
  })
})
