import React, { useCallback, type PropsWithChildren } from 'react'
import { Alert } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { FavoriteActions } from '@/components/ui/FavoriteButton'
import { favoritesRepo, type FavoriteEntity } from '@/db/repositories/favoritesRepo'

export default function FavoritesProvider({ children }: PropsWithChildren): React.JSX.Element {
  const client = useQueryClient()
  const toggle = useCallback(async (entity: FavoriteEntity, uuid: string) => {
    try {
      await favoritesRepo.toggle(entity, uuid)
      await Promise.all(['shopping-lists', 'notes', 'reminders', 'calendar', 'local-search']
        .map((key) => client.invalidateQueries({ queryKey: [key] })))
    } catch {
      Alert.alert('Не удалось изменить избранное', 'Повторите попытку. Запись сохранена.')
    }
  }, [client])
  return <FavoriteActions.Provider value={toggle}>{children}</FavoriteActions.Provider>
}
