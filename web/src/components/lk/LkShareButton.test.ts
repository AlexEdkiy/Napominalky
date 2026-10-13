import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import LkShareButton from './LkShareButton.vue'
import { telegramShareUrl } from '@/utils/telegramShare'

enableAutoUnmount(afterEach)
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })

it('renders the outline share icon with an accessible Telegram label', () => {
  const wrapper = mount(LkShareButton, { props: { text: 'Заметка' } })
  const button = wrapper.get('button')
  expect(button.attributes('aria-label')).toBe('Поделиться в Telegram')
  expect(button.text()).toBe('')
  expect(button.find('svg').exists()).toBe(true)
  expect(wrapper.find('a').exists()).toBe(false)
})

it('copies before launching Telegram and leaves only the icon after sharing', async () => {
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
  expect(open).toHaveBeenCalledWith(telegramShareUrl(text), '_self')
  expect(writeText.mock.invocationCallOrder[0]).toBeLessThan(open.mock.invocationCallOrder[0]!)
  expect(button.attributes('disabled')).toBeDefined()
  await button.trigger('click')
  expect(open).toHaveBeenCalledTimes(1)
  expect(osShare).not.toHaveBeenCalled()
  finish()
  await flushPromises()
  expect(button.attributes('disabled')).toBeUndefined()
  expect(wrapper.text()).toBe('')
  expect(wrapper.findAll('button')).toHaveLength(1)
  expect(wrapper.find('a').exists()).toBe(false)
  expect(document.querySelector('.lk-share__notice, .lk-share__overlay')).toBeNull()
})

it.each(['missing', 'denied'])('shares quietly through the URI when the backup clipboard is %s', async state => {
  vi.stubGlobal('navigator', state === 'missing' ? {} : {
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
  })
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const text = 'Полный текст & # ? 🚀'
  const wrapper = mount(LkShareButton, { props: { text } })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(new URL(open.mock.calls[0]![0] as string).searchParams.get('text')).toBe(text)
  expect(wrapper.text()).toBe('')
  expect(document.querySelector('.lk-share__notice, .lk-share__overlay')).toBeNull()
})

it('copies an oversized message without truncating and only shows a temporary notice outside the form', async () => {
  vi.useFakeTimers()
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const text = '<script>текст & # ?</script>\n'.repeat(500)
  const wrapper = mount(LkShareButton, { props: { text } })
  await wrapper.get('button').trigger('click')
  await vi.advanceTimersByTimeAsync(1)
  expect(writeText).toHaveBeenCalledWith(text)
  expect(open).toHaveBeenCalledWith('tg://', '_self')
  expect(wrapper.text()).toBe('')
  expect(document.querySelector('[role="status"]')?.textContent).toContain('Полный текст скопирован')
  expect(document.querySelector('.lk-share__overlay')).toBeNull()
  await vi.advanceTimersByTimeAsync(6000)
  expect(document.querySelector('[role="status"]')).toBeNull()
})

it('reports an actual launch error without inserting a block or links into the form', async () => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  vi.spyOn(window, 'open').mockImplementation(() => { throw new Error('Denied') })
  const wrapper = mount(LkShareButton, { props: { text: 'Заметка' } })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toBe('')
  expect(wrapper.find('a').exists()).toBe(false)
  expect(document.querySelector('[role="status"]')?.textContent).toContain('Не удалось открыть Telegram')
})

it('offers the full text in a separate dismissible dialog only when both transfer paths fail', async () => {
  vi.stubGlobal('navigator', {})
  vi.spyOn(window, 'open').mockReturnValue(null)
  const text = '<script>Полный текст</script>\n'.repeat(500)
  const wrapper = mount(LkShareButton, { props: { text }, attachTo: document.body })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(wrapper.find('textarea').exists()).toBe(false)
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
  const textarea = dialog.querySelector('textarea')!
  const close = dialog.querySelector('button')!
  expect(textarea.value).toBe(text)
  expect(document.activeElement).toBe(textarea)
  expect(textarea.selectionEnd - textarea.selectionStart).toBe(text.length)
  expect(dialog.querySelector('script')).toBeNull()
  textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }))
  expect(document.activeElement).toBe(close)
  close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
  expect(document.activeElement).toBe(textarea)
  const parentEscape = vi.fn()
  window.addEventListener('keydown', parentEscape)
  try {
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await wrapper.vm.$nextTick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(wrapper.get('button').element)
    expect(parentEscape).not.toHaveBeenCalled()
  } finally {
    window.removeEventListener('keydown', parentEscape)
  }
})

it.each(['changed', 'unmounted'] as const)('does not show stale feedback after the form is %s', async state => {
  let finish!: (value: boolean) => void
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(() => new Promise(resolve => { finish = resolve })) } })
  vi.spyOn(window, 'open').mockReturnValue(null)
  const wrapper = mount(LkShareButton, { props: { text: 'Старый текст'.repeat(1000) } })
  await wrapper.get('button').trigger('click')
  if (state === 'changed') await wrapper.setProps({ text: 'Новый текст' })
  else wrapper.unmount()
  finish(true)
  await flushPromises()
  expect(document.querySelector('.lk-share__notice, .lk-share__overlay')).toBeNull()
})

it.each([{ text: '', disabled: false }, { text: 'Неполный список', disabled: true }])('does not share unavailable data', async props => {
  const writeText = vi.fn()
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const wrapper = mount(LkShareButton, { props })
  await wrapper.get('button').trigger('click')
  expect(writeText).not.toHaveBeenCalled()
  expect(open).not.toHaveBeenCalled()
})
