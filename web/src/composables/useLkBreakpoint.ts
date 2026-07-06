import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Брейкпоинт desktop/mobile оболочки ЛК (см. design-бриф редизайна).
 */
export const LK_DESKTOP_QUERY = '(min-width: 1024px)'

/**
 * Реактивно отслеживает раскладку ЛК (desktop-сайдбар vs mobile-шапка+таббар)
 * через `window.matchMedia`. До монтирования — desktop по умолчанию, чтобы
 * избежать мигания раскладки при обычной загрузке в браузере.
 */
export function useLkBreakpoint() {
  const isDesktop = ref(true)
  let mediaQueryList: MediaQueryList | null = null

  function handleChange(event: MediaQueryListEvent): void {
    isDesktop.value = event.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    mediaQueryList = window.matchMedia(LK_DESKTOP_QUERY)
    isDesktop.value = mediaQueryList.matches
    mediaQueryList.addEventListener('change', handleChange)
  })

  onUnmounted(() => {
    mediaQueryList?.removeEventListener('change', handleChange)
  })

  return { isDesktop }
}
