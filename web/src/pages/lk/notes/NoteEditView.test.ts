import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent } from 'vue'

import NoteEditView from './NoteEditView.vue'
import { notesApi } from '@/api/notesApi'
import { provideLkBreadcrumbTail } from '@/composables/useLkBreadcrumbTail'
import type { Note } from '@/types/note'

const note: Note = {
  uuid: 'n-1',
  title: 'Список покупок на дачу',
  body: 'Молоко, хлеб',
  is_pinned: false,
  is_archived: false,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk/notes', name: 'lk-notes', component: { template: '<div />' } },
      { path: '/lk/notes/new', name: 'lk-note-create', component: NoteEditView },
      { path: '/lk/notes/:uuid', name: 'lk-note-edit', component: NoteEditView },
    ],
  })
}

/** Хост-компонент: предоставляет «хвост» крошек, как это делает `LkLayout`. */
function makeHost() {
  return defineComponent({
    setup() {
      const tail = provideLkBreadcrumbTail()
      return { tail }
    },
    template: '<div><span class="tail">{{ tail ?? "none" }}</span><RouterView /></div>',
  })
}

async function mountEdit(routeName: 'lk-note-create' | 'lk-note-edit', uuid?: string) {
  const router = createTestRouter()
  await router.push(uuid ? { name: routeName, params: { uuid } } : { name: routeName })
  const wrapper = mount(makeHost(), { global: { plugins: [router] } })
  await wrapper.vm.$nextTick()
  return { wrapper, router }
}

describe('NoteEditView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the create form immediately without loading an existing note', async () => {
    const { wrapper } = await mountEdit('lk-note-create')

    expect(wrapper.text()).toContain('Новая заметка')
    expect(notesApi.fetchNote).not.toHaveBeenCalled()
    expect(wrapper.find('.tail').text()).toBe('none')
  })

  it('loads an existing note and writes its title into the shared breadcrumb tail', async () => {
    vi.mocked(notesApi.fetchNote).mockResolvedValue(note)

    const { wrapper } = await mountEdit('lk-note-edit', 'n-1')
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect((wrapper.find('#note-title').element as HTMLInputElement).value).toBe('Список покупок на дачу')
    await vi.waitFor(() => expect(wrapper.find('.tail').text()).toBe('Список покупок на дачу'))
  })

  it('creates a note with the entered title/body and pin/archive flags', async () => {
    vi.mocked(notesApi.createNote).mockResolvedValue({ ...note, uuid: 'n-2' })

    const { wrapper, router } = await mountEdit('lk-note-create')

    await wrapper.find('#note-title').setValue('Новая заметка')
    await wrapper.find('#note-body').setValue('Текст')
    await wrapper.find('#note-pin-toggle').setValue(true)
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(notesApi.createNote).toHaveBeenCalledWith({
        title: 'Новая заметка',
        body: 'Текст',
        is_pinned: true,
        is_archived: false,
      }),
    )
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-notes'))
  })

  it('updates an existing note', async () => {
    vi.mocked(notesApi.fetchNote).mockResolvedValue(note)
    vi.mocked(notesApi.updateNote).mockResolvedValue({ ...note, title: 'Обновлено' })

    const { wrapper, router } = await mountEdit('lk-note-edit', 'n-1')
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('#note-title').setValue('Обновлено')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(notesApi.updateNote).toHaveBeenCalledWith('n-1', {
        title: 'Обновлено',
        body: 'Молоко, хлеб',
        is_pinned: false,
        is_archived: false,
      }),
    )
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-notes'))
  })

  it('deletes the note after confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    vi.mocked(notesApi.fetchNote).mockResolvedValue(note)
    vi.mocked(notesApi.deleteNote).mockResolvedValue(undefined)

    const { wrapper, router } = await mountEdit('lk-note-edit', 'n-1')
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.note-edit__delete').trigger('click')

    await vi.waitFor(() => expect(notesApi.deleteNote).toHaveBeenCalledWith('n-1'))
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-notes'))
    vi.unstubAllGlobals()
  })

  it('shows a validation error message from the API', async () => {
    vi.mocked(notesApi.createNote).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { message: 'Ошибка', errors: { title: ['Обязательное поле'] } } },
    })

    const { wrapper } = await mountEdit('lk-note-create')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Обязательное поле'))
  })
})

vi.mock('@/api/notesApi', () => ({
  notesApi: {
    fetchNotes: vi.fn(),
    fetchNote: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    togglePin: vi.fn(),
    toggleArchive: vi.fn(),
  },
}))
