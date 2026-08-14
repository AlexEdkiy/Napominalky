import fs from 'node:fs'
import path from 'node:path'

import { shoppingLists } from '../schema/shoppingLists'
import { shoppingListItems } from '../schema/shoppingListItems'

interface JournalEntry {
  idx: number
  tag: string
}

const migrationsDir = path.resolve(__dirname, '../migrations')

describe('Миграция 0010 — статусы задач (status/status_is_manual/is_completed)', () => {
  it('SQL миграции добавляет три колонки в shopping_lists и status в shopping_list_items', () => {
    const sql = fs.readFileSync(path.join(migrationsDir, '0010_task_status.sql'), 'utf-8')
    expect(sql).toMatch(/ALTER TABLE `shopping_lists` ADD `status` text DEFAULT 'new' NOT NULL/)
    expect(sql).toMatch(/ALTER TABLE `shopping_lists` ADD `status_is_manual` integer DEFAULT 0 NOT NULL/)
    expect(sql).toMatch(/ALTER TABLE `shopping_lists` ADD `is_completed` integer DEFAULT 0 NOT NULL/)
    expect(sql).toMatch(/ALTER TABLE `shopping_list_items` ADD `status` text DEFAULT 'new' NOT NULL/)
  })

  it('журнал миграций содержит тег 0010_task_status с idx=10', () => {
    const journal = JSON.parse(
      fs.readFileSync(path.join(migrationsDir, 'meta/_journal.json'), 'utf-8'),
    ) as { entries: JournalEntry[] }
    const entry = journal.entries.find((e) => e.tag === '0010_task_status')
    expect(entry?.idx).toBe(10)
  })

  it('migrations.js регистрирует миграцию m0010', () => {
    const src = fs.readFileSync(path.join(migrationsDir, 'migrations.js'), 'utf-8')
    expect(src).toMatch(/0010_task_status\.sql/)
    expect(src).toMatch(/m0010/)
  })

  it('Drizzle-схема shopping_lists содержит status/status_is_manual/is_completed с дефолтами', () => {
    expect(shoppingLists.status.name).toBe('status')
    expect(shoppingLists.status.notNull).toBe(true)
    expect(shoppingLists.status.default).toBe('new')
    expect(shoppingLists.statusIsManual.name).toBe('status_is_manual')
    expect(shoppingLists.statusIsManual.default).toBe(0)
    expect(shoppingLists.isCompleted.name).toBe('is_completed')
    expect(shoppingLists.isCompleted.default).toBe(0)
  })

  it('Drizzle-схема shopping_list_items содержит status с дефолтом new', () => {
    expect(shoppingListItems.status.name).toBe('status')
    expect(shoppingListItems.status.notNull).toBe(true)
    expect(shoppingListItems.status.default).toBe('new')
  })
})
