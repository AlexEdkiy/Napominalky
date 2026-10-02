jest.mock('@/db/client', () => ({ db: {} }))
import { createSqliteTestDb } from '@/db/testing/sqlite'
import { resetLocalData } from '@/db/resetLocalData'
import { setMeta, LAST_USER_ID } from '@/services/sync/syncMeta'
import { readProfileCache, writeProfileCache } from '../profileCache'
import type { User } from '@/types/auth'

const user: User = { uuid: 'alice', name: 'Александр', email: 'fixture@example.com', avatar: 'data:image/png;base64,fixture', is_admin: false, sync_enabled: true, created_at: '2026-01-01' }
it('caches name and avatar only for the DB owner and clears both on logout', async () => {
  const f = createSqliteTestDb()
  try {
    await setMeta(LAST_USER_ID, user.uuid, f.db)
    writeProfileCache(f.db, user)
    expect(readProfileCache(f.db)).toEqual(user)
    writeProfileCache(f.db, { ...user, uuid: 'other' })
    expect(readProfileCache(f.db)).toEqual(user)
    await setMeta(LAST_USER_ID, 'other', f.db)
    expect(readProfileCache(f.db)).toBeNull()
    await resetLocalData(f.db)
    expect(readProfileCache(f.db)).toBeNull()
  } finally { f.close() }
})
