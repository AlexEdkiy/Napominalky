import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
import * as schema from './schema'
import { registerDatabaseScope, setActiveDatabaseScope } from './databaseScope'

export const DATABASE_NAME = 'napominalki.db'

export const openDatabase = (name: string) => {
  const database = drizzle(openDatabaseSync(name, { enableChangeListener: true }), { schema })
  registerDatabaseScope(database, name)
  return database
}

/** Типизированный singleton Drizzle-клиента поверх expo-sqlite. */
export const legacyDb = openDatabase(DATABASE_NAME)
export let db = legacyDb
export let activeDatabaseName = DATABASE_NAME

export const activateDatabase = (database: Database, name: string): void => {
  db = database
  activeDatabaseName = name
  setActiveDatabaseScope(name)
}

export type Database = typeof db
