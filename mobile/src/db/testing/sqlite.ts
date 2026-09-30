import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import type { SQLiteDatabase } from 'expo-sqlite'
import * as schema from '../schema'

/** Real SQLite + the installed Expo Drizzle driver; no native device is required.
 * Only the Expo statement bridge is adapted. Transactions and SQL run unchanged.
 * Requires Node >=22.16 (CI uses Node 22). Never imported by application code.
 */
export const createSqliteTestDb = () => {
  const sqlite = new DatabaseSync(':memory:')
  const directory = join(__dirname, '../migrations')
  for (const file of readdirSync(directory).filter((name) => name.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(join(directory, file), 'utf8'))
  }

  const client = {
    prepareSync: (query: string) => {
      const statement = sqlite.prepare(query)
      return {
        executeSync: (params: SQLInputValue[]) => {
          if (statement.columns().length > 0) {
            const rows = statement.all(...params)
            return { getAllSync: () => rows, getFirstSync: () => rows[0] }
          }
          const result = statement.run(...params)
          return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) }
        },
        executeForRawResultSync: (params: SQLInputValue[]) => {
          statement.setReturnArrays(true)
          const rows = statement.all(...params)
          return { getAllSync: () => rows }
        },
      }
    },
  }
  return {
    sqlite,
    db: drizzle(client as unknown as SQLiteDatabase, { schema }),
    close: () => sqlite.close(),
  }
}
