import { t, useLanguage } from '@/i18n'
import React, { useCallback, type PropsWithChildren } from 'react'
import { Alert } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { FavoriteActions } from '@/components/ui/FavoriteButton'
import { favoritesRepo, type FavoriteEntity } from '@/db/repositories/favoritesRepo'

export default function FavoritesProvider({ children }: PropsWithChildren): React.JSX.Element {
  useLanguage()
  const client = useQueryClient()
  const toggle = useCallback(async (entity: FavoriteEntity, uuid: string) => {
    try {
      await favoritesRepo.toggle(entity, uuid)
      await Promise.all(['shopping-lists', 'notes', 'reminders', 'calendar', 'local-search']
        .map((key) => client.invalidateQueries({ queryKey: [key] })))
    } catch {
      Alert.alert(t("Не удалось изменить избранное"), t("Повторите попытку. Запись сохранена."))
    }
  }, [client])
  return <FavoriteActions.Provider value={toggle}>{children}</FavoriteActions.Provider>
}
