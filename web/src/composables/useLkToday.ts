import { onMounted, onUnmounted, ref } from 'vue'
import { ymd } from '@/utils/calendar'

/** Локальный день браузера: обновление в полночь и после сна/возврата на вкладку. */
export function useLkToday() {
  const today = ref(new Date())
  let timer: ReturnType<typeof setTimeout> | undefined
  function refresh(): void {
    const now = new Date()
    if (ymd(now) !== ymd(today.value)) today.value = now
    clearTimeout(timer)
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 50)
  }
  onMounted(() => {
    refresh()
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
  })
  onUnmounted(() => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', refresh)
    window.removeEventListener('focus', refresh)
  })
  return today
}
