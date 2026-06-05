import * as Notifications from 'expo-notifications'
import {
  cancelReminder,
  configureNotificationHandler,
  rescheduleReminder,
  scheduleReminder,
} from '../notifications'

const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock
const mockSetHandler = Notifications.setNotificationHandler as jest.Mock

const future = (): string => new Date(Date.now() + 60_000).toISOString()
const past = (): string => new Date(Date.now() - 60_000).toISOString()

beforeEach(() => {
  jest.clearAllMocks()
  mockSchedule.mockResolvedValue('notif-1')
})

describe('scheduleReminder', () => {
  it('планирует уведомление на будущую дату с data{type,uuid}', async () => {
    const id = await scheduleReminder({
      uuid: 'u1',
      title: 'Звонок',
      notes: 'детали',
      remind_at: future(),
    })

    expect(id).toBe('notif-1')
    const arg = mockSchedule.mock.calls[0]?.[0]
    expect(arg.content.data).toEqual({ type: 'reminder', uuid: 'u1' })
    expect(arg.content.title).toBe('Звонок')
    expect(arg.content.body).toBe('детали')
    expect(arg.trigger.type).toBe('date')
    expect(arg.trigger.date).toBeInstanceOf(Date)
  })

  it('прошедшую дату не планирует, возвращает null', async () => {
    const id = await scheduleReminder({
      uuid: 'u1',
      title: 'Звонок',
      remind_at: past(),
    })

    expect(id).toBeNull()
    expect(mockSchedule).not.toHaveBeenCalled()
  })

  it('snoozed_until приоритетнее remind_at при выборе даты', async () => {
    const snoozed = future()
    await scheduleReminder({
      uuid: 'u1',
      title: 'Звонок',
      remind_at: past(),
      snoozed_until: snoozed,
    })

    const arg = mockSchedule.mock.calls[0]?.[0]
    expect((arg.trigger.date as Date).toISOString()).toBe(snoozed)
  })

  it('пустые notes дают пустой body', async () => {
    await scheduleReminder({ uuid: 'u1', title: 'T', remind_at: future() })
    expect(mockSchedule.mock.calls[0]?.[0].content.body).toBe('')
  })
})

describe('cancelReminder', () => {
  it('отменяет по id', async () => {
    await cancelReminder('notif-1')
    expect(mockCancel).toHaveBeenCalledWith('notif-1')
  })

  it('null id — ничего не делает', async () => {
    await cancelReminder(null)
    expect(mockCancel).not.toHaveBeenCalled()
  })

  it('проглатывает ошибку отмены (id уже сработал)', async () => {
    mockCancel.mockRejectedValueOnce(new Error('not found'))
    await expect(cancelReminder('gone')).resolves.toBeUndefined()
  })
})

describe('rescheduleReminder', () => {
  it('отменяет старое и планирует новое', async () => {
    const id = await rescheduleReminder(
      { uuid: 'u1', title: 'T', remind_at: future() },
      'old-id',
    )

    expect(mockCancel).toHaveBeenCalledWith('old-id')
    expect(mockSchedule).toHaveBeenCalled()
    expect(id).toBe('notif-1')
  })
})

describe('configureNotificationHandler', () => {
  it('идемпотентен: повторные вызовы не дублируют setNotificationHandler', () => {
    configureNotificationHandler()
    configureNotificationHandler()
    expect(mockSetHandler).toHaveBeenCalledTimes(1)
  })
})
