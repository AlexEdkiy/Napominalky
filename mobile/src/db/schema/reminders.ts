import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Локальная таблица напоминаний. Зеркалит backend ReminderResource
 * (snake_case) и добавляет sync-поля. uuid — первичный ключ (baseRepo.findById
 * ищет по нему). recurrence — строка из набора none/daily/weekly/monthly,
 * is_completed хранится как integer 0/1 (SQLite boolean), remind_at —
 * ISO-строка (индекс (user_id, remind_at) для выборки по диапазону:
 * календарь/уведомления). notification_id — ЛОКАЛЬНОЕ поле: id
 * запланированного локального уведомления, НЕ синхронизируется с backend.
 * calendar_event_id — ЛОКАЛЬНОЕ, устройство-специфичное поле: id события,
 * созданного экспортом в системный календарь, НЕ синхронизируется с backend.
 * server_revision приходит с сервера при pull, deleted_at — tombstone.
 */
export const reminders = sqliteTable(
  'reminders',
  {
    uuid: text('uuid').primaryKey(),
    userId: text('user_id'),
    title: text('title').notNull(),
    notes: text('notes'),
    remindAt: text('remind_at').notNull(),
    recurrence: text('recurrence').notNull().default('none'),
    isCompleted: integer('is_completed').notNull().default(0),
    completedAt: text('completed_at'),
    snoozedUntil: text('snoozed_until'),
    sourceUuid: text('source_uuid'),
    sourceType: text('source_type'),
    notificationId: text('notification_id'),
    calendarEventId: text('calendar_event_id'),
    serverRevision: integer('server_revision'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => ({
    userRemindAtIdx: index('reminders_user_remind_at_idx').on(
      table.userId,
      table.remindAt,
    ),
  }),
)

export type ReminderRow = typeof reminders.$inferSelect
export type NewReminderRow = typeof reminders.$inferInsert
