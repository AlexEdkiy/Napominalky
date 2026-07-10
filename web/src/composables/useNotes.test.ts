import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNotes } from './useNotes'
import { notesApi } from '@/api/notesApi'
import type { Note } from '@/types/note'

const note: Note = {
  uuid: 'n-1',
  title: 'Первая',
  body: 'Текст',
  color: null,
  is_pinned: false,
  is_archived: false,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
}

describe('useNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('load populates notes from the paginated response', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue({
      data: [note],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    })

    const { notes, isLoading, load } = useNotes()
    await load({ search: 'Пер', archived: false })

    expect(notesApi.fetchNotes).toHaveBeenCalledWith({ search: 'Пер', archived: false })
    expect(notes.value).toHaveLength(1)
    expect(notes.value[0]?.uuid).toBe('n-1')
    expect(isLoading.value).toBe(false)
  })

  it('create prepends the new note to the list', async () => {
    const created: Note = { ...note, uuid: 'n-2', title: 'Вторая' }
    vi.mocked(notesApi.createNote).mockResolvedValue(created)

    const { notes, create } = useNotes()
    const result = await create({ title: 'Вторая' })

    expect(result?.uuid).toBe('n-2')
    expect(notes.value[0]?.uuid).toBe('n-2')
  })

  it('remove drops the note from the list', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue({
      data: [note],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    })
    vi.mocked(notesApi.deleteNote).mockResolvedValue(undefined)

    const { notes, load, remove } = useNotes()
    await load()
    const ok = await remove('n-1')

    expect(ok).toBe(true)
    expect(notes.value).toHaveLength(0)
  })

  it('pin replaces the matching note in place', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue({
      data: [note],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    })
    vi.mocked(notesApi.togglePin).mockResolvedValue({ ...note, is_pinned: true })

    const { notes, load, pin } = useNotes()
    await load()
    await pin('n-1', true)

    expect(notes.value[0]?.is_pinned).toBe(true)
  })

  it('load records an error message on failure', async () => {
    vi.mocked(notesApi.fetchNotes).mockRejectedValue(new Error('network down'))

    const { error, isLoading, load } = useNotes()
    await load()

    expect(error.value).toBe('network down')
    expect(isLoading.value).toBe(false)
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
