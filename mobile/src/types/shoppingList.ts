export type ShoppingCategory = 'products' | 'household' | 'pharmacy' | 'other'

export type ListType = 'goods' | 'tasks'

export interface ShoppingList {
  uuid: string
  title: string
  type: ListType
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ShoppingListItem {
  uuid: string
  shopping_list_uuid: string
  name: string
  category: ShoppingCategory
  quantity: number
  deadline: string | null
  is_checked: boolean
  position: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}
