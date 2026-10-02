import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import SearchView from './SearchView.vue'
import { searchApi } from '@/api/searchApi'
import { notesApi } from '@/api/notesApi'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { useAuthStore } from '@/stores/authStore'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { SearchResult } from '@/types/search'
import type { PaginatedResponse } from '@/types/api'

vi.mock('@/api/searchApi', () => ({ searchApi: { search: vi.fn() } }))
vi.mock('@/api/notesApi', () => ({ notesApi: { fetchNote: vi.fn() } }))
vi.mock('@/api/remindersApi', () => ({ remindersApi: { fetchReminder: vi.fn() } }))
vi.mock('@/api/shoppingListsApi', () => ({ shoppingListsApi: { fetchList: vi.fn() } }))

const result: SearchResult = { type: 'note', uuid: 'n1', title: 'Молоко', excerpt: 'Купить молоко завтра', list_uuid: null, list_title: null, list_type: null, is_completed: false, is_archived: false, updated_at: '2026-10-02T00:00:00Z' }
function response(data = [result], total = data.length, currentPage = 1): PaginatedResponse<SearchResult> {
  return { data, meta: { current_page: currentPage, last_page: Math.max(1, Math.ceil(total / 20)), total, per_page: 20 }, links: { first: null, last: null, next: null, prev: null } }
}
let wrapper: VueWrapper | undefined
let pinia: ReturnType<typeof createPinia>
beforeEach(() => {
  vi.resetAllMocks()
  resetLkFormsForTests()
  pinia = createPinia(); setActivePinia(pinia)
  useAuthStore().setToken('test-search-token')
  vi.mocked(searchApi.search).mockResolvedValue(response())
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined; resetLkFormsForTests(); localStorage.clear() })
async function setup(path = '/lk/search?q=молоко') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/lk/search', name: 'lk-search', component: SearchView }] })
  await router.push(path); await router.isReady()
  wrapper = mount(SearchView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return router
}

it('does not request empty or too short queries and submits a trimmed query into the URL', async () => {
  const router = await setup('/lk/search')
  expect(searchApi.search).not.toHaveBeenCalled()
  await wrapper!.get('input[type="search"]').setValue('я')
  await wrapper!.get('form').trigger('submit'); await flushPromises()
  expect(wrapper!.text()).toContain('от 2 до 200')
  expect(searchApi.search).not.toHaveBeenCalled()
  await wrapper!.get('input[type="search"]').setValue('  молоко  ')
  await wrapper!.get('form').trigger('submit'); await flushPromises()
  expect(router.currentRoute.value.query.q).toBe('молоко')
  expect(searchApi.search).toHaveBeenCalledWith({ q: 'молоко', type: 'all', page: 1 }, expect.any(AbortSignal))
})

it('renders safe highlighted text, types, archive and completion flags', async () => {
  vi.mocked(searchApi.search).mockResolvedValue(response([{ ...result, title: '<img src=x> МОЛОКО', is_archived: true, is_completed: true }]))
  await setup()
  expect(wrapper!.find('img').exists()).toBe(false)
  expect(wrapper!.get('.lk-search__title mark').text()).toBe('МОЛОКО')
  expect(wrapper!.text()).toContain('В архиве')
  expect(wrapper!.text()).toContain('Выполнено')
})

it('keeps filters and pages in the URL and supports browser back', async () => {
  vi.mocked(searchApi.search).mockResolvedValue(response([result], 21))
  const router = await setup()
  await wrapper!.get('select').setValue('note'); await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ q: 'молоко', type: 'note' })
  await wrapper!.findAll('.lk-search__pages button').find(b => b.text() === 'Далее')!.trigger('click'); await flushPromises()
  expect(router.currentRoute.value.query.page).toBe('2')
  expect(searchApi.search).toHaveBeenLastCalledWith({ q: 'молоко', type: 'note', page: 2 }, expect.any(AbortSignal))
  router.back(); await flushPromises()
  expect(router.currentRoute.value.query.page).toBeUndefined()
})

