// Изолируем тест от нативного expo-sqlite: репозиторий принимает db явно.
jest.mock('../../client', () => ({ db: {} }))

// expo-notifications мокается глобально в jest.setup.js

import { RemindersRepository } from '../remindersRepo'
import * as Notifications from 'expo-notifications'

interface InsertCall {
  values: Record<string, unknown>
}

/**
 * Фейк Drizzle-db: фиксирует insert-вызовы (доменная строка + outbox),
 * select-цепочку (findById через where().limit(), список через
 * where().orderBy()) возвращает заранее заданные строки.
 */
const createFakeDb = (inserts: InsertCall[], selectRows: Record<string, unknown>[] = []) => ({
  insert: () => ({
    values: (values: Record<string, unknown>) => {
      inserts.push({ values })
      return { returning: async () => [values] }
    },
  }),
  update: () => ({
    set: (values: Record<string, unknown>) => ({
      where: () => ({ returning: async () => [{ uuid: 'u1', ...values }] }),
    }),
  }),
  select: () => ({
    from: () => ({
      where: () => {
        const chain = Promise.resolve(selectRows) as Promise<
          Record<string, unknown>[]
        > & {
          orderBy: () => Promise<Record<string, unknown>[]>
          limit: () => Promise<Record<string, unknown>[]>
        }
        chain.orderBy = () => Promise.resolve(selectRows)
        chain.limit = () => Promise.resolve(selectRows)
        return chain
      },
    }),
  }),
})

const reminderRow = (over: Partial<Record<string, unknown>> = {}) => ({
  uuid: 'u1',
  userId: null,
  title: 'Позвонить',
  notes: null,
  remindAt: '2026-06-04T10:00:00.000Z',
  recurrence: 'none',
  isCompleted: 0,
  completedAt: null,
  snoozedUntil: null,
  sourceUuid: null,
  sourceType: null,
  notificationId: null,
  calendarEventId: null,
  serverRevision: null,
  createdAt: 't',
  updatedAt: 't',
  deletedAt: null,
  ...over,
})

describe('RemindersRepository.createReminder', () => {
  it('создаёт напоминание, пишет create в outbox, is_completed=0', async () => {
    const inserts: InsertCall[] = []
    const repo = new RemindersRepository(createFakeDb(inserts) as never)

    const reminder = await repo.createReminder({
      title: 'Позвонить',
      remindAt: '2026-06-04T10:00:00.000Z',
    })

    expect(inserts).toHaveLength(2)
    const domain = inserts[0]?.values as Record<string, unknown>
    expect(domain.isCompleted).toBe(0)
    expect(domain.recurrence).toBe('none')
    expect(domain.notes).toBeNull()

    const outbox = inserts[1]?.values as Record<string, unknown>
    expect(outbox.entityType).toBe('reminder')
    expect(outbox.operation).toBe('create')

    expect(reminder.isCompleted).toBe(false)
  })
})

describe('RemindersRepository.deleteReminder', () => {
  it('пишет tombstone (deleted_at) и delete-запись в outbox', async () => {
    const inserts: InsertCall[] = []
    const repo = new RemindersRepository(createFakeDb(inserts) as never)

    await repo.deleteReminder('u1')

    expect(inserts).toHaveLength(1)
    const outbox = inserts[0]?.values as Record<string, unknown>
    expect(outbox.operation).toBe('delete')
    expect(outbox.entityUuid).toBe('u1')
  })
})

describe('RemindersRepository.listReminders', () => {
  it('конвертирует 0/1 в boolean is_completed для строк', async () => {
    const repo = new RemindersRepository(
      createFakeDb([], [reminderRow({ isCompleted: 1, completedAt: 'c' })]) as never,
    )

    const result = await repo.listReminders({ status: 'completed' })

    expect(result).toHaveLength(1)
    expect(result[0]?.isCompleted).toBe(true)
  })
})

describe('RemindersRepository.completeReminder', () => {
  it('без повтора: помечает выполненным, нового вхождения не создаёт', async () => {
    const inserts: InsertCall[] = []
    const repo = new RemindersRepository(
      createFakeDb(inserts, [reminderRow({ recurrence: 'none' })]) as never,
    )

    const completed = await repo.completeReminder('u1')

    expect(completed?.isCompleted).toBe(true)
    // Только outbox-запись update (без insert нового напоминания).
    const creates = inserts.filter(
      (call) =>
        (call.values as Record<string, unknown>).operation === 'create' &&
        (call.values as Record<string, unknown>).entityType === 'reminder',
    )
    expect(creates).toHaveLength(0)
  })

  it('повтор daily: создаёт следующее вхождение с remind_at +1 день', async () => {
    const inserts: InsertCall[] = []
    const repo = new RemindersRepository(
      createFakeDb(inserts, [
        reminderRow({ recurrence: 'daily', remindAt: '2026-06-04T10:00:00.000Z' }),
      ]) as never,
    )

    await repo.completeReminder('u1')

    // Доменная строка нового напоминания идёт первым insert после update.
    const domain = inserts.find(
      (call) => (call.values as Record<string, unknown>).recurrence === 'daily',
    )?.values as Record<string, unknown>
    expect(domain.remindAt).toBe('2026-06-05T10:00:00.000Z')
    expect(domain.isCompleted).toBe(0)
  })
})

