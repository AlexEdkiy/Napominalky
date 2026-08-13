import fs from 'node:fs'
import path from 'node:path'

import { reminders } from '../schema/reminders'

interface JournalEntry {
  idx: number
  tag: string
}

const migrationsDir = path.resolve(__dirname, '../migrations')

describe('Миграция 0009 — reminders.calendar_event_id (локальное поле экспорта)', () => {
  it('SQL миграции добавляет колонку calendar_event_id в reminders', () => {
    const sql = fs.readFileSync(
      path.join(migrationsDir, '0009_reminder_calendar_event_id.sql'),
      'utf-8',
    )
    expect(sql).toMatch(/ALTER TABLE `reminders` ADD `calendar_event_id` text/)
  })

  it('журнал миграций содержит тег 0009_reminder_calendar_event_id', () => {
    const journal = JSON.parse(
      fs.readFileSync(path.join(migrationsDir, 'meta/_journal.json'), 'utf-8'),
    ) as { entries: JournalEntry[] }
    expect(journal.entries.map((e) => e.tag)).toContain('0009_reminder_calendar_event_id')
  })

  it('migrations.js регистрирует миграцию m0009', () => {
    const src = fs.readFileSync(path.join(migrationsDir, 'migrations.js'), 'utf-8')
    expect(src).toMatch(/0009_reminder_calendar_event_id\.sql/)
    expect(src).toMatch(/m0009/)
  })

  it('Drizzle-схема содержит nullable text-колонку calendar_event_id', () => {
    expect(reminders.calendarEventId.name).toBe('calendar_event_id')
    expect(reminders.calendarEventId.notNull).toBe(false)
  })
})
