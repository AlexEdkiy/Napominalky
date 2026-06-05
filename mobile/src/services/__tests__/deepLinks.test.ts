import { parseNotificationData, reminderRoute } from '../deepLinks'

describe('parseNotificationData', () => {
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

  it('неверный type → null', () => {
    expect(parseNotificationData({ type: 'list', uuid: 'u1' })).toBeNull()
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
