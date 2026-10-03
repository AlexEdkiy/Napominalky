import { TASK_STATUS_LABELS } from '@/constants/taskStatus'
import type { ShoppingListItem, ListType } from '@/db/repositories/shoppingListsRepo'

/** Plain text only: no private links, IDs, comments or implicit saves. */
export const noteShareText = (title: string, body: string | null): string =>
  [title.trim(), body?.trim() ?? ''].filter(Boolean).join('\n\n')

export const listShareText = (title: string, type: ListType, items: readonly Pick<ShoppingListItem, 'name' | 'isChecked' | 'status' | 'quantity'>[]): string => {
  const heading = title.trim() || (type === 'tasks' ? 'Задача' : 'Список покупок')
  const lines = items.map((item) => {
    const done = item.isChecked || (type === 'tasks' && item.status === 'done')
    const quantity = type === 'goods' && item.quantity > 0 && item.quantity !== 1 ? ` × ${item.quantity}` : ''
    const status = type === 'tasks' ? ` — ${(TASK_STATUS_LABELS[done ? 'done' : item.status] ?? TASK_STATUS_LABELS.new)}` : ''
    return `${done ? '☑' : '☐'} ${item.name}${quantity}${status}`
  })
  return [heading, lines.join('\n')].filter(Boolean).join('\n\n')
}
