import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

import {
  provideLkBreadcrumbTail,
  useLkBreadcrumbTail,
  useSetLkBreadcrumbTail,
} from './useLkBreadcrumbTail'

const Child = defineComponent({
  props: { title: { type: String, default: null } },
  setup(props) {
    useSetLkBreadcrumbTail(() => props.title)
    return () => h('div', 'child')
  },
})

function makeHost() {
  return defineComponent({
    props: { showChild: { type: Boolean, default: true }, title: { type: String, default: null } },
    setup(props) {
      const tail = provideLkBreadcrumbTail()
      return () => h('div', [props.showChild ? h(Child, { title: props.title }) : null, h('span', tail.value ?? 'none')])
    },
  })
}

describe('useLkBreadcrumbTail', () => {
  it('writes the child page title into the shared tail ref', async () => {
    const wrapper = mount(makeHost(), { props: { title: 'Продукты' } })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Продукты')
  })

  it('clears the tail when the child page unmounts', async () => {
    const wrapper = mount(makeHost(), { props: { title: 'Продукты', showChild: true } })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Продукты')

    await wrapper.setProps({ showChild: false })
    expect(wrapper.text()).toContain('none')
  })

  it('reacts to a changing source (e.g. entity finishes loading)', async () => {
    const title = ref<string | null>(null)
    const Reactive = defineComponent({
      setup() {
        useSetLkBreadcrumbTail(() => title.value)
        return () => h('div', 'reactive-child')
      },
    })
    const Host = defineComponent({
      setup() {
        const tail = provideLkBreadcrumbTail()
        return () => h('div', [h(Reactive), h('span', tail.value ?? '…')])
      },
    })

    const wrapper = mount(Host)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('…')

    title.value = 'Загруженный список'
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Загруженный список')
  })

  it('useLkBreadcrumbTail returns a local null ref outside a provider (no crash)', () => {
    const Standalone = defineComponent({
      setup() {
        const tail = useLkBreadcrumbTail()
        return () => h('div', tail.value ?? 'empty')
      },
    })

    const wrapper = mount(Standalone)
    expect(wrapper.text()).toBe('empty')
  })
})
