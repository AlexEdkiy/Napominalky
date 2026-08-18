import * as Crypto from 'expo-crypto'
import { eq, sql } from 'drizzle-orm'

import { db as defaultDb, type Database } from '@/db/client'
import { syncMeta } from '@/db/schema/syncMeta'

/** Ключи служебного key-value хранилища sync_meta. */
export const LAST_PULLED_REVISION = 'last_pulled_revision'
export const DEVICE_UUID = 'device_uuid'
export const DEVICE_NAME = 'device_name'
export const LAST_SYNCED_AT = 'last_synced_at'
/** uuid последнего вошедшего пользователя — для изоляции при смене аккаунта. */
export const LAST_USER_ID = 'last_user_id'
/** Версия локальной схемы, для которой уже выполнен полный pull (реконсиляция). */
export const SCHEMA_PULL_VERSION = 'schema_pull_version'

/**
 * Текущая версия схемы, требующая полного pull после апдейта приложения.
 * 11 = миграция 0011 (тред комментариев): сервер бэкфиллом создал комментарии
 * из legacy-поля comment, локально их можно получить только полным pull.
 * 12 = фикс упущенного сброса при 0010 (статусы задач): колонка status
 * получила дефолт 'new' для всех существующих строк, а серверные статусы
 * записей с server_revision ниже курсора без сброса не подтянулись бы никогда.
 * Хранится в sync_meta как число-строка; сравнение строго численное
 * (stored < CURRENT → одноразовый сброс): пользователь на 11 сбросит курсор
 * ещё раз, свежая установка (stored=0, курсор и так 0) — без лишнего pull.
 */
export const CURRENT_SCHEMA_PULL_VERSION = 12

type Writer = Pick<Database, 'select' | 'insert'>

/** Читает значение sync_meta по ключу (null, если ключа нет). */
export const getMeta = async (
  key: string,
  db: Writer = defaultDb,
): Promise<string | null> => {
  const [row] = await db
    .select({ value: syncMeta.value })
    .from(syncMeta)
    .where(eq(syncMeta.key, key))
    .limit(1)
  return (row as { value: string } | undefined)?.value ?? null
}

/** Пишет значение sync_meta по ключу (upsert по первичному ключу). */
export const setMeta = async (
  key: string,
  value: string,
  db: Writer = defaultDb,
): Promise<void> => {
  await db
    .insert(syncMeta)
    .values({ key, value })
    .onConflictDoUpdate({
      target: syncMeta.key,
      set: { value: sql`excluded.value` },
    })
}

/** Курсор последнего успешного pull (0, если синхронизации ещё не было). */
export const getLastPulledRevision = async (
  db: Writer = defaultDb,
): Promise<number> => {
  const raw = await getMeta(LAST_PULLED_REVISION, db)
  if (raw === null) return 0
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

/** Возвращает device_uuid, генерируя и сохраняя его при первом обращении. */
export const getOrCreateDeviceUuid = async (
  db: Writer = defaultDb,
): Promise<string> => {
  const existing = await getMeta(DEVICE_UUID, db)
  if (existing !== null) return existing

  const uuid = Crypto.randomUUID()
  await setMeta(DEVICE_UUID, uuid, db)
  return uuid
}

/** Человекочитаемое имя устройства (null, если не задано). */
export const getDeviceName = async (
  db: Writer = defaultDb,
): Promise<string | null> => getMeta(DEVICE_NAME, db)

/** ISO-метка времени последней успешной синхронизации (null, если не было). */
export const getLastSyncedAt = async (
  db: Writer = defaultDb,
): Promise<string | null> => getMeta(LAST_SYNCED_AT, db)

/** Записывает ISO-метку времени последней успешной синхронизации. */
export const setLastSyncedAt = async (
  isoTime: string,
  db: Writer = defaultDb,
): Promise<void> => setMeta(LAST_SYNCED_AT, isoTime, db)

/**
 * Сбрасывает курсор последнего pull в '0', чтобы следующий pull сделал
 * полную реконсиляцию аккаунта (pull от revision=0 → все данные сервера).
 * Безопасно вызывать повторно — идемпотентно.
 */
export const resetPullCursor = async (
  db: Writer = defaultDb,
): Promise<void> => setMeta(LAST_PULLED_REVISION, '0', db)

/**
 * Одноразовый (идемпотентный) сброс pull-курсора при апдейте схемы: если
 * сохранённая версия < CURRENT_SCHEMA_PULL_VERSION — сбрасывает курсор
 * (следующий pull от 0 подтянет новые сущности, включая серверный бэкфилл
 * комментариев) и фиксирует версию. Повторные вызовы — no-op.
 * ВАЖНО: legacy-поле comment пункта в тред локально НЕ мигрируется —
 * серверный бэкфилл уже создал комментарии, локальная миграция дала бы дубли.
 *
 * @returns true, если курсор был сброшен (версия повышена).
 */
export const ensureSchemaPullVersion = async (
  db: Writer = defaultDb,
): Promise<boolean> => {
  const raw = await getMeta(SCHEMA_PULL_VERSION, db)
  const stored = raw === null ? 0 : Number.parseInt(raw, 10)
  const current = Number.isNaN(stored) ? 0 : stored
  if (current >= CURRENT_SCHEMA_PULL_VERSION) return false

  await resetPullCursor(db)
  await setMeta(SCHEMA_PULL_VERSION, String(CURRENT_SCHEMA_PULL_VERSION), db)
  return true
}
