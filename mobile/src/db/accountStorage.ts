import { eq, isNotNull } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import { DATABASE_NAME, legacyDb, openDatabase, type Database } from './client'
import migrations from './migrations/migrations'
import { notes, reminders, shoppingLists, syncMeta } from './schema'

export const GUEST_OWNER = 'guest'
const OWNER_KEY = 'storage_owner_v1'
const LAST_USER_KEY = 'last_user_id'
export interface AccountDatabase { db: Database; name: string; owner: string }

/** Pin the old file to its original owner. Never reinterpret account data as guest data. */
export const identifyLegacyOwner = (database: Database): string => {
  const read = (key: string) => database.select().from(syncMeta).where(eq(syncMeta.key, key)).get()?.value
  const existing = read(OWNER_KEY)
  if (existing) return existing
  const hasAccountRows = [notes, reminders, shoppingLists].some((table) =>
    database.select({ uuid: table.uuid }).from(table).where(isNotNull(table.userId)).limit(1).get())
  const owner = read(LAST_USER_KEY) ?? (hasAccountRows ? 'unclaimed' : GUEST_OWNER)
  database.insert(syncMeta).values({ key: OWNER_KEY, value: owner }).run()
  return owner
}

/** Dependencies are injectable for the real SQLite integration harness. */
export const createAccountStorage = (
  legacySource: () => Database = () => legacyDb,
  open: (name: string) => Database = openDatabase,
) => {
  const opened = new Map<string, Promise<AccountDatabase>>()
  let legacy: Promise<AccountDatabase> | undefined
  const getLegacyDatabase = (): Promise<AccountDatabase> => {
    if (!legacy) {
      const database = legacySource()
      legacy = migrate(database, migrations).then(() => ({
        db: database, name: DATABASE_NAME, owner: identifyLegacyOwner(database),
      })).catch((error: unknown) => { legacy = undefined; throw error })
    }
    return legacy
  }
  const getAccountDatabase = async (owner: string): Promise<AccountDatabase> => {
    if (!/^[a-zA-Z0-9-]+$/.test(owner) || owner === 'unclaimed') throw new Error('Некорректный владелец данных')
    const original = await getLegacyDatabase()
    if (original.owner === owner) return original
    let pending = opened.get(owner)
    if (!pending) {
      pending = (async () => {
        const name = `napominalki-${owner === GUEST_OWNER ? 'guest' : `account-${owner}`}.db`
        const database = open(name)
        await migrate(database, migrations)
        if (owner !== GUEST_OWNER) {
          database.insert(syncMeta).values({ key: LAST_USER_KEY, value: owner })
            .onConflictDoUpdate({ target: syncMeta.key, set: { value: owner } }).run()
        }
        return { db: database, name, owner }
      })().catch((error: unknown) => { opened.delete(owner); throw error })
      opened.set(owner, pending)
    }
    return pending
  }
  return { getLegacyDatabase, getAccountDatabase }
}

export const { getLegacyDatabase, getAccountDatabase } = createAccountStorage()
