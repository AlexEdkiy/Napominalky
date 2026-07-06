import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import { LK_DESKTOP_QUERY, useLkBreakpoint } from './useLkBreakpoint'

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(event: MediaQueryListEvent) => void> = []
  const mql = {
    matches,
    media: LK_DESKTOP_QUERY,
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.push(listener)
    }),
    removeEventListener: vi.fn(),
  }
  return { mql, listeners }
}

const TestComponent = defineComponent({
  setup() {
    const { isDesktop } = useLkBreakpoint()
    return () => h('div', String(isDesktop.value))
  },
})

describe('useLkBreakpoint', () => {
  it('reflects matchMedia.matches on mount (desktop)', () => {
    const { mql } = mockMatchMedia(true)
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql))

    const wrapper = mount(TestComponent)
    expect(wrapper.text()).toBe('true')

    vi.unstubAllGlobals()
  })

  it('reflects matchMedia.matches on mount (mobile)', async () => {
    const { mql } = mockMatchMedia(false)
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql))

    const wrapper = mount(TestComponent)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('false')

    vi.unstubAllGlobals()
  })

  it('updates reactively when matchMedia change event fires', async () => {
    const { mql, listeners } = mockMatchMedia(true)
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql))

    const wrapper = mount(TestComponent)
    expect(wrapper.text()).toBe('true')

    listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toBe('false')
    vi.unstubAllGlobals()
  })

  it('removes the change listener on unmount', () => {
    const { mql } = mockMatchMedia(true)
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql))

    const wrapper = mount(TestComponent)
    wrapper.unmount()

    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    vi.unstubAllGlobals()
  })
})
