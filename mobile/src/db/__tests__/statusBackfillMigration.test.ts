import fs from 'node:fs'
import path from 'node:path'

import { CURRENT_SCHEMA_PULL_VERSION } from '../../services/sync/syncMeta'

// Изолируем импорт syncMeta от нативного expo-sqlite.
jest.mock('@/db/client', () => ({ db: {} }))

interface JournalEntry {
  idx: number
  tag: string
}

const migrationsDir = path.resolve(__dirname, '../migrations')
const sqlPath = path.join(migrationsDir, '0012_status_backfill.sql')

describe('Миграция 0012 — бэкфилл статусов, упущенный в 0010 (done ⇔ флаг)', () => {
  it('SQL восстанавливает status=done для отмеченных пунктов (is_checked=1)', () => {
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    expect(sql).toMatch(
      /UPDATE `shopping_list_items` SET `status` = 'done' WHERE `is_checked` = 1 AND `status` = 'new';/,
    )
  })

  it('SQL не трогает пункты/списки с осмысленным статусом (guard `status` = \'new\')', () => {
    // Каждый UPDATE ограничен строками с дефолтом 'new' из 0010:
    // in_progress/postponed бэкфилл не перезаписывает — их принесёт полный pull.
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    const updates = sql
      .split('\n')
      .filter((line) => line.trimStart().startsWith('UPDATE'))
    expect(updates).toHaveLength(2)
    for (const update of updates) {
      expect(update).toContain("`status` = 'new'")
      expect(update).not.toContain('in_progress')
      expect(update).not.toContain('postponed')
    }
  })

  it('SQL восстанавливает done+manual для завершённых списков-задач', () => {
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    expect(sql).toMatch(
      /UPDATE `shopping_lists` SET `status` = 'done', `status_is_manual` = 1 WHERE `is_completed` = 1 AND `type` = 'tasks' AND `status` = 'new';/,
    )
  })

  it('журнал миграций содержит тег 0012_status_backfill с idx=12', () => {
    const journal = JSON.parse(
      fs.readFileSync(path.join(migrationsDir, 'meta/_journal.json'), 'utf-8'),
    ) as { entries: JournalEntry[] }
    const entry = journal.entries.find((e) => e.tag === '0012_status_backfill')
    expect(entry?.idx).toBe(12)
  })

  it('meta-снапшот 0012 существует и сцеплен с 0011 (prevId = id 0011)', () => {
    const prev = JSON.parse(
      fs.readFileSync(path.join(migrationsDir, 'meta/0011_snapshot.json'), 'utf-8'),
    ) as { id: string }
    const snap = JSON.parse(
      fs.readFileSync(path.join(migrationsDir, 'meta/0012_snapshot.json'), 'utf-8'),
    ) as { id: string; prevId: string }
    expect(snap.prevId).toBe(prev.id)
    expect(snap.id).not.toBe(prev.id)
  })

  it('migrations.js регистрирует миграцию m0012', () => {
    const src = fs.readFileSync(path.join(migrationsDir, 'migrations.js'), 'utf-8')
    expect(src).toMatch(/0012_status_backfill\.sql/)
    expect(src).toMatch(/m0012/)
  })

  it('schema_pull_version поднята до 12 — полный pull подтянет серверные статусы', () => {
    // Бэкфилл чинит только пары done⇔флаг; in_progress/postponed и точные
    // серверные значения приходят полным pull после сброса курсора.
    expect(CURRENT_SCHEMA_PULL_VERSION).toBe(12)
  })
})
