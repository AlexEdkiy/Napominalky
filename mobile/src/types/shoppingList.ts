export type ShoppingCategory = 'products' | 'household' | 'pharmacy' | 'other'

export interface ShoppingList {
  uuid: string
  title: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ShoppingListItem {
  uuid: string
  shopping_list_uuid: string
  name: string
  category: ShoppingCategory
  is_checked: boolean
  position: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}