it('aborts and ignores late results from an earlier query', async () => {
  let first!: (value: PaginatedResponse<SearchResult>) => void
  vi.mocked(searchApi.search).mockImplementationOnce(() => new Promise(resolve => { first = resolve }))
  const router = await setup()
  expect(wrapper!.text()).toContain('Ищем')
  const signal = vi.mocked(searchApi.search).mock.calls[0]![1]
  await router.push('/lk/search?q=хлеб'); await flushPromises()
  expect(signal.aborted).toBe(true)
  first(response([{ ...result, title: 'Устаревшая выдача' }]))
  await flushPromises()
  expect(wrapper!.text()).not.toContain('Устаревшая выдача')
})

it('shows a retryable error and an empty state, including repeated Enter', async () => {
  vi.mocked(searchApi.search).mockRejectedValueOnce(new Error('offline'))
  await setup()
  expect(wrapper!.get('[role="alert"]').text()).toContain('Не удалось выполнить поиск')
  vi.mocked(searchApi.search).mockResolvedValue(response([]))
  await wrapper!.get('form').trigger('submit'); await flushPromises()
  expect(wrapper!.text()).toContain('Ничего не найдено')
  expect(searchApi.search).toHaveBeenCalledTimes(2)
})

it('opens a note over the search page without changing the URL', async () => {
  const note = { uuid: 'n1', title: 'Молоко', body: 'Текст', color: 'teal' as const, is_pinned: false, is_archived: false, created_at: '', updated_at: '' }
  vi.mocked(notesApi.fetchNote).mockResolvedValue(note)
  const router = await setup()
  await wrapper!.get('.lk-search__title').trigger('click'); await flushPromises()
  expect(useLkForms().isNoteFormOpen.value).toBe(true)
  expect(useLkForms().noteFormNote.value).toEqual(note)
  expect(router.currentRoute.value.fullPath).toBe('/lk/search?q=молоко')
})

it('opens a matching item in its parent list and keeps its UUID for expansion', async () => {
  vi.mocked(searchApi.search).mockResolvedValue(response([{ ...result, type: 'item', uuid: 'i1', list_uuid: 'l1', list_title: 'Закупки', list_type: 'goods' }]))
  const list = { uuid: 'l1', title: 'Закупки', type: 'goods' as const, tags: [], items_count: 1, checked_items_count: 0, is_completed: false, status: 'new' as const, status_label: 'Новая', status_is_manual: false, created_at: '', updated_at: '' }
  vi.mocked(shoppingListsApi.fetchList).mockResolvedValue(list)
  await setup()
  await wrapper!.get('.lk-search__title').trigger('click'); await flushPromises()
  expect(shoppingListsApi.fetchList).toHaveBeenCalledWith('l1')
  expect(useLkForms().taskFormItemUuid.value).toBe('i1')
  expect(useLkForms().taskFormList.value).toEqual(list)
})

it('reports a deleted result and prevents a stale open after leaving the page', async () => {
  vi.mocked(notesApi.fetchNote).mockRejectedValueOnce(new Error('404'))
  await setup()
  await wrapper!.get('.lk-search__title').trigger('click'); await flushPromises()
  expect(wrapper!.get('[role="alert"]').text()).toContain('Не удалось открыть запись')
  let finish!: (value: Awaited<ReturnType<typeof notesApi.fetchNote>>) => void
  vi.mocked(notesApi.fetchNote).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  await wrapper!.get('.lk-search__title').trigger('click')
  wrapper!.unmount(); wrapper = undefined
  finish({ uuid: 'n1', title: 'Поздно', body: '', color: 'teal' as const, is_pinned: false, is_archived: false, created_at: '', updated_at: '' })
  await flushPromises()
  expect(useLkForms().isNoteFormOpen.value).toBe(false)
})

it('clears old results and cancels the request when the account changes', async () => {
  await setup()
  expect(wrapper!.text()).toContain('Купить молоко')
  useAuthStore().setToken(null); await flushPromises()
  expect(wrapper!.findAll('.lk-search__result')).toHaveLength(0)
  expect(vi.mocked(searchApi.search).mock.calls[0]![1].aborted).toBe(true)
})
