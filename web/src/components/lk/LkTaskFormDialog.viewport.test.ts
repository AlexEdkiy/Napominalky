import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

import LkTaskFormDialog from './LkTaskFormDialog.vue'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  resetLkFormsForTests()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function setup(desktop = false) {
  const viewport = Object.assign(new EventTarget(), { height: 760, offsetTop: 0 })
  const media = Object.assign(new EventTarget(), { matches: desktop })
  vi.stubGlobal('visualViewport', viewport)
  vi.stubGlobal('matchMedia', vi.fn(() => media))
  return { viewport, media }
}

async function open() {
  wrapper = mount(LkTaskFormDialog)
  useLkForms().openTaskForm()
  await nextTick()
  return wrapper.get('.lk-form-dialog__overlay').element as HTMLElement
}

describe('task dialog visual viewport', () => {
  it('keeps the mobile overlay within the keyboard viewport and follows browser panning', async () => {
    const { viewport } = setup()
    const overlay = await open()
    expect(overlay.style.height).toBe('760px')

    viewport.height = 330
    viewport.offsetTop = 120
    viewport.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(overlay.style.height).toBe('330px')
    expect(overlay.style.top).toBe('120px')
    expect(overlay.style.bottom).toBe('auto')

    viewport.offsetTop = 180
    viewport.dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(overlay.style.top).toBe('180px')

    viewport.height = 760
    viewport.offsetTop = 0
    viewport.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(overlay.style.height).toBe('760px')
    expect(overlay.style.top).toBe('0px')
  })

  it('removes listeners on close/unmount and reads fresh geometry on reopen', async () => {
    const { viewport } = setup()
    const add = vi.spyOn(viewport, 'addEventListener')
    const remove = vi.spyOn(viewport, 'removeEventListener')
    await open()
    expect(add).toHaveBeenCalledTimes(2)
    useLkForms().closeForm()
    await nextTick()
    expect(remove).toHaveBeenCalledTimes(2)

    viewport.height = 400
    useLkForms().openTaskForm()
    await nextTick()
    expect((wrapper!.get('.lk-form-dialog__overlay').element as HTMLElement).style.height).toBe('400px')
    expect(add).toHaveBeenCalledTimes(4)
    wrapper!.unmount()
    wrapper = undefined
    expect(remove).toHaveBeenCalledTimes(4)
  })

  it('clears mobile geometry on switching to desktop and restores it on return', async () => {
    const { viewport, media } = setup()
    const overlay = await open()
    media.dispatchEvent(Object.assign(new Event('change'), { matches: true }))
    await nextTick()
    expect(overlay.style.height).toBe('')
    expect(overlay.style.top).toBe('')
    viewport.height = 350
    media.dispatchEvent(Object.assign(new Event('change'), { matches: false }))
    await nextTick()
    expect(overlay.style.height).toBe('350px')
  })

  it('keeps the CSS fallback when VisualViewport is unavailable', async () => {
    setup()
    vi.stubGlobal('visualViewport', undefined)
    const overlay = await open()
    expect(overlay.style.height).toBe('')
  })
})
