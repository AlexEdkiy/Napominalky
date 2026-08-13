import { and, asc, between, eq, isNull, lt } from 'drizzle-orm'
import { db as defaultDb, type Database } from '../client'
import { reminders, type ReminderRow } from '../schema/reminders'
import { nextOccurrence, type RecurrenceType } from '../../utils/recurrence'
import { BaseRepository, type SyncTable } from './baseRepo'
import {
  cancelReminder,
  rescheduleReminder,
  scheduleReminder,
  type SchedulableReminder,
} from '../../services/notifications'

/** Доменное напоминание: boolean is_completed вместо 0/1. */
export interface Reminder {
  uuid: string
  userId: string | null
  title: string
  notes: string | null
  remindAt: string
  recurrence: RecurrenceType
  isCompleted: boolean
  completedAt: string | null
  snoozedUntil: string | null
  sourceUuid: string | null
  sourceType: string | null
  /** Локальный id запланированного уведомления (не синхронизируется). */
  notificationId: string | null
  /** Локальный id события системного календаря после экспорта (не синхронизируется). */
  calendarEventId: string | null
  serverRevision: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/** Данные для создания напоминания (sync-поля проставит baseRepo). */
export interface CreateReminderData {
  title: string
  remindAt: string
  notes?: string | null
  recurrence?: RecurrenceType
  userId?: string | null
  sourceUuid?: string | null
  sourceType?: string | null
}

/** Частичное обновление доменных полей напоминания. */
export type UpdateReminderPatch = Partial<
  Pick<
    CreateReminderData,
    'title' | 'remindAt' | 'notes' | 'recurrence' | 'userId'
  >
>

/** Статус для фильтрации списка напоминаний. */
export type ReminderStatus = 'pending' | 'completed' | 'all'

interface ListRemindersOptions {
  status?: ReminderStatus
}

const bool = (value: number): boolean => value === 1
const flag = (value: boolean): number => (value ? 1 : 0)

const nowIso = (): string => new Date().toISOString()

/** Доменное напоминание → набор полей для планировщика уведомлений. */
const toSchedulable = (reminder: Reminder): SchedulableReminder => ({
  uuid: reminder.uuid,
  title: reminder.title,
  notes: reminder.notes,
  remind_at: reminder.remindAt,
  snoozed_until: reminder.snoozedUntil,
})

/** Преобразует строку SQLite (0/1) в доменное напоминание с booleans. */
const toReminder = (row: ReminderRow): Reminder => ({
  uuid: row.uuid,
  userId: row.userId,
  title: row.title,
  notes: row.notes,
  remindAt: row.remindAt,
  recurrence: row.recurrence as RecurrenceType,
  isCompleted: bool(row.isCompleted),
  completedAt: row.completedAt,
  snoozedUntil: row.snoozedUntil,
  sourceUuid: row.sourceUuid,
  sourceType: row.sourceType,
  notificationId: row.notificationId,
  calendarEventId: row.calendarEventId,
  serverRevision: row.serverRevision,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
})

/**
 * Репозиторий напоминаний поверх BaseRepository: мутации идут через base
 * (доменная строка + запись в sync_outbox), чтения — напрямую через db.
 * is_completed хранится как 0/1, конвертируется в boolean на чтении.
 */
export class RemindersRepository {
  private readonly base: BaseRepository<typeof reminders & SyncTable>

  public constructor(private readonly db: Database = defaultDb) {
    this.base = new BaseRepository(
      reminders as typeof reminders & SyncTable,
      'reminder',
      db,
    )
  }

  public async createReminder(data: CreateReminderData): Promise<Reminder> {
    const row = await this.base.insert({
      title: data.title,
      remindAt: data.remindAt,
      notes: data.notes ?? null,
      recurrence: data.recurrence ?? 'none',
      userId: data.userId ?? null,
      sourceUuid: data.sourceUuid ?? null,
      sourceType: data.sourceType ?? null,
      isCompleted: 0,
      calendarEventId: null,
    } as never)
    const reminder = toReminder(row as ReminderRow)
    const nid = await scheduleReminder(toSchedulable(reminder))
    if (nid !== null) await this.setNotificationId(reminder.uuid, nid)
    return { ...reminder, notificationId: nid }
  }

