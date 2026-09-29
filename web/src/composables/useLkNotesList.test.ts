import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLkNotesList } from './useLkNotesList'
import { notesApi } from '@/api/notesApi'
import type { Note } from '@/types/note'

function makeNote(overrides: Partial<Note>): Note {
  return {
    uuid: 'n-1',
    title: 'Заметка',
    body: 'Текст',
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

describe('useLkNotesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads with archived=false and per_page within the API limit (max 100)', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([]))

    const { load } = useLkNotesList()
    await load()

    expect(notesApi.fetchNotes).toHaveBeenCalledWith(
      expect.objectContaining({ archived: false }),
    )
    const params = vi.mocked(notesApi.fetchNotes).mock.calls[0]?.[0]
    expect(params?.per_page).toBeLessThanOrEqual(100)
  })

  it('debounces search input before calling the API again', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([]))

    const { load, searchQuery } = useLkNotesList()
    await load()
    vi.mocked(notesApi.fetchNotes).mockClear()

    searchQuery.value = 'мол'
    await vi.advanceTimersByTimeAsync(100)
    expect(notesApi.fetchNotes).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)
    expect(notesApi.fetchNotes).toHaveBeenCalledWith(expect.objectContaining({ search: 'мол' }))
  })

  it('reloads immediately when the archived filter toggles', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([]))

    const { load, showArchived } = useLkNotesList()
    await load()
    vi.mocked(notesApi.fetchNotes).mockClear()

    showArchived.value = true
    await vi.waitFor(() => expect(notesApi.fetchNotes).toHaveBeenCalledWith(
      expect.objectContaining({ archived: true }),
    ))
  })

  it('groups pinned notes separately from the rest', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(
      paginated([
        makeNote({ uuid: 'n-1', title: 'Обычная', is_pinned: false }),
        makeNote({ uuid: 'n-2', title: 'Закреплённая', is_pinned: true }),
      ]),
    )

    const { load, pinnedNotes, otherNotes } = useLkNotesList()
    await load()

    expect(pinnedNotes.value).toHaveLength(1)
    expect(pinnedNotes.value[0]?.uuid).toBe('n-2')
    expect(otherNotes.value).toHaveLength(1)
    expect(otherNotes.value[0]?.uuid).toBe('n-1')
  })

  it('pin/archive/remove delegate to the underlying API', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([makeNote({ uuid: 'n-1' })]))
    vi.mocked(notesApi.togglePin).mockResolvedValue(makeNote({ uuid: 'n-1', is_pinned: true }))
    vi.mocked(notesApi.toggleArchive).mockResolvedValue(makeNote({ uuid: 'n-1', is_archived: true }))
    vi.mocked(notesApi.deleteNote).mockResolvedValue(undefined)

    const { load, notes, pin, archive, remove } = useLkNotesList()
    await load()

    await pin('n-1', true)
    expect(notes.value[0]?.is_pinned).toBe(true)

    await archive('n-1', true)
    expect(notesApi.toggleArchive).toHaveBeenCalledWith('n-1', true)

    const ok = await remove('n-1')
    expect(ok).toBe(true)
    expect(notes.value).toHaveLength(0)
  })

  it('archiving on the «Активные» tab drops the card and shifts the counts without a refetch (WEB-52)', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(
      paginated([makeNote({ uuid: 'n-1' }), makeNote({ uuid: 'n-2' })], { active: 2, archived: 1 }),
    )
    vi.mocked(notesApi.toggleArchive).mockResolvedValue(makeNote({ uuid: 'n-1', is_archived: true }))

    const { load, notes, counts, archive } = useLkNotesList()
    await load()
    vi.mocked(notesApi.fetchNotes).mockClear()

    await archive('n-1', true)

    expect(notes.value.map((note) => note.uuid)).toEqual(['n-2'])
    expect(counts.value).toEqual({ active: 1, archived: 2 })
    expect(notesApi.fetchNotes).not.toHaveBeenCalled()
  })

  it('restoring on the «Архив» tab drops the card and shifts the counts back', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(
      paginated([makeNote({ uuid: 'n-1', is_archived: true })], { active: 3, archived: 1 }),
    )
    vi.mocked(notesApi.toggleArchive).mockResolvedValue(makeNote({ uuid: 'n-1', is_archived: false }))

    const { load, notes, counts, showArchived, archive } = useLkNotesList()
    showArchived.value = true
    await vi.runAllTimersAsync()
    await load()

    await archive('n-1', false)

    expect(notes.value).toHaveLength(0)
    expect(counts.value).toEqual({ active: 4, archived: 0 })
  })

  it('removing a note decrements the count of the current tab', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue(paginated([makeNote({ uuid: 'n-1' })], { active: 1, archived: 5 }))
    vi.mocked(notesApi.deleteNote).mockResolvedValue(undefined)

    const { load, counts, remove } = useLkNotesList()
    await load()
    await remove('n-1')

    expect(counts.value).toEqual({ active: 0, archived: 5 })
  })

  it('exposes hasMore based on pagination meta', async () => {
    vi.mocked(notesApi.fetchNotes).mockResolvedValue({
      data: [makeNote({ uuid: 'n-1' })],
      meta: { current_page: 1, last_page: 3, per_page: 20, total: 60 },
      links: { first: null, last: null, prev: null, next: null },
    })

    const { load, hasMore } = useLkNotesList()
    await load()

    expect(hasMore.value).toBe(true)
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
