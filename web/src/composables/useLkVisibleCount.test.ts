import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'

import {
  LK_VISIBLE_COUNT_DEBOUNCE_MS,
  computeVisibleCount,
  useLkVisibleCount,
} from './useLkVisibleCount'
import type { LkVisibleCountOptions } from './useLkVisibleCount'

const ORIGINAL_INNER_HEIGHT = window.innerHeight

function setInnerHeight(value: number): void {
  Object.defineProperty(window, 'innerHeight', { value, writable: true, configurable: true })
}

/** Монтирует контейнер-«пустышку» и подключает composable (jsdom: rect.top = 0). */
function mountWithVisibleCount(options: LkVisibleCountOptions) {
  let result: ReturnType<typeof useLkVisibleCount> | undefined
  const TestComponent = defineComponent({
    setup() {
      const container = ref<HTMLElement | null>(null)
      result = useLkVisibleCount(container, options)
      return () => h('div', { ref: container })
    },
  })
  const wrapper = mount(TestComponent)
  return { wrapper, result: result! }
}

describe('computeVisibleCount', () => {
  it('делит доступную высоту на высоту строки с округлением вниз', () => {
    expect(computeVisibleCount(250, 48, 1, 100)).toBe(5)
    expect(computeVisibleCount(239, 48, 1, 100)).toBe(4)
  })

  it('зажимает результат в [minCount, maxCount]', () => {
    expect(computeVisibleCount(60, 48, 3, 8)).toBe(3)
    expect(computeVisibleCount(10_000, 48, 3, 8)).toBe(8)
  })

  it('возвращает minCount при некорректной высоте строки', () => {
    expect(computeVisibleCount(500, 0, 3, 8)).toBe(3)
    expect(computeVisibleCount(500, -10, 3, 8)).toBe(3)
  })
})

describe('useLkVisibleCount', () => {
  afterEach(() => {
    setInnerHeight(ORIGINAL_INNER_HEIGHT)
    vi.useRealTimers()
  })

  it('меряет доступную высоту на mount: (innerHeight - top - reservedBottom) / rowHeight', () => {
    setInnerHeight(290)
    const { wrapper, result } = mountWithVisibleCount({
      rowHeight: 48,
      reservedBottom: 40,
      minCount: 1,
      maxCount: 100,
    })

    // (290 - 0 - 40) / 48 = 5.2 → 5
    expect(result.visibleCount.value).toBe(5)
    wrapper.unmount()
  })

  it('пересчитывает по resize окна с дебаунсом (несколько событий — один пересчёт)', async () => {
    vi.useFakeTimers()
    setInnerHeight(290)
    const { wrapper, result } = mountWithVisibleCount({
      rowHeight: 48,
      reservedBottom: 40,
      minCount: 1,
      maxCount: 100,
    })
    expect(result.visibleCount.value).toBe(5)

    setInnerHeight(520)
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))

    // До истечения дебаунса значение не меняется.
    expect(result.visibleCount.value).toBe(5)
    vi.advanceTimersByTime(LK_VISIBLE_COUNT_DEBOUNCE_MS)
    // (520 - 40) / 48 = 10
    expect(result.visibleCount.value).toBe(10)
    wrapper.unmount()
  })

  it('перестаёт слушать resize после unmount', () => {
    vi.useFakeTimers()
    setInnerHeight(290)
    const { wrapper, result } = mountWithVisibleCount({
      rowHeight: 48,
      reservedBottom: 40,
      minCount: 1,
      maxCount: 100,
    })
    wrapper.unmount()

    setInnerHeight(520)
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(LK_VISIBLE_COUNT_DEBOUNCE_MS)

    expect(result.visibleCount.value).toBe(5)
  })
})