  public async updateReminder(
    uuid: string,
    patch: UpdateReminderPatch,
  ): Promise<Reminder | null> {
    const values: Record<string, unknown> = {}
    if (patch.title !== undefined) values.title = patch.title
    if (patch.remindAt !== undefined) values.remindAt = patch.remindAt
    if (patch.notes !== undefined) values.notes = patch.notes
    if (patch.recurrence !== undefined) values.recurrence = patch.recurrence
    if (patch.userId !== undefined) values.userId = patch.userId

    const current = await this.base.findById(uuid)
    if (current === null) return null
    const oldNotificationId = (current as ReminderRow).notificationId

    const row = await this.base.update(uuid, values as never)
    if (row === null) return null
    const reminder = toReminder(row as ReminderRow)

    // Перепланируем, только если изменилась дата срабатывания.
    if (patch.remindAt === undefined) return reminder
    const nid = await rescheduleReminder(
      toSchedulable(reminder),
      oldNotificationId,
    )
    await this.setNotificationId(uuid, nid)
    return { ...reminder, notificationId: nid }
  }

  /** Мягкое удаление: tombstone (deleted_at) + delete-запись в outbox. */
  public async deleteReminder(uuid: string): Promise<Reminder | null> {
    const current = await this.base.findById(uuid)
    const row = await this.base.softDelete(uuid)
    if (row === null) return null
    if (current !== null) {
      await cancelReminder((current as ReminderRow).notificationId)
    }
    return toReminder(row as ReminderRow)
  }

  public async getReminderByUuid(uuid: string): Promise<Reminder | null> {
    const row = await this.base.findById(uuid)
    return row === null ? null : toReminder(row as ReminderRow)
  }

  /** Активные напоминания (без tombstone) с фильтром по статусу; по remind_at. */
  public async listReminders(
    opts: ListRemindersOptions = {},
  ): Promise<Reminder[]> {
    const status = opts.status ?? 'all'
    const filters = [isNull(reminders.deletedAt)]
    if (status === 'pending') filters.push(eq(reminders.isCompleted, 0))
    if (status === 'completed') filters.push(eq(reminders.isCompleted, 1))

    const rows = await this.db
      .select()
      .from(reminders)
      .where(and(...filters))
      .orderBy(asc(reminders.remindAt))
    return rows.map(toReminder)
  }

  /**
   * Помечает напоминание выполненным (is_completed=1, completed_at=now).
   * Для повторяющегося (recurrence != none) создаёт следующее вхождение
   * отдельной записью с remind_at = nextOccurrence(remind_at). Возвращает
   * исходное (выполненное) напоминание.
   */
  public async completeReminder(uuid: string): Promise<Reminder | null> {
    const current = await this.base.findById(uuid)
    if (current === null) return null
    const row = current as ReminderRow

    const completed = await this.base.update(uuid, {
      isCompleted: 1,
      completedAt: nowIso(),
      notificationId: null,
    } as never)
    if (completed === null) return null

    // Выполненное напоминание не должно сработать — отменяем уведомление.
    await cancelReminder(row.notificationId)

    const recurrence = row.recurrence as RecurrenceType
    const nextRemindAt = nextOccurrence(recurrence, row.remindAt)
    if (nextRemindAt !== null) {
      await this.createReminder({
        title: row.title,
        remindAt: nextRemindAt,
        notes: row.notes,
        recurrence,
        userId: row.userId,
        sourceUuid: row.sourceUuid,
        sourceType: row.sourceType,
      })
    }

    return toReminder(completed as ReminderRow)
  }

