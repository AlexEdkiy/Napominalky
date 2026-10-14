import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import migrations from '../migrations/migrations'
import { createSqliteTestDb } from './sqlite'
import { createAccountStorage } from '../accountStorage'
import { registerDatabaseScope } from '../databaseScope'

/** Native connection replacement only; migrations/queries/transactions are real. */
export const createAccountStorageFixture = async () => {
  const legacy = createSqliteTestDb(false)
  await migrate(legacy.db, migrations)
  const files = new Map<string, ReturnType<typeof createSqliteTestDb>>([['napominalki.db', legacy]])
  registerDatabaseScope(legacy.db, 'napominalki.db')
  const open = (name: string) => {
    let file = files.get(name)
    if (!file) { file = createSqliteTestDb(false); files.set(name, file) }
    registerDatabaseScope(file.db, name)
    return file.db
  }
  return {
    legacy, files, manager: createAccountStorage(() => legacy.db, open),
    restart: () => createAccountStorage(() => legacy.db, open),
    close: () => { for (const file of files.values()) file.close() },
  }
}
