import {
  inOneHour,
  thisEvening,
  tomorrow,
  tomorrowMorning,
} from '../quickTime'

// Базовая дата в локальном времени среды исполнения: 2026-06-04 14:30.
const base = new Date(2026, 5, 4, 14, 30, 0, 0)

describe('inOneHour', () => {
  it('добавляет ровно один час к базовой дате', () => {
    const result = new Date(inOneHour(base))
    const expected = new Date(base.getTime())
    expected.setHours(expected.getHours() + 1)
    expect(result.getTime()).toBe(expected.getTime())
  })

  it('не мутирует базовую дату', () => {
    inOneHour(base)
    expect(base.getHours()).toBe(14)
  })
})

describe('thisEvening', () => {
  it('возвращает 18:00 того же дня', () => {
    const result = new Date(thisEvening(base))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(5)
    expect(result.getDate()).toBe(4)
    expect(result.getHours()).toBe(18)
    expect(result.getMinutes()).toBe(0)
  })
})

describe('tomorrowMorning', () => {
  it('возвращает 09:00 следующего дня', () => {
    const result = new Date(tomorrowMorning(base))
    expect(result.getDate()).toBe(5)
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(0)
  })
})

describe('tomorrow', () => {
  it('возвращает то же время на следующий день', () => {
    const result = new Date(tomorrow(base))
    expect(result.getDate()).toBe(5)
    expect(result.getHours()).toBe(14)
    expect(result.getMinutes()).toBe(30)
  })
})
