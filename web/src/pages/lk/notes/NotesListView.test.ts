import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import NotesListView from './NotesListView.vue'
import { notesApi } from '@/api/notesApi'
import type { Note } from '@/types/note'

function makeNote(overrides: Partial<Note>): Note {
  return {
    uuid: 'n-1',
    title: 'Заметка',
    body: 'Немного текста заметки',
    is_pinned: false,
    is_archived: false,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

const paginated = (data: Note[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 20, total: data.length },
  links: { first: null, last: null, prev: null, next: null },
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk/notes', name: 'lk-notes', component: NotesListView },
      { path: '/lk/notes/new', name: 'lk-note-create', component: { template: '<div />' } },
      { path: '/lk/notes/:uuid', name: 'lk-note-edit', component: { template: '<div />' } },
    ],
  })
}

async function mountNotesView() {
  const router = createTestRouter()
  await router.push({ name: 'lk-notes' })
  const wrapper = mount(NotesListView, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('NotesListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('shows a loading state before the notes resolve', async () => {
    let resolveNotes: (() => void) | undefined
    vi.mocked(notesApi.fetchNotes).mockReturnValue(
      new Promise((resolve) => {
        resolveNotes = () => resolve(paginated([]))
      }),
    )

    const { wrapper } = await mountNotesView()
    expect(wrapper.findAll('.lk-note-skeleton').length).toBeGreaterThan(0)
    resolveNotes?.()
  })

  it('renders notes from the API inside the masonry container', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(
      paginated([
        makeNote({ uuid: 'n-1', title: 'Первая' }),
        makeNote({ uuid: 'n-2', title: 'Вторая' }),
      ]),
    )

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    expect(wrapper.find('.notes-view__masonry').exists()).toBe(true)
    expect(wrapper.findAll('.lk-note-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('Первая')
    expect(wrapper.text()).toContain('Вторая')
  })

  it('renders pinned notes in a separate group above the rest', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(
      paginated([
        makeNote({ uuid: 'n-1', title: 'Обычная', is_pinned: false }),
        makeNote({ uuid: 'n-2', title: 'Закреплённая', is_pinned: true }),
      ]),
    )

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    const groupTitles = wrapper.findAll('.notes-view__group-title').map((el) => el.text())
    expect(groupTitles).toEqual(['Закреплённые', 'Остальные'])

    const cards = wrapper.findAll('.lk-note-card')
    expect(cards[0]?.text()).toContain('Закреплённая')
    expect(cards[1]?.text()).toContain('Обычная')
  })

  it('does not render group headings when there are no pinned notes', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([makeNote({ uuid: 'n-1' })]))

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    expect(wrapper.findAll('.notes-view__group-title')).toHaveLength(0)
  })

  it('shows the empty state for active notes with a create CTA', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([]))

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    expect(wrapper.text()).toContain('Пока нет заметок')
    expect(wrapper.find('.notes-view__empty-cta').exists()).toBe(true)
  })

  it('shows a distinct empty state for the archive', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([]))

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    await wrapper.find('.lk-notes-toolbar__switch-btn:last-child').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('В архиве пусто'))
    expect(wrapper.find('.notes-view__empty-cta').exists()).toBe(false)
  })

  it('shows an error message with a retry action when the request fails', async () => {
    vi.mocked(notesApi.fetchNotes).mockRejectedValue(new Error('network down'))

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.text()).toContain('network down'))
    expect(wrapper.find('.notes-view__retry-btn').exists()).toBe(true)
  })

  it('toggles the archived filter and requests archived notes', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([]))

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))
    vi.mocked(notesApi.fetchNotes).mockClear()

    await wrapper.find('.lk-notes-toolbar__switch-btn:last-child').trigger('click')

    await vi.waitFor(() =>
      expect(notesApi.fetchNotes).toHaveBeenCalledWith(expect.objectContaining({ archived: true })),
    )
  })

  it('debounces the search input before requesting the API again', async () => {
    vi.useFakeTimers()
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([]))

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))
    vi.mocked(notesApi.fetchNotes).mockClear()

    await wrapper.find('input[type="search"]').setValue('молоко')
    await vi.advanceTimersByTimeAsync(100)
    expect(notesApi.fetchNotes).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)
    expect(notesApi.fetchNotes).toHaveBeenCalledWith(expect.objectContaining({ search: 'молоко' }))

    const params = vi.mocked(notesApi.fetchNotes).mock.calls[0]?.[0]
    expect(params?.per_page).toBeLessThanOrEqual(100)
  })

  it('pins a note through the API optimistically', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([makeNote({ uuid: 'n-1', is_pinned: false })]))
    vi.mocked(notesApi.togglePin).mockResolvedValue(makeNote({ uuid: 'n-1', is_pinned: true }))

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    await wrapper.find('.lk-note-card__pin').trigger('click')
    await vi.waitFor(() => expect(notesApi.togglePin).toHaveBeenCalledWith('n-1', true))
    expect(wrapper.find('.lk-note-card__pin').classes()).toContain('lk-note-card__pin--active')
  })

  it('archives a note through the API', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([makeNote({ uuid: 'n-1' })]))
    vi.mocked(notesApi.toggleArchive).mockResolvedValue(makeNote({ uuid: 'n-1', is_archived: true }))

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    await wrapper.find('.lk-note-card__action').trigger('click')
    await vi.waitFor(() => expect(notesApi.toggleArchive).toHaveBeenCalledWith('n-1', true))
  })

  it('deletes a note through the API after confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([makeNote({ uuid: 'n-1' })]))
    vi.mocked(notesApi.deleteNote).mockResolvedValue(undefined)

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    await wrapper.find('.lk-note-card__action--danger').trigger('click')
    await vi.waitFor(() => expect(notesApi.deleteNote).toHaveBeenCalledWith('n-1'))
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-card')).toHaveLength(0))
  })

  it('does not delete when the confirmation dialog is dismissed', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([makeNote({ uuid: 'n-1' })]))

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    await wrapper.find('.lk-note-card__action--danger').trigger('click')
    expect(notesApi.deleteNote).not.toHaveBeenCalled()
  })

  it('navigates to the create route when the toolbar button is clicked', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([]))

    const { wrapper, router } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    await wrapper.find('.lk-notes-toolbar__create').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-note-create'))
  })

  it('navigates to the edit route when a note card is opened', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([makeNote({ uuid: 'n-1' })]))

    const { wrapper, router } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    await wrapper.find('.lk-note-card').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-note-edit'))
    expect(router.currentRoute.value.params.uuid).toBe('n-1')
  })

  it('shows a "load more" button when there is another page and requests it', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValueOnce({
      data: [makeNote({ uuid: 'n-1' })],
      meta: { current_page: 1, last_page: 2, per_page: 20, total: 30 },
      links: { first: null, last: null, prev: null, next: null },
    })
    vi.mocked(notesApi.fetchNotes).mockResolvedValueOnce({
      data: [makeNote({ uuid: 'n-2' })],
      meta: { current_page: 2, last_page: 2, per_page: 20, total: 30 },
      links: { first: null, last: null, prev: null, next: null },
    })

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    expect(wrapper.find('.notes-view__load-more').exists()).toBe(true)
    await wrapper.find('.notes-view__load-more').trigger('click')

    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-card')).toHaveLength(2))
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
