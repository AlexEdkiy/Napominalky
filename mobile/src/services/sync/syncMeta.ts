import * as Crypto from 'expo-crypto'
import { eq, sql } from 'drizzle-orm'

import { db as defaultDb, type Database } from '@/db/client'
import { syncMeta } from '@/db/schema/syncMeta'

/** Ключи служебного key-value хранилища sync_meta. */
export const LAST_PULLED_REVISION = 'last_pulled_revision'
export const DEVICE_UUID = 'device_uuid'
export const DEVICE_NAME = 'device_name'
export const LAST_SYNCED_AT = 'last_synced_at'

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
