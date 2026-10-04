import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import LkShareButton from './LkShareButton.vue'

enableAutoUnmount(afterEach)
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('renders only the Telegram icon with an accessible label', () => {
  const wrapper = mount(LkShareButton, { props: { text: 'Заметка' } })
  const button = wrapper.get('button')
  expect(button.attributes('aria-label')).toBe('Поделиться в Telegram')
  expect(button.text()).toBe('')
  expect(button.find('svg').exists()).toBe(true)
  expect(wrapper.find('a').exists()).toBe(false)
})

it('starts copying before directly opening Telegram in the click, without the OS share sheet', async () => {
  let finish!: () => void
  const writeText = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
  const osShare = vi.fn()
  vi.stubGlobal('navigator', { share: osShare, clipboard: { writeText } })
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const text = 'Заметка\n\nТекст 🚀'
  const wrapper = mount(LkShareButton, { props: { text } })
  const button = wrapper.get('button')
  await button.trigger('click')
  expect(writeText).toHaveBeenCalledWith(text)
  expect(open).toHaveBeenCalledWith('https://web.telegram.org/', '_blank', 'noopener,noreferrer')
  expect(writeText.mock.invocationCallOrder[0]).toBeLessThan(open.mock.invocationCallOrder[0]!)
  expect(button.attributes('disabled')).toBeDefined()
  await button.trigger('click')
  expect(open).toHaveBeenCalledTimes(1)
  expect(osShare).not.toHaveBeenCalled()
  finish()
  await flushPromises()
  expect(button.attributes('disabled')).toBeUndefined()
  expect(wrapper.get('[role="status"]').text()).toContain('Текст скопирован')
  expect(wrapper.find('textarea').exists()).toBe(false)
  expect(wrapper.text()).not.toContain('Отправлено')
})

it('copies the full text without putting content or a website URL into the Telegram link', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const text = '<script>текст & # ?</script>\n'.repeat(500)
  const wrapper = mount(LkShareButton, { props: { text } })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(writeText).toHaveBeenCalledWith(text)
  expect(open.mock.calls[0]?.[0]).toBe('https://web.telegram.org/')
  const link = wrapper.get('a')
  expect(link.attributes('href')).toBe('https://web.telegram.org/')
  expect(link.attributes('rel')).toBe('noopener noreferrer')
  expect(wrapper.find('script').exists()).toBe(false)
  await wrapper.setProps({ text: 'Новая версия' })
  expect(wrapper.find('[role="status"]').exists()).toBe(false)
})

it.each(['missing', 'denied'])('keeps full text available for manual copying when clipboard is %s', async state => {
  vi.stubGlobal('navigator', state === 'missing' ? {} : {
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
  })
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const text = '<script>Скопировать вручную</script>\nПолный текст'
  const wrapper = mount(LkShareButton, { props: { text } })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(open).toHaveBeenCalledTimes(1)
  expect(wrapper.get('[role="status"]').text()).toContain('Не удалось скопировать автоматически')
  const textarea = wrapper.get('textarea').element as HTMLTextAreaElement
  expect(textarea.value).toBe(text)
  expect(textarea.selectionEnd - textarea.selectionStart).toBe(text.length)
  expect(wrapper.find('script').exists()).toBe(false)
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  await wrapper.get('.lk-share__actions button').trigger('click')
  await flushPromises()
  expect(writeText).toHaveBeenCalledWith(text)
  expect(open).toHaveBeenCalledTimes(1)
  expect(wrapper.find('textarea').exists()).toBe(false)
})

it('keeps the direct link usable if opening the popup throws', async () => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  vi.spyOn(window, 'open').mockImplementation(() => { throw new Error('Popup denied') })
  const wrapper = mount(LkShareButton, { props: { text: 'Заметка' } })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(wrapper.get('a').attributes('href')).toBe('https://web.telegram.org/')
  expect(wrapper.get('[role="status"]').text()).toContain('скопирован')
})

it('does not confirm a stale copy when text changes while the clipboard is pending', async () => {
  let finish!: () => void
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(() => new Promise<void>(resolve => { finish = resolve })) } })
  vi.spyOn(window, 'open').mockReturnValue(null)
  const wrapper = mount(LkShareButton, { props: { text: 'Старый текст' } })
  await wrapper.get('button').trigger('click')
  await wrapper.setProps({ text: 'Новый текст' })
  finish()
  await flushPromises()
  expect(wrapper.find('[role="status"]').exists()).toBe(false)
})

it.each([{ text: '', disabled: false }, { text: 'Неполный список', disabled: true }])('does not copy or open Telegram for unavailable data', async props => {
  const writeText = vi.fn()
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const wrapper = mount(LkShareButton, { props })
  await wrapper.get('button').trigger('click')
  expect(writeText).not.toHaveBeenCalled()
  expect(open).not.toHaveBeenCalled()
})
