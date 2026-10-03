import { LK_STATUS_LABELS } from '@/constants/lkStatusColors'
import type { ShoppingListItem, ShoppingListType } from '@/types/shoppingList'

/** Plain text only: no private links, IDs, comments or implicit saves. */
export function noteShareText(title: string, body: string | null): string {
  return [title.trim(), body?.trim() ?? ''].filter(Boolean).join('\n\n')
}

export function listShareText(title: string, type: ShoppingListType, items: readonly Pick<ShoppingListItem, 'name' | 'is_checked' | 'status' | 'quantity'>[]): string {
  const heading = title.trim() || (type === 'tasks' ? 'Задача' : 'Список покупок')
  const lines = items.map((item) => {
    const done = item.is_checked || (type === 'tasks' && item.status === 'done')
    const quantity = type === 'goods' && item.quantity !== null && item.quantity > 0 && item.quantity !== 1
      ? ` × ${item.quantity}` : ''
    const status = type === 'tasks' ? ` — ${(LK_STATUS_LABELS[done ? 'done' : item.status] ?? LK_STATUS_LABELS.new)}` : ''
    return `${done ? '☑' : '☐'} ${item.name}${quantity}${status}`
  })
  return [heading, lines.join('\n')].filter(Boolean).join('\n\n')
}
