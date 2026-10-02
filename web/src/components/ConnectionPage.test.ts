import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ConnectionPage from './ConnectionPage.vue'
import { reportConnectionLost, retryConnection, useConnection } from '@/connection'

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } })))
  await retryConnection()
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('shows the requested text, prevents Escape from closing an underlying draft and restores body scroll', async () => {
  document.body.style.overflow = 'auto'
  const underlyingEscape = vi.fn()
  window.addEventListener('keydown', underlyingEscape)
  reportConnectionLost()
  const wrapper = mount(ConnectionPage, { attachTo: document.body })
  expect(wrapper.text()).toContain('Что-то пошло не так.')
  expect(wrapper.text()).toContain('Проверьте подключение к интернету')
  expect(document.body.style.overflow).toBe('hidden')
  await wrapper.get('button').trigger('keydown', { key: 'Escape' })
  expect(underlyingEscape).not.toHaveBeenCalled()
  const cancel = new Event('cancel', { cancelable: true })
  wrapper.get('dialog').element.dispatchEvent(cancel)
  expect(cancel.defaultPrevented).toBe(true)
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(useConnection().unavailable.value).toBe(false)
  wrapper.unmount()
  expect(document.body.style.overflow).toBe('auto')
  document.body.style.overflow = ''
  window.removeEventListener('keydown', underlyingEscape)
})