  /**
   * Откладывает напоминание: snoozed_until = переданная ISO-дата. Мутация
   * идёт через base (запись в outbox), т.к. snoozed_until синхронизируется.
   */
  public async snoozeReminder(
    uuid: string,
    snoozedUntilIso: string,
  ): Promise<Reminder | null> {
    const current = await this.base.findById(uuid)
    if (current === null) return null
    const oldNotificationId = (current as ReminderRow).notificationId

    const row = await this.base.update(uuid, {
      snoozedUntil: snoozedUntilIso,
    } as never)
    if (row === null) return null
    const reminder = toReminder(row as ReminderRow)

    const nid = await rescheduleReminder(
      toSchedulable(reminder),
      oldNotificationId,
    )
    await this.setNotificationId(uuid, nid)
    return { ...reminder, notificationId: nid }
  }

  /**
   * Активные (не выполненные, без tombstone) напоминания в диапазоне
   * remind_at — для календаря. Сортировка по remind_at.
   */
  public async remindersBetween(
    fromIso: string,
    toIso: string,
  ): Promise<Reminder[]> {
    const rows = await this.db
      .select()
      .from(reminders)
      .where(
        and(
          isNull(reminders.deletedAt),
          eq(reminders.isCompleted, 0),
          between(reminders.remindAt, fromIso, toIso),
        ),
      )
      .orderBy(asc(reminders.remindAt))
    return rows.map(toReminder)
  }

  /**
   * Пропущенные напоминания (FR-28): активные (без tombstone), не выполненные,
   * у которых remind_at уже прошёл (< now). Сортировка по remind_at.
   */
  public async missedReminders(): Promise<Reminder[]> {
    const rows = await this.db
      .select()
      .from(reminders)
      .where(
        and(
          isNull(reminders.deletedAt),
          eq(reminders.isCompleted, 0),
          lt(reminders.remindAt, nowIso()),
        ),
      )
      .orderBy(asc(reminders.remindAt))
    return rows.map(toReminder)
  }

  /**
   * Переустанавливает локальные уведомления для всех активных (без tombstone),
   * не выполненных напоминаний с будущей датой срабатывания (snoozed_until ??
   * remind_at > now). Вызывается при старте приложения (FR-27/28): после
   * перезагрузки устройства/переустановки приложения системные alarm могли
   * быть потеряны — без этого прохода такие напоминания никогда не сработают.
   * Идемпотентна: старый notification_id (если был) отменяется перед
   * планированием нового — дублей не возникает.
   */
  public async rescheduleAllPending(now: Date = new Date()): Promise<number> {
    const rows = await this.db
      .select()
      .from(reminders)
      .where(and(isNull(reminders.deletedAt), eq(reminders.isCompleted, 0)))

    let rescheduledCount = 0
    for (const row of rows as ReminderRow[]) {
      const reminder = toReminder(row)
      const dateIso = reminder.snoozedUntil ?? reminder.remindAt
      if (new Date(dateIso).getTime() <= now.getTime()) continue

      const nid = await rescheduleReminder(toSchedulable(reminder), reminder.notificationId)
      await this.setNotificationId(reminder.uuid, nid)
      if (nid !== null) rescheduledCount += 1
    }
    return rescheduledCount
  }

  /**
   * Сохраняет локальный id запланированного уведомления. Поле notification_id
   * НЕ синхронизируется, поэтому пишем напрямую в таблицу, минуя outbox.
   */
  public async setNotificationId(
    uuid: string,
    notificationId: string | null,
  ): Promise<Reminder | null> {
    const [row] = await this.db
      .update(reminders)
      .set({ notificationId })
      .where(eq(reminders.uuid, uuid))
      .returning()
    return row === undefined ? null : toReminder(row as ReminderRow)
  }

  /**
   * Сохраняет id события системного календаря после экспорта. Поле
   * calendar_event_id ЛОКАЛЬНОЕ (устройство-специфичное) и НЕ синхронизируется,
   * поэтому пишем напрямую в таблицу, минуя outbox.
   */
  public async setCalendarEventId(
    uuid: string,
    calendarEventId: string | null,
  ): Promise<Reminder | null> {
    const [row] = await this.db
      .update(reminders)
      .set({ calendarEventId })
      .where(eq(reminders.uuid, uuid))
      .returning()
    return row === undefined ? null : toReminder(row as ReminderRow)
  }
}

/** Singleton поверх дефолтного клиента для использования в хуках/сторах. */
export const remindersRepo = new RemindersRepository()
