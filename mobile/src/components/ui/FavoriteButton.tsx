import React, { createContext, useContext, useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { FavoriteEntity } from '@/db/repositories/favoritesRepo'
import { useTheme } from '@/theme'

export const FavoriteActions = createContext<((entity: FavoriteEntity, uuid: string) => Promise<void>) | null>(null)
interface Props { entity: FavoriteEntity; uuid: string; title: string; favorite?: boolean | undefined }

const FavoriteButton: React.FC<Props> = ({ entity, uuid, title, favorite = false }) => {
  const toggle = useContext(FavoriteActions)
  const { colors } = useTheme()
  const [pending, setPending] = useState(false)
  return <Pressable accessibilityRole="button"
    accessibilityLabel={`${favorite ? 'Убрать из избранного' : 'В избранное'}: ${title}`}
    accessibilityState={{ selected: favorite, disabled: pending || !toggle }}
    disabled={pending || !toggle} style={styles.button}
    onPress={(event) => {
      event.stopPropagation()
      if (!toggle || pending) return
      setPending(true)
      void toggle(entity, uuid).finally(() => setPending(false))
    }}>
    <Ionicons name={favorite ? 'star' : 'star-outline'} size={favorite ? 21 : 15}
      color={favorite ? colors.amber : colors.textTertiary} />
  </Pressable>
}
const styles = StyleSheet.create({ button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' } })
export default FavoriteButton
