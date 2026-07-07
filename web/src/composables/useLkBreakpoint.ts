import { useMediaQuery } from '@/composables/useMediaQuery'

/**
 * Брейкпоинт desktop/mobile оболочки ЛК (см. design-бриф редизайна).
 */
export const LK_DESKTOP_QUERY = '(min-width: 1024px)'

/**
 * Брейкпоинт «широкого» десктопа — от него показывается right-rail раздела
 * «Задачи и списки» (мини-календарь + ближайшие напоминания). На десктопе
 * уже, но ещё не мобильном виде (1024–1279px) right-rail скрывается.
 */
export const LK_WIDE_DESKTOP_QUERY = '(min-width: 1280px)'

/**
 * Реактивно отслеживает раскладку ЛК (desktop-сайдбар vs mobile-шапка+таббар)
 * через `window.matchMedia`. До монтирования — desktop по умолчанию, чтобы
 * избежать мигания раскладки при обычной загрузке в браузере.
 */
export function useLkBreakpoint() {
  const { matches: isDesktop } = useMediaQuery(LK_DESKTOP_QUERY, true)
  return { isDesktop }
}

/**
 * Реактивно отслеживает «широкий десктоп» (см. `LK_WIDE_DESKTOP_QUERY`) —
 * используется для скрытия right-rail на средних экранах.
 */
export function useLkWideDesktop() {
  const { matches: isWideDesktop } = useMediaQuery(LK_WIDE_DESKTOP_QUERY, true)
  return { isWideDesktop }
}
