import { nextOccurrence } from '../recurrence'

describe('nextOccurrence', () => {
  const from = '2026-06-04T10:00:00.000Z'

  it('none → null (повторения нет)', () => {
    expect(nextOccurrence('none', from)).toBeNull()
  })

  it('daily → +1 день', () => {
    expect(nextOccurrence('daily', from)).toBe('2026-06-05T10:00:00.000Z')
  })

  it('weekly → +1 неделя', () => {
    expect(nextOccurrence('weekly', from)).toBe('2026-06-11T10:00:00.000Z')
  })

  it('monthly → +1 месяц', () => {
    expect(nextOccurrence('monthly', from)).toBe('2026-07-04T10:00:00.000Z')
  })

  it('monthly через границу года (декабрь → январь)', () => {
    expect(nextOccurrence('monthly', '2026-12-15T08:30:00.000Z')).toBe(
      '2027-01-15T08:30:00.000Z',
    )
  })

  it('не мутирует исходную дату (чистая функция)', () => {
    const input = '2026-06-04T10:00:00.000Z'
    nextOccurrence('daily', input)
    expect(input).toBe('2026-06-04T10:00:00.000Z')
  })
})
