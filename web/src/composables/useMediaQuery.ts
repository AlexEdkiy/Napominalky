import { onMounted, onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'

/**
 * Реактивно отслеживает произвольный CSS media-query через `window.matchMedia`.
 * До монтирования возвращает `defaultValue`, чтобы избежать мигания раскладки
 * при обычной загрузке в браузере (SSR здесь не используется).
 */
export function useMediaQuery(query: string, defaultValue = true): { matches: Ref<boolean> } {
  const matches = ref(defaultValue)
  let mediaQueryList: MediaQueryList | null = null

  function handleChange(event: MediaQueryListEvent): void {
    matches.value = event.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    mediaQueryList = window.matchMedia(query)
    matches.value = mediaQueryList.matches
    mediaQueryList.addEventListener('change', handleChange)
  })

  onUnmounted(() => {
    mediaQueryList?.removeEventListener('change', handleChange)
  })

  return { matches }
}
