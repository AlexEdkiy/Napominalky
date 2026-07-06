import { pluralizeEvents } from '../pluralize'

describe('pluralizeEvents', () => {
  it('1 → «1 событие»', () => {
    expect(pluralizeEvents(1)).toBe('1 событие')
  })

  it('2, 3, 4 → «N события»', () => {
    expect(pluralizeEvents(2)).toBe('2 события')
    expect(pluralizeEvents(3)).toBe('3 события')
    expect(pluralizeEvents(4)).toBe('4 события')
  })

  it('0, 5 → «N событий»', () => {
    expect(pluralizeEvents(0)).toBe('0 событий')
    expect(pluralizeEvents(5)).toBe('5 событий')
  })

  it('11-14 → «N событий» (исключение из общего правила)', () => {
    expect(pluralizeEvents(11)).toBe('11 событий')
    expect(pluralizeEvents(12)).toBe('12 событий')
    expect(pluralizeEvents(14)).toBe('14 событий')
  })

  it('21 → «21 событие» (последняя цифра 1, но не 11)', () => {
    expect(pluralizeEvents(21)).toBe('21 событие')
  })

  it('22 → «22 события»', () => {
    expect(pluralizeEvents(22)).toBe('22 события')
  })
})
