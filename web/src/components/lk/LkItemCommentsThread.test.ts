import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LkItemCommentsThread from './LkItemCommentsThread.vue'
import type { ShoppingListItemComment } from '@/types/shoppingList'

function makeComment(overrides: Partial<ShoppingListItemComment> = {}): ShoppingListItemComment {
  return {
    uuid: 'c-1',
    author_name: 'Анна',
    body: 'Взять образец плитки',
    created_at: '2026-03-05T14:30:00',
    ...overrides,
  }
}

function mountThread(comments: ShoppingListItemComment[] = [], focusSignal = 0) {
  return mount(LkItemCommentsThread, {
    props: { comments, accentColor: '#17897a', focusSignal },
  })
}

describe('LkItemCommentsThread — список комментариев', () => {
  it('renders each comment with the author, «HH:MM DD.MM.YY» time and body', () => {
    const wrapper = mountThread([
      makeComment(),
      makeComment({ uuid: 'c-2', author_name: 'Пётр', body: 'Уже взял', created_at: '2026-03-06T09:05:00' }),
    ])

    const items = wrapper.findAll('.lk-comments-thread__item')
    expect(items).toHaveLength(2)
    expect(items[0]?.find('.lk-comments-thread__author').text()).toBe('Анна')
    // Формат времени — «HH:MM DD.MM.YY» (локальная зона; ISO без зоны — как есть).
    expect(items[0]?.find('.lk-comments-thread__time').text()).toBe('14:30 05.03.26')
    expect(items[0]?.find('.lk-comments-thread__body').text()).toBe('Взять образец плитки')
    expect(items[1]?.find('.lk-comments-thread__author').text()).toBe('Пётр')
    expect(items[1]?.find('.lk-comments-thread__time').text()).toBe('09:05 06.03.26')
  })

  it('shows the empty state when the thread has no comments', () => {
    const wrapper = mountThread([])
    expect(wrapper.text()).toContain('Комментариев пока нет')
    expect(wrapper.findAll('.lk-comments-thread__item')).toHaveLength(0)
    // Форма ввода доступна и в пустом состоянии.
    expect(wrapper.find('textarea').exists()).toBe(true)
  })
})

describe('LkItemCommentsThread — форма отправки', () => {
  it('disables «Отправить» for an empty/whitespace draft and enables it for text', async () => {
    const wrapper = mountThread()
    const send = wrapper.find('.lk-comments-thread__send')
    expect(send.text()).toBe('Отправить')
    expect(send.attributes('disabled')).toBeDefined()

    await wrapper.find('textarea').setValue('   ')
    expect(send.attributes('disabled')).toBeDefined()

    await wrapper.find('textarea').setValue('Новый комментарий')
    expect(send.attributes('disabled')).toBeUndefined()
  })

  it('emits submit with the trimmed body on the button click and clears the draft', async () => {
    const wrapper = mountThread([makeComment()])
    await wrapper.find('textarea').setValue('  Новый комментарий  ')
    await wrapper.find('.lk-comments-thread__send').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([['Новый комментарий']])
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('submits on Enter and does NOT submit on Shift+Enter (перенос строки)', async () => {
    const wrapper = mountThread()
    const textarea = wrapper.find('textarea')

    await textarea.setValue('Первый')
    await textarea.trigger('keydown.enter', { shiftKey: true })
    expect(wrapper.emitted('submit')).toBeUndefined()

    await textarea.trigger('keydown.enter')
    expect(wrapper.emitted('submit')).toEqual([['Первый']])
  })

  it('does not emit submit for an empty draft on Enter', async () => {
    const wrapper = mountThread()
    await wrapper.find('textarea').trigger('keydown.enter')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('focuses the textarea when the focusSignal is set (кнопка 💬 в строке)', async () => {
    const wrapper = mount(LkItemCommentsThread, {
      props: { comments: [], accentColor: '#17897a', focusSignal: 1 },
      attachTo: document.body,
    })
    // watch immediate + nextTick — фокус после монтирования панели.
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(document.activeElement).toBe(wrapper.find('textarea').element)
    wrapper.unmount()
  })
})
