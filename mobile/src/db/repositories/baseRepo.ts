import * as Crypto from 'expo-crypto'
import { and, eq, isNull } from 'drizzle-orm'
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import { db as defaultDb, type Database } from '../client'
import { enqueueOutbox } from './outbox'
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
 * sync_outbox. uuid (v4) и updated_at (ISO) генерируются на клиенте.
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

    const [row] = await this.db.insert(this.table).values(values).returning()
    await this.writeOutbox('create', uuid, updatedAt, row as Row<TTable>)
    return row as Row<TTable>
  }

  public async update(
    uuid: string,
    patch: DomainPatch<TTable>,
  ): Promise<Row<TTable> | null> {
    const updatedAt = nowIso()
    const values = { ...patch, updatedAt } as Partial<TTable['$inferInsert']>

    const [row] = await this.db
      .update(this.table)
      .set(values)
      .where(eq(this.table.uuid, uuid))
      .returning()
    if (row === undefined) return null

    await this.writeOutbox('update', uuid, updatedAt, row as Row<TTable>)
    return row as Row<TTable>
  }

  public async softDelete(uuid: string): Promise<Row<TTable> | null> {
    const updatedAt = nowIso()
    const values = {
      deletedAt: updatedAt,
      updatedAt,
    } as Partial<TTable['$inferInsert']>

    const [row] = await this.db
      .update(this.table)
      .set(values)
      .where(eq(this.table.uuid, uuid))
      .returning()
    if (row === undefined) return null

    await this.writeOutbox('delete', uuid, updatedAt, row as Row<TTable>)
    return row as Row<TTable>
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

  private async writeOutbox(
    operation: 'create' | 'update' | 'delete',
    uuid: string,
    updatedAt: string,
    row: Row<TTable>,
  ): Promise<void> {
    await enqueueOutbox(this.db, {
      entityType: this.entityType,
      entityUuid: uuid,
      operation,
      payload: toSnakeCaseKeys(row as Record<string, unknown>),
      updatedAt,
    })
  }
}
