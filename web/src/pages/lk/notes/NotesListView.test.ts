import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent } from 'vue'
import type { VueWrapper } from '@vue/test-utils'

import NotesListView from './NotesListView.vue'
import LkNoteFormDialog from '@/components/lk/LkNoteFormDialog.vue'
import { notesApi } from '@/api/notesApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { Note } from '@/types/note'

function makeNote(overrides: Partial<Note>): Note {
  return {
    uuid: 'n-1',
    title: 'Заметка',
    body: 'Немного текста заметки',
    color: null,
    is_pinned: false,
    is_archived: false,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

const paginated = (data: Note[], counts = { active: data.length, archived: 0 }) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 20, total: data.length, counts },
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

// `useLkForms`/`notesVersion` — module-level singleton: если не размонтировать
// компоненты, их `watch(notesVersion, ...)` продолжает реагировать на бампы
// версии из последующих тестов. Отслеживаем обёртки и размонтируем в `afterEach`.
const mountedWrappers: VueWrapper[] = []

async function mountNotesView() {
  const router = createTestRouter()
  await router.push({ name: 'lk-notes' })
  const wrapper = mount(NotesListView, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return { wrapper, router }
}

// Модалка «Заметка» рендерится один раз в `LkLayout`, а не в `NotesListView` —
// для интеграционных тестов (create/edit через модалку) монтируем оба
// компонента рядом, как это делает реальный `LkLayout`.
const NotesViewWithDialog = defineComponent({
  components: { NotesListView, LkNoteFormDialog },
  template: '<div><NotesListView /><LkNoteFormDialog /></div>',
})

async function mountNotesViewWithDialog() {
  const router = createTestRouter()
  await router.push({ name: 'lk-notes' })
  const wrapper = mount(NotesViewWithDialog, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return { wrapper, router }
}

describe('NotesListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
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

  it('archives a note through the API: the card leaves the «Активные» tab and the counters shift (WEB-52)', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([makeNote({ uuid: 'n-1' })], { active: 1, archived: 2 }))
    vi.mocked(notesApi.toggleArchive).mockResolvedValue(makeNote({ uuid: 'n-1', is_archived: true }))

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))
    expect(wrapper.find('[data-testid="notes-count-active"]').text()).toBe('1')
    expect(wrapper.find('[data-testid="notes-count-archived"]').text()).toBe('2')

    await wrapper.find('.lk-note-card__action').trigger('click')
    await vi.waitFor(() => expect(notesApi.toggleArchive).toHaveBeenCalledWith('n-1', true))

    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-card')).toHaveLength(0))
    expect(wrapper.find('[data-testid="notes-count-active"]').text()).toBe('0')
    expect(wrapper.find('[data-testid="notes-count-archived"]').text()).toBe('3')
    expect(wrapper.text()).toContain('Пока нет заметок.')
  })

  it('renders the toolbar counters from meta.counts', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([makeNote({ uuid: 'n-1' })], { active: 7, archived: 4 }))

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    expect(wrapper.find('[data-testid="notes-count-active"]').text()).toBe('7')
    expect(wrapper.find('[data-testid="notes-count-archived"]').text()).toBe('4')
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

  it('opens the note form modal (creation) when the toolbar button is clicked, without navigating', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([]))

    const { wrapper, router } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    await wrapper.find('.lk-notes-toolbar__create').trigger('click')

    const forms = useLkForms()
    expect(forms.isNoteFormOpen.value).toBe(true)
    expect(forms.noteFormNote.value).toBeNull()
    expect(router.currentRoute.value.name).toBe('lk-notes')
  })

  it('opens the note form modal (edit) with the full note when a card is clicked', async () => {
    const note = makeNote({ uuid: 'n-1', title: 'Список покупок на дачу' })
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([note]))

    const { wrapper } = await mountNotesView()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    await wrapper.find('.lk-note-card').trigger('click')

    const forms = useLkForms()
    expect(forms.isNoteFormOpen.value).toBe(true)
    expect(forms.noteFormNote.value).toEqual(note)
  })

  it('creates a note end-to-end through the modal and closes it', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([]))
    vi.mocked(notesApi.createNote).mockResolvedValue(makeNote({ uuid: 'n-2', title: 'Новая заметка' }))

    const { wrapper } = await mountNotesViewWithDialog()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    await wrapper.find('.lk-notes-toolbar__create').trigger('click')
    expect(wrapper.find('[aria-label="Новая заметка"]').exists()).toBe(true)

    await wrapper.find('#note-form-title').setValue('Новая заметка')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(notesApi.createNote).toHaveBeenCalled())
    expect(wrapper.find('[aria-label="Новая заметка"]').exists()).toBe(false)
  })

  it('reloads the notes grid after a save through the modal (notesVersion bump)', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValueOnce(paginated([]))
    vi.mocked(notesApi.createNote).mockResolvedValue(makeNote({ uuid: 'n-2', title: 'Новая заметка' }))

    const { wrapper } = await mountNotesViewWithDialog()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-note-skeleton')).toHaveLength(0))

    vi.mocked(notesApi.fetchNotes).mockResolvedValueOnce(paginated([makeNote({ uuid: 'n-2' })]))
    await wrapper.find('.lk-notes-toolbar__create').trigger('click')
    await wrapper.find('#note-form-title').setValue('Новая заметка')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(notesApi.fetchNotes).toHaveBeenCalledTimes(2))
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
