import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
import * as schema from './schema'

export const DATABASE_NAME = 'napominalki.db'

const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true })

/** Типизированный singleton Drizzle-клиента поверх expo-sqlite. */
export const db = drizzle(sqlite, { schema })

export type Database = typeof db
