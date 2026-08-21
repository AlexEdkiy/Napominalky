/**
 * closeReminderMessage: для повторяющегося напоминания текст подтверждения
 * предупреждает о следующем вхождении (иначе закрытие выглядит как
 * «ничего не произошло» — карточка остаётся в списке с новой датой).
 */
import { Alert } from 'react-native'

import { closeReminderMessage, confirmCloseReminder } from '../confirmCloseReminder'
import { formatReminderChip } from '../datetime'

describe('closeReminderMessage', () => {
  it('без напоминания и для recurrence=none текста нет', () => {
    expect(closeReminderMessage()).toBeUndefined()
    expect(
      closeReminderMessage({ recurrence: 'none', remindAt: '2026-08-24T11:00:00.000Z' }),
    ).toBeUndefined()
  })

  it('для daily указывает дату следующего вхождения (+1 день)', () => {
    const message = closeReminderMessage({
      recurrence: 'daily',
      remindAt: '2026-08-24T11:00:00.000Z',
    })
    expect(message).toContain('повторяется')
    expect(message).toContain(formatReminderChip('2026-08-25T11:00:00.000Z'))
  })

  it('для weekly указывает дату +7 дней', () => {
    const message = closeReminderMessage({
      recurrence: 'weekly',
      remindAt: '2026-08-24T11:00:00.000Z',
    })
    expect(message).toContain(formatReminderChip('2026-08-31T11:00:00.000Z'))
  })
})

describe('confirmCloseReminder', () => {
  it('прокидывает текст следующего вхождения в Alert для повторяющегося', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    confirmCloseReminder(jest.fn(), { recurrence: 'daily', remindAt: '2026-08-24T11:00:00.000Z' })
    expect(alertSpy).toHaveBeenCalledWith(
      'Закрыть напоминание?',
      expect.stringContaining('появится следующее'),
      expect.any(Array),
    )
    alertSpy.mockRestore()
  })

  it('без повтора текст отсутствует (undefined), как раньше', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    confirmCloseReminder(jest.fn())
    expect(alertSpy).toHaveBeenCalledWith('Закрыть напоминание?', undefined, expect.any(Array))
    alertSpy.mockRestore()
  })
})
