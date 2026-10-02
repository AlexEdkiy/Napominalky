import { afterEach, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LkMobileHeader from './LkMobileHeader.vue'

let wrapper: VueWrapper | undefined
afterEach(() => { wrapper?.unmount(); wrapper = undefined })
it('expands the mobile search, forwards a trimmed submission and collapses it', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/lk', name: 'lk-dashboard', component: { template: '<div />' } },
    { path: '/lk/account', name: 'lk-account', component: { template: '<div />' } },
  ] })
  await router.push('/lk')
  wrapper = mount(LkMobileHeader, { props: { title: 'Главная', subtitle: '', searchQuery: 'Старое' }, global: { plugins: [router, createPinia()] } })
  await wrapper.get('[aria-label="Поиск"]').trigger('click')
  expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('Старое')
  await wrapper.get('input[type="search"]').setValue('  Новое  ')
  await wrapper.get('form').trigger('submit')
  expect(wrapper.emitted('search')).toEqual([['Новое']])
  expect(wrapper.find('input[type="search"]').exists()).toBe(false)
})
