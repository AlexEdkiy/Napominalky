import { remindersRepo } from '@/db/repositories/remindersRepo'
import { shoppingListsRepo } from '@/db/repositories/shoppingListsRepo'

/**
 * Переустанавливает локальные уведомления для всех ещё не наступивших
 * напоминаний (основных и пунктов списков покупок) при старте приложения
 * (FR-27/28). Системные alarm на Android могут быть потеряны после
 * перезагрузки устройства или переустановки приложения — без этого прохода
 * такие напоминания никогда не сработают. Best-effort: ошибка одной из
 * репозиторных операций не должна ронять запуск приложения.
 */
export const rescheduleAllNotificationsOnStart = async (): Promise<void> => {
  await Promise.allSettled([
    remindersRepo.rescheduleAllPending(),
    shoppingListsRepo.rescheduleAllPendingItems(),
  ])
}
