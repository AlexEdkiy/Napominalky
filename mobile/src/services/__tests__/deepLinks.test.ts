import { listRoute, parseNotificationData, reminderRoute } from '../deepLinks'

describe('parseNotificationData — reminder', () => {
  it('валидный reminder с непустым uuid → типизированный объект', () => {
    expect(parseNotificationData({ type: 'reminder', uuid: 'u1' })).toEqual({
      type: 'reminder',
      uuid: 'u1',
    })
  })

  it('лишние поля игнорируются, возвращаются только type и uuid', () => {
    const result = parseNotificationData({
      type: 'reminder',
      uuid: 'u1',
      extra: 'ignored',
      nested: { a: 1 },
    })

    expect(result).toEqual({ type: 'reminder', uuid: 'u1' })
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['строка', 'reminder'],
    ['число', 42],
    ['массив', ['reminder']],
    ['boolean', true],
  ])('не-объект (%s) → null', (_label, value) => {
    expect(parseNotificationData(value)).toBeNull()
  })

  it('неизвестный type → null', () => {
    expect(parseNotificationData({ type: 'unknown', uuid: 'u1' })).toBeNull()
  })

  it('отсутствующий type → null', () => {
    expect(parseNotificationData({ uuid: 'u1' })).toBeNull()
  })

  it('нестроковый uuid → null', () => {
    expect(parseNotificationData({ type: 'reminder', uuid: 123 })).toBeNull()
  })

  it('пустой строковый uuid → null', () => {
    expect(parseNotificationData({ type: 'reminder', uuid: '' })).toBeNull()
  })

  it('отсутствующий uuid → null', () => {
    expect(parseNotificationData({ type: 'reminder' })).toBeNull()
  })
})

describe('parseNotificationData — list_item', () => {
  it('валидный list_item → ListItemDeepLink', () => {
    expect(
      parseNotificationData({ type: 'list_item', itemUuid: 'i1', listUuid: 'l1' }),
    ).toEqual({ type: 'list_item', itemUuid: 'i1', listUuid: 'l1' })
  })

  it('отсутствующий itemUuid → null', () => {
    expect(
      parseNotificationData({ type: 'list_item', listUuid: 'l1' }),
    ).toBeNull()
  })

  it('пустой itemUuid → null', () => {
    expect(
      parseNotificationData({ type: 'list_item', itemUuid: '', listUuid: 'l1' }),
    ).toBeNull()
  })

  it('отсутствующий listUuid → null', () => {
    expect(
      parseNotificationData({ type: 'list_item', itemUuid: 'i1' }),
    ).toBeNull()
  })

  it('пустой listUuid → null', () => {
    expect(
      parseNotificationData({ type: 'list_item', itemUuid: 'i1', listUuid: '' }),
    ).toBeNull()
  })

  it('нестроковый itemUuid → null', () => {
    expect(
      parseNotificationData({ type: 'list_item', itemUuid: 42, listUuid: 'l1' }),
    ).toBeNull()
  })

  it('data.type возвращается как list_item (discriminated union)', () => {
    const result = parseNotificationData({
      type: 'list_item',
      itemUuid: 'i1',
      listUuid: 'l1',
    })
    expect(result?.type).toBe('list_item')
  })
})

describe('reminderRoute', () => {
  it('строит путь экрана напоминания по uuid', () => {
    expect(reminderRoute('abc-123')).toBe('/reminders/abc-123')
  })

  it('подставляет uuid как есть', () => {
    expect(reminderRoute('00000000-0000-4000-8000-000000000000')).toBe(
      '/reminders/00000000-0000-4000-8000-000000000000',
    )
  })
})

describe('listRoute', () => {
  it('строит путь экрана списка по listUuid', () => {
    expect(listRoute('l1')).toBe('/lists/l1')
  })

  it('подставляет uuid как есть', () => {
    expect(listRoute('00000000-0000-4000-8000-000000000001')).toBe(
      '/lists/00000000-0000-4000-8000-000000000001',
    )
  })
})
