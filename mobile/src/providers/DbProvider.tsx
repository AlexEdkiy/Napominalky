import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { db, type Database } from '@/db/client'
import migrations from '@/db/migrations/migrations'
import { ensureSchemaPullVersion } from '@/services/sync/syncMeta'
import ErrorScreen from '@/components/ErrorScreen'

const DbContext = createContext<Database | null>(null)

interface DbProviderProps {
  children: ReactNode
}

/**
 * Применяет Drizzle-миграции к локальной SQLite и предоставляет
 * типизированный `db` через контекст. Дети рендерятся после успешной миграции
 * и одноразового сброса pull-курсора при апдейте схемы (ensureSchemaPullVersion
 * — полный pull подтянет новые sync-сущности, напр. тред комментариев).
 * При ошибке миграции показывает полный message и stack для диагностики.
 */
const DbProvider: React.FC<DbProviderProps> = ({ children }) => {
  const { success, error } = useMigrations(db, migrations)
  const [metaReady, setMetaReady] = useState(false)

  useEffect(() => {
    if (!success) return
    let cancelled = false
    ensureSchemaPullVersion(db)
      .catch((err: unknown) => {
        // Сбой служебной метки не должен блокировать приложение.
        console.warn('[db] ensureSchemaPullVersion failed', err)
      })
      .finally(() => {
        if (!cancelled) setMetaReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [success])

  if (error) {
    return (
      <ErrorScreen
        title="Ошибка инициализации базы данных"
        message={error.message}
        stack={error.stack ?? null}
      />
    )
  }

  if (!success || !metaReady) {
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
})

export default DbProvider