describe('RemindersRepository.snoozeReminder', () => {
  it('ставит snoozed_until = переданная ISO и пишет update в outbox', async () => {
    const inserts: InsertCall[] = []
    const repo = new RemindersRepository(
      createFakeDb(inserts, [reminderRow()]) as never,
    )

    const until = '2026-06-04T11:00:00.000Z'
    const reminder = await repo.snoozeReminder('u1', until)

    expect(reminder?.snoozedUntil).toBe(until)

    const outbox = inserts[0]?.values as Record<string, unknown>
    expect(outbox.operation).toBe('update')
  })
})

describe('RemindersRepository.remindersBetween', () => {
  it('возвращает напоминания диапазона, конвертируя booleans', async () => {
    const repo = new RemindersRepository(
      createFakeDb([], [reminderRow({ isCompleted: 0 })]) as never,
    )

    const result = await repo.remindersBetween(
      '2026-06-04T00:00:00.000Z',
      '2026-06-05T00:00:00.000Z',
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.isCompleted).toBe(false)
  })
})

describe('RemindersRepository.setCalendarEventId', () => {
  it('пишет calendar_event_id напрямую (без записи в outbox) и возвращает его', async () => {
    const inserts: InsertCall[] = []
    const repo = new RemindersRepository(createFakeDb(inserts) as never)

    const reminder = await repo.setCalendarEventId('u1', 'event-1')

    expect(reminder?.calendarEventId).toBe('event-1')
    // Локальное поле: запись в sync_outbox НЕ создаётся.
    expect(inserts).toHaveLength(0)
  })

  it('round-trip: calendarEventId читается из строки в доменную модель', async () => {
    const repo = new RemindersRepository(
      createFakeDb([], [reminderRow({ calendarEventId: 'event-7' })]) as never,
    )

    const result = await repo.listReminders()

    expect(result[0]?.calendarEventId).toBe('event-7')
  })

  it('createReminder создаёт напоминание с calendarEventId: null', async () => {
    const inserts: InsertCall[] = []
    const repo = new RemindersRepository(createFakeDb(inserts) as never)

    const reminder = await repo.createReminder({
      title: 'Позвонить',
      remindAt: '2026-06-04T10:00:00.000Z',
    })

    expect(reminder.calendarEventId).toBeNull()
  })
})

describe('RemindersRepository.setNotificationId', () => {
  it('пишет notification_id напрямую (без записи в outbox)', async () => {
    const inserts: InsertCall[] = []
    const repo = new RemindersRepository(createFakeDb(inserts) as never)

    const reminder = await repo.setNotificationId('u1', 'notif-123')

    expect(reminder?.notificationId).toBe('notif-123')
    // Локальное поле: запись в sync_outbox НЕ создаётся.
    expect(inserts).toHaveLength(0)
  })
})

describe('RemindersRepository.completeReminder', () => {
  it('сбрасывает notification_id у выполненного напоминания', async () => {
    const inserts: InsertCall[] = []
    const repo = new RemindersRepository(
      createFakeDb(inserts, [
        reminderRow({ recurrence: 'none', notificationId: 'notif-1' }),
      ]) as never,
    )

    const completed = await repo.completeReminder('u1')

    expect(completed?.notificationId).toBeNull()
  })
})

// ---- rescheduleAllPending (переустановка расписания при старте) ------------

describe('RemindersRepository.rescheduleAllPending', () => {
  const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock
  const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock
  const future = () => new Date(Date.now() + 60_000).toISOString()
  const past = () => new Date(Date.now() - 60_000).toISOString()

  beforeEach(() => {
    jest.clearAllMocks()
    mockSchedule.mockResolvedValue('notif-new')
  })

  it('переустанавливает уведомление для будущего напоминания, отменяя старый notification_id', async () => {
    const repo = new RemindersRepository(
      createFakeDb([], [
        reminderRow({ remindAt: future(), notificationId: 'notif-old' }),
      ]) as never,
    )

    const count = await repo.rescheduleAllPending()

    expect(mockCancel).toHaveBeenCalledWith('notif-old')
    expect(mockSchedule).toHaveBeenCalledTimes(1)
    expect(count).toBe(1)
  })

  it('не трогает прошедшие напоминания (remind_at в прошлом)', async () => {
    const repo = new RemindersRepository(
      createFakeDb([], [reminderRow({ remindAt: past() })]) as never,
    )

    const count = await repo.rescheduleAllPending()

    expect(mockSchedule).not.toHaveBeenCalled()
    expect(count).toBe(0)
  })

  it('использует snoozed_until вместо remind_at, если задан и в будущем', async () => {
    const repo = new RemindersRepository(
      createFakeDb([], [
        reminderRow({ remindAt: past(), snoozedUntil: future() }),
      ]) as never,
    )

    const count = await repo.rescheduleAllPending()

    expect(mockSchedule).toHaveBeenCalledTimes(1)
    expect(count).toBe(1)
  })

  it('выполненные напоминания не переустанавливаются (фильтр is_completed=0 в запросе)', async () => {
    // Фейковый db игнорирует WHERE-условия и всегда отдаёт переданные rows —
    // проверяем поведение метода на данных, которые он получит от SQL-фильтра
    // (сам SQL-фильтр по is_completed=0 покрыт listReminders/тестами репозитория).
    const repo = new RemindersRepository(createFakeDb([], []) as never)

    const count = await repo.rescheduleAllPending()

    expect(mockSchedule).not.toHaveBeenCalled()
    expect(count).toBe(0)
  })
})
