import { inject, onUnmounted, provide, ref, watchEffect } from 'vue'
import type { InjectionKey, Ref } from 'vue'

/**
 * Реактивный «хвост» хлебных крошек: заголовок динамической сущности
 * (название списка покупок, заметки, напоминания), которая уже загружена
 * конкретной страницей. Общий на всю оболочку ЛК — предоставляется в
 * `LkLayout`, читается в `LkBreadcrumbs`, записывается страницами с
 * динамическим хвостом (`NoteEditView`, `ReminderEditView`).
 */
export type LkBreadcrumbTailRef = Ref<string | null>

export const LK_BREADCRUMB_TAIL_KEY: InjectionKey<LkBreadcrumbTailRef> = Symbol('lkBreadcrumbTail')

/**
 * Вызывается один раз в `LkLayout`: создаёт и предоставляет вниз по дереву
 * общий реактивный «хвост» крошек.
 */
export function provideLkBreadcrumbTail(): LkBreadcrumbTailRef {
  const tail = ref<string | null>(null)
  provide(LK_BREADCRUMB_TAIL_KEY, tail)
  return tail
}

/**
 * Вызывается в `LkBreadcrumbs`: читает текущее значение «хвоста» (без записи).
 * Вне `LkLayout` (например, в изолированных тестах) возвращает локальный
 * `ref(null)`, чтобы компонент не падал без провайдера.
 */
export function useLkBreadcrumbTail(): LkBreadcrumbTailRef {
  return inject(LK_BREADCRUMB_TAIL_KEY, null) ?? ref<string | null>(null)
}

/**
 * Вызывается в страницах с динамическим хвостом крошек: пока страница
 * смонтирована, пишет в общий «хвост» название уже загруженной сущности
 * (или `null`, пока она ещё грузится/не найдена — тогда `LkBreadcrumbs`
 * показывает многоточие вместо лишнего запроса). При размонтировании
 * страницы «хвост» очищается, чтобы не «протекать» на другие маршруты.
 */
export function useSetLkBreadcrumbTail(source: () => string | null): void {
  const tail = inject(LK_BREADCRUMB_TAIL_KEY, null)
  if (tail === null) {
    return
  }
  watchEffect(() => {
    tail.value = source()
  })
  onUnmounted(() => {
    tail.value = null
  })
}
