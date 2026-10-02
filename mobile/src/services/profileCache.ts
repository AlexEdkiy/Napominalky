import { eq } from 'drizzle-orm'
import type { Database } from '@/db/client'
import { syncMeta } from '@/db/schema/syncMeta'
import { LAST_USER_ID } from '@/services/sync/syncMeta'
import type { User } from '@/types/auth'

const PROFILE_KEY = 'account_profile'
const read = (db: Database, key: string): string | null =>
  db.select().from(syncMeta).where(eq(syncMeta.key, key)).get()?.value ?? null

// Large avatars belong with account data in SQLite, not in SecureStore.
// resetLocalData removes this cache together with the account's other data.
export const readProfileCache = (db: Database): User | null => {
  try {
    const value: unknown = JSON.parse(read(db, PROFILE_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return null
    const user = value as User
    return typeof user.uuid === 'string' && user.uuid === read(db, LAST_USER_ID) &&
      typeof user.email === 'string' && typeof user.sync_enabled === 'boolean' &&
      (user.name === null || typeof user.name === 'string') &&
      (user.avatar == null || typeof user.avatar === 'string') ? user : null
  } catch { return null }
}

export const writeProfileCache = (db: Database, user: User): void => {
  if (read(db, LAST_USER_ID) !== user.uuid) return
  const value = JSON.stringify(user)
  db.insert(syncMeta).values({ key: PROFILE_KEY, value })
    .onConflictDoUpdate({ target: syncMeta.key, set: { value } }).run()
}
