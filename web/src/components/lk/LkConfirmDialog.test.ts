import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LkConfirmDialog from './LkConfirmDialog.vue'

describe('LkConfirmDialog', () => {
  it('renders the title, message and Russian Да/Отмена labels by default', () => {
    const wrapper = mount(LkConfirmDialog, {
      props: { title: 'Подтвердите выполнение задачи' },
    })

    expect(wrapper.text()).toContain('Подтвердите выполнение задачи')
    expect(wrapper.find('.lk-confirm-dialog__confirm').text()).toBe('Да')
    expect(wrapper.find('.lk-confirm-dialog__cancel').text()).toBe('Отмена')
  })

  it('supports custom labels and an optional message', () => {
    const wrapper = mount(LkConfirmDialog, {
      props: {
        title: 'Удалить запись?',
        message: 'Это действие необратимо.',
        confirmLabel: 'Удалить',
        cancelLabel: 'Оставить',
      },
    })

    expect(wrapper.text()).toContain('Это действие необратимо.')
    expect(wrapper.find('.lk-confirm-dialog__confirm').text()).toBe('Удалить')
    expect(wrapper.find('.lk-confirm-dialog__cancel').text()).toBe('Оставить')
  })

  it('emits confirm when the confirm button is clicked', async () => {
    const wrapper = mount(LkConfirmDialog, { props: { title: 'Подтвердите выполнение задачи' } })

    await wrapper.find('.lk-confirm-dialog__confirm').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('emits cancel when the cancel button is clicked', async () => {
    const wrapper = mount(LkConfirmDialog, { props: { title: 'Подтвердите выполнение задачи' } })

    await wrapper.find('.lk-confirm-dialog__cancel').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('emits cancel when clicking the overlay outside the panel', async () => {
    const wrapper = mount(LkConfirmDialog, { props: { title: 'Подтвердите выполнение задачи' } })

    await wrapper.find('.lk-confirm-dialog__overlay').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('does not emit cancel when clicking inside the panel', async () => {
    const wrapper = mount(LkConfirmDialog, { props: { title: 'Подтвердите выполнение задачи' } })

    await wrapper.find('.lk-confirm-dialog__panel').trigger('click')

    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('emits cancel when Escape is pressed', async () => {
    const wrapper = mount(LkConfirmDialog, { props: { title: 'Подтвердите выполнение задачи' } })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
