import * as Crypto from 'expo-crypto'
import { and, eq, isNull } from 'drizzle-orm'
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import { db as defaultDb, type Database } from '../client'
import { enqueueOutbox, type OutboxWriter } from './outbox'
import { toSnakeCaseKeys } from '../../utils/snakeCase'

/**
 * Контракт синхронизируемой таблицы: каждая доменная таблица (notes,
 * shopping_lists, ...) обязана иметь sync-поля uuid/updated_at/deleted_at.
 * baseRepo работает с любой такой таблицей.
 */
export interface SyncTable extends SQLiteTable {
  uuid: SQLiteColumn
  updatedAt: SQLiteColumn
  deletedAt: SQLiteColumn
}

/** Поля синхронизации проставляются репозиторием, доменный код их не задаёт. */
type SyncFields = 'uuid' | 'updatedAt' | 'deletedAt' | 'createdAt'
type DomainInsert<TTable extends SyncTable> = Omit<
  TTable['$inferInsert'],
  SyncFields
>
type DomainPatch<TTable extends SyncTable> = Partial<DomainInsert<TTable>>
type Row<TTable extends SyncTable> = TTable['$inferSelect']

const nowIso = (): string => new Date().toISOString()

/**
 * Базовый репозиторий local-first CRUD. Доменные репозитории (MOB-5/7/9)
 * создаются как `new BaseRepository(notes, 'note')` либо наследованием,
 * передавая свою Drizzle-таблицу и тип сущности для outbox/sync.
 *
 * Каждая мутация: (1) пишет/меняет доменную строку, (2) добавляет запись в
 * sync_outbox в одной синхронной транзакции. uuid (v4) и updated_at (ISO)
 * генерируются на клиенте.
 */
export class BaseRepository<TTable extends SyncTable> {
  public constructor(
    protected readonly table: TTable,
    protected readonly entityType: string,
    protected readonly db: Database = defaultDb,
  ) {}

  public async insert(data: DomainInsert<TTable>): Promise<Row<TTable>> {
    const uuid = Crypto.randomUUID()
    const updatedAt = nowIso()
    const values = { ...data, uuid, updatedAt } as TTable['$inferInsert']

    // Expo Drizzle commits when the callback returns. Never await inside it.
    return this.db.transaction((tx) => {
      const [row] = tx.insert(this.table).values(values).returning().all() as Row<TTable>[]
      if (row === undefined) throw new Error('Insert returned no row')
      this.writeOutbox(tx, 'create', uuid, updatedAt, row)
      return row
    })
  }

  public async update(
    uuid: string,
    patch: DomainPatch<TTable>,
  ): Promise<Row<TTable> | null> {
    const updatedAt = nowIso()
    const values = { ...patch, updatedAt } as Partial<TTable['$inferInsert']>

    return this.db.transaction((tx) => {
      const [row] = tx
        .update(this.table)
        .set(values)
        .where(eq(this.table.uuid, uuid))
        .returning()
        .all() as Row<TTable>[]
      if (row === undefined) return null
      this.writeOutbox(tx, 'update', uuid, updatedAt, row)
      return row
    })
  }

  public async softDelete(uuid: string): Promise<Row<TTable> | null> {
    const updatedAt = nowIso()
    const values = {
      deletedAt: updatedAt,
      updatedAt,
    } as Partial<TTable['$inferInsert']>

    return this.db.transaction((tx) => {
      const [row] = tx
        .update(this.table)
        .set(values)
        .where(eq(this.table.uuid, uuid))
        .returning()
        .all() as Row<TTable>[]
      if (row === undefined) return null
      this.writeOutbox(tx, 'delete', uuid, updatedAt, row)
      return row
    })
  }

  /** Активная (не удалённая tombstone) запись по uuid. */
  public async findById(uuid: string): Promise<Row<TTable> | null> {
    const [row] = await this.db
      .select()
      .from(this.table as SQLiteTable)
      .where(and(eq(this.table.uuid, uuid), isNull(this.table.deletedAt)))
      .limit(1)
    return (row as Row<TTable> | undefined) ?? null
  }

  private writeOutbox(
    writer: OutboxWriter,
    operation: 'create' | 'update' | 'delete',
    uuid: string,
    updatedAt: string,
    row: Row<TTable>,
  ): void {
    enqueueOutbox(writer, {
      entityType: this.entityType,
      entityUuid: uuid,
      operation,
      payload: toSnakeCaseKeys(row as Record<string, unknown>),
      updatedAt,
    })
  }
}
