import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import NoteFormRedirectView from './NoteFormRedirectView.vue'
import { notesApi } from '@/api/notesApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { Note } from '@/types/note'

const note: Note = {
  uuid: 'n-1',
  title: 'Список покупок на дачу',
  body: 'Молоко, хлеб',
  color: null,
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
      { path: '/lk/notes/new', name: 'lk-note-create', component: NoteFormRedirectView },
      { path: '/lk/notes/:uuid', name: 'lk-note-edit', component: NoteFormRedirectView },
    ],
  })
}

describe('NoteFormRedirectView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
  })

  it('opens the note form for creation and redirects to lk-notes on the "new" deep-link', async () => {
    const router = createTestRouter()
    await router.push({ name: 'lk-note-create' })
    mount(NoteFormRedirectView, { global: { plugins: [router] } })

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-notes'))
    expect(useLkForms().isNoteFormOpen.value).toBe(true)
    expect(useLkForms().noteFormNote.value).toBeNull()
    expect(notesApi.fetchNote).not.toHaveBeenCalled()
  })

  it('fetches the note, opens the form pre-filled and redirects on the "edit" deep-link', async () => {
    vi.mocked(notesApi.fetchNote).mockResolvedValue(note)
    const router = createTestRouter()
    await router.push({ name: 'lk-note-edit', params: { uuid: 'n-1' } })
    mount(NoteFormRedirectView, { global: { plugins: [router] } })

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-notes'))
    expect(notesApi.fetchNote).toHaveBeenCalledWith('n-1')
    expect(useLkForms().noteFormNote.value).toEqual(note)
  })

  it('still opens the form (as a blank creation) and redirects when the fetch fails', async () => {
    vi.mocked(notesApi.fetchNote).mockRejectedValue(new Error('network down'))
    const router = createTestRouter()
    await router.push({ name: 'lk-note-edit', params: { uuid: 'n-404' } })
    mount(NoteFormRedirectView, { global: { plugins: [router] } })

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-notes'))
    expect(useLkForms().isNoteFormOpen.value).toBe(true)
  })
})

vi.mock('@/api/notesApi', () => ({
  notesApi: {
    fetchNote: vi.fn(),
  },
}))
