import { onMounted, onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'

/** Пауза дебаунса пересчёта видимого числа строк при resize (мс). */
export const LK_VISIBLE_COUNT_DEBOUNCE_MS = 150

export interface LkVisibleCountOptions {
  /** Высота одной строки списка в px — должна совпадать с фактической высотой строки в CSS. */
  rowHeight: number
  /** Зарезервированный запас снизу (нижний паддинг карточки, отступ до края экрана). */
  reservedBottom?: number
  /** Минимум видимых строк (фолбэк на низких экранах). */
  minCount?: number
  /** Максимум видимых строк (чтобы панель не «съедала» весь огромный монитор). */
  maxCount?: number
}

/** floor(доступная высота / высота строки), зажатое в [minCount, maxCount]. */
export function computeVisibleCount(
  availableHeight: number,
  rowHeight: number,
  minCount: number,
  maxCount: number,
): number {
  if (rowHeight <= 0) {
    return minCount
  }
  const raw = Math.floor(availableHeight / rowHeight)
  return Math.min(maxCount, Math.max(minCount, raw))
}

/**
 * Считает, сколько строк фиксированной высоты помещается от верха контейнера
 * до низа окна (минус `reservedBottom`), — для адаптивных списков вроде
 * панели «Задачи» на Обзоре. Пересчитывает при `resize` окна (с дебаунсом) и,
 * если доступен `ResizeObserver`, при изменении высоты контента страницы
 * (наблюдение за `document.body` — контейнер мог сместиться по вертикали).
 */
export function useLkVisibleCount(container: Ref<HTMLElement | null>, options: LkVisibleCountOptions) {
  const { rowHeight, reservedBottom = 0, minCount = 1, maxCount = 100 } = options
  const visibleCount = ref(minCount)
  let debounceTimer: number | null = null
  let observer: ResizeObserver | null = null

  /** Пересчёт по фактическому положению контейнера: от его верха до низа окна. */
  function measure(): void {
    const element = container.value
    if (element === null) {
      return
    }
    const available = window.innerHeight - element.getBoundingClientRect().top - reservedBottom
    visibleCount.value = computeVisibleCount(available, rowHeight, minCount, maxCount)
  }

  function scheduleMeasure(): void {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer)
    }
    debounceTimer = window.setTimeout(measure, LK_VISIBLE_COUNT_DEBOUNCE_MS)
  }

  onMounted(() => {
    measure()
    window.addEventListener('resize', scheduleMeasure)
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleMeasure)
      observer.observe(document.body)
    }
  })

  onUnmounted(() => {
    window.removeEventListener('resize', scheduleMeasure)
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer)
    }
    observer?.disconnect()
  })

  return { visibleCount, measure }
}
