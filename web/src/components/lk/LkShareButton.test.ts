import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import LkShareButton from './LkShareButton.vue'
enableAutoUnmount(afterEach)
afterEach(() => vi.unstubAllGlobals())

it('passes only plain text to the native share sheet and blocks repeated clicks', async () => {
  let finish: (() => void) | undefined
  const share = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
  vi.stubGlobal('navigator', { share })
  const wrapper = mount(LkShareButton, { props: { text: 'Заметка\n\nТекст 🚀' } })
  await wrapper.get('button').trigger('click')
  expect(share).toHaveBeenCalledWith({ text: 'Заметка\n\nТекст 🚀' })
  expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  finish?.()
  await flushPromises()
  expect(wrapper.find('textarea').exists()).toBe(false)
})

it.each(['AbortError', 'NotAllowedError'])('handles %s without claiming that a message was sent', async (name) => {
  vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('Share failed', name)) })
  const wrapper = mount(LkShareButton, { props: { text: 'Текст' } })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(wrapper.find('textarea').exists()).toBe(name !== 'AbortError')
  expect(wrapper.text()).not.toContain('Отправлено')
})

it('offers full text and clipboard fallback when Web Share is absent', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  const text = '<script>текст</script>\n'.repeat(500)
  const wrapper = mount(LkShareButton, { props: { text } })
  await wrapper.get('button').trigger('click')
  expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(text)
  await wrapper.get('.lk-share__actions button').trigger('click')
  await flushPromises()
  expect(writeText).toHaveBeenCalledWith(text)
  expect(wrapper.get('a').attributes('href')).toBe('https://web.telegram.org/')
  expect(wrapper.find('script').exists()).toBe(false)
  expect(wrapper.get('[role="status"]').text()).toContain('скопирован')
  await wrapper.setProps({ text: 'Новая версия' })
  expect(wrapper.find('[role="status"]').exists()).toBe(false)
})

it('allows manual copying if clipboard access is denied', async () => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
  const wrapper = mount(LkShareButton, { props: { text: 'Скопировать вручную' } })
  await wrapper.get('button').trigger('click')
  await wrapper.get('.lk-share__actions button').trigger('click')
  await flushPromises()
  expect(wrapper.get('[role="status"]').text()).toContain('вручную')
  const textarea = wrapper.get('textarea').element as HTMLTextAreaElement
  expect(textarea.selectionEnd - textarea.selectionStart).toBe(textarea.value.length)
})

it.each([{ text: '', disabled: false }, { text: 'Неполный список', disabled: true }])('does not share empty or unavailable data', async props => {
  const share = vi.fn()
  vi.stubGlobal('navigator', { share })
  const wrapper = mount(LkShareButton, { props })
  await wrapper.get('button').trigger('click')
  expect(share).not.toHaveBeenCalled()
})
