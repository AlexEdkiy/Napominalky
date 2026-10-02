import { useCallback, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { addDatabaseChangeListener } from 'expo-sqlite'

import { useDb } from '@/providers/DbProvider'
import { SearchRepository } from '@/db/repositories/searchRepo'
import { DATABASE_NAME } from '@/db/client'
import { useAuthStore } from '@/stores/authStore'
import type { SearchType } from '@/types/search'

const TABLES = new Set(['notes', 'reminders', 'shopping_lists', 'shopping_list_items',
  'shopping_list_item_comments', 'sync_meta'])

export const useSearch = (text: string, type: SearchType, page: number) => {
  const db = useDb()
  const repo = useMemo(() => new SearchRepository(db), [db])
  const token = useAuthStore((state) => state.token)
  const guest = useAuthStore((state) => state.guestMode)
  const userId = useAuthStore((state) => state.user?.uuid ?? null)
  const query = text.trim()
  const allowed = token !== null || guest
  const enabled = allowed && Array.from(query).length >= 2 && Array.from(query).length <= 200
  const result = useQuery({
    queryKey: ['local-search', userId, guest, token !== null, query, type, page],
    queryFn: () => repo.search(query, type, page, { userId, guest }),
    enabled, networkMode: 'always', staleTime: 0, gcTime: 0, retry: false,
  })
  const { refetch } = result
  useFocusEffect(useCallback(() => { if (enabled) void refetch() }, [enabled, refetch, token]))
  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const subscription = addDatabaseChangeListener((event) => {
      if (!event.databaseFilePath.endsWith(`/${DATABASE_NAME}`) || !TABLES.has(event.tableName)) return
      clearTimeout(timer)
      timer = setTimeout(() => { void refetch() }, 100)
    })
    return () => { clearTimeout(timer); subscription.remove() }
  }, [enabled, refetch, token])
  return { ...result, data: enabled ? result.data : undefined, allowed, enabled }
}
