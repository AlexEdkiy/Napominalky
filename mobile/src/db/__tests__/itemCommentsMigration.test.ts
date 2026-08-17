import fs from 'node:fs'
import path from 'node:path'

import { shoppingListItemComments } from '../schema/shoppingListItemComments'

interface JournalEntry {
  idx: number
  tag: string
}

const migrationsDir = path.resolve(__dirname, '../migrations')

describe('Миграция 0011 — таблица комментариев-треда (shopping_list_item_comments)', () => {
  it('SQL миграции создаёт таблицу с обязательными полями и tombstone', () => {
    const sql = fs.readFileSync(path.join(migrationsDir, '0011_item_comments.sql'), 'utf-8')
    expect(sql).toMatch(/CREATE TABLE `shopping_list_item_comments`/)
    expect(sql).toMatch(/`uuid` text PRIMARY KEY NOT NULL/)
    expect(sql).toMatch(/`shopping_list_item_uuid` text NOT NULL/)
    expect(sql).toMatch(/`author_name` text NOT NULL/)
    expect(sql).toMatch(/`body` text NOT NULL/)
    expect(sql).toMatch(/`server_revision` integer/)
    expect(sql).toMatch(/`updated_at` text NOT NULL/)
    expect(sql).toMatch(/`deleted_at` text/)
  })

  it('SQL миграции создаёт индекс по shopping_list_item_uuid (выборка треда)', () => {
    const sql = fs.readFileSync(path.join(migrationsDir, '0011_item_comments.sql'), 'utf-8')
    expect(sql).toMatch(
      /CREATE INDEX `shopping_list_item_comments_item_idx` ON `shopping_list_item_comments` \(`shopping_list_item_uuid`\)/,
    )
  })

  it('журнал миграций содержит тег 0011_item_comments с idx=11', () => {
    const journal = JSON.parse(
      fs.readFileSync(path.join(migrationsDir, 'meta/_journal.json'), 'utf-8'),
    ) as { entries: JournalEntry[] }
    const entry = journal.entries.find((e) => e.tag === '0011_item_comments')
    expect(entry?.idx).toBe(11)
  })

  it('meta-снапшот 0011 существует и описывает таблицу комментариев', () => {
    const snapshot = fs.readFileSync(path.join(migrationsDir, 'meta/0011_snapshot.json'), 'utf-8')
    expect(snapshot).toContain('shopping_list_item_comments')
  })

  it('migrations.js регистрирует миграцию m0011', () => {
    const src = fs.readFileSync(path.join(migrationsDir, 'migrations.js'), 'utf-8')
    expect(src).toMatch(/0011_item_comments\.sql/)
    expect(src).toMatch(/m0011/)
  })

  it('Drizzle-схема согласована с SQL (имена snake_case-колонок и NOT NULL)', () => {
    expect(shoppingListItemComments.uuid.name).toBe('uuid')
    expect(shoppingListItemComments.shoppingListItemUuid.name).toBe('shopping_list_item_uuid')
    expect(shoppingListItemComments.shoppingListItemUuid.notNull).toBe(true)
    expect(shoppingListItemComments.authorName.name).toBe('author_name')
    expect(shoppingListItemComments.authorName.notNull).toBe(true)
    expect(shoppingListItemComments.body.name).toBe('body')
    expect(shoppingListItemComments.body.notNull).toBe(true)
    expect(shoppingListItemComments.serverRevision.name).toBe('server_revision')
    expect(shoppingListItemComments.updatedAt.name).toBe('updated_at')
    expect(shoppingListItemComments.updatedAt.notNull).toBe(true)
    expect(shoppingListItemComments.deletedAt.name).toBe('deleted_at')
  })
})
