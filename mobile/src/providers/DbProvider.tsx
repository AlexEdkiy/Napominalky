import React, { createContext, useContext, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { db, type Database } from '@/db/client'
import migrations from '@/db/migrations/migrations'

const DbContext = createContext<Database | null>(null)

interface DbProviderProps {
  children: ReactNode
}

/**
 * Применяет Drizzle-миграции к локальной SQLite и предоставляет
 * типизированный `db` через контекст. Дети рендерятся после успешной миграции.
 */
const DbProvider: React.FC<DbProviderProps> = ({ children }) => {
  const { success, error } = useMigrations(db, migrations)

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Ошибка инициализации базы данных</Text>
      </View>
    )
  }

  if (!success) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <DbContext.Provider value={db}>{children}</DbContext.Provider>
}

export const useDb = (): Database => {
  const context = useContext(DbContext)
  if (context === null) {
    throw new Error('useDb must be used within a DbProvider')
  }
  return context
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#b00020',
    fontSize: 16,
  },
})

export default DbProvider
