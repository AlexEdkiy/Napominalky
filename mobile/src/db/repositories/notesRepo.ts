import { and, desc, eq, isNull, like, or } from 'drizzle-orm'
import { db as defaultDb, type Database } from '../client'
import { notes, type NoteRow } from '../schema/notes'
import { BaseRepository, type SyncTable } from './baseRepo'

/** Доменная заметка: booleans вместо 0/1, как наружу отдаёт репозиторий. */
export interface Note {
  uuid: string
  userId: string | null
  title: string
  body: string | null
  isPinned: boolean
  isArchived: boolean
  serverRevision: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/** Данные для создания заметки (sync-поля проставит baseRepo). */
export interface CreateNoteData {
  title: string
  body?: string | null
  userId?: string | null
  isPinned?: boolean
  isArchived?: boolean
}

/** Частичное обновление доменных полей заметки. */
export type UpdateNotePatch = Partial<CreateNoteData>

interface ListNotesOptions {
  archived?: boolean
}

const bool = (value: number): boolean => value === 1
const flag = (value: boolean): number => (value ? 1 : 0)

/** Преобразует строку SQLite (0/1) в доменную заметку с booleans. */
const toNote = (row: NoteRow): Note => ({
  uuid: row.uuid,
  userId: row.userId,
  title: row.title,
  body: row.body,
  isPinned: bool(row.isPinned),
  isArchived: bool(row.isArchived),
  serverRevision: row.serverRevision,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
})

/**
 * Репозиторий заметок поверх BaseRepository: мутации идут через base
 * (доменная строка + запись в sync_outbox), чтения — напрямую через db.
 * is_pinned/is_archived хранятся как 0/1, конвертируются в boolean на чтении.
 */
export class NotesRepository {
  private readonly base: BaseRepository<typeof notes & SyncTable>

  public constructor(private readonly db: Database = defaultDb) {
    this.base = new BaseRepository(notes as typeof notes & SyncTable, 'note', db)
  }

  public async createNote(data: CreateNoteData): Promise<Note> {
    const row = await this.base.insert({
      title: data.title,
      body: data.body ?? null,
      userId: data.userId ?? null,
      isPinned: flag(data.isPinned ?? false),
      isArchived: flag(data.isArchived ?? false),
    } as never)
    return toNote(row as NoteRow)
  }

  public async updateNote(uuid: string, patch: UpdateNotePatch): Promise<Note | null> {
    const values: Record<string, unknown> = {}
    if (patch.title !== undefined) values.title = patch.title
    if (patch.body !== undefined) values.body = patch.body
    if (patch.userId !== undefined) values.userId = patch.userId
    if (patch.isPinned !== undefined) values.isPinned = flag(patch.isPinned)
    if (patch.isArchived !== undefined) values.isArchived = flag(patch.isArchived)

    const row = await this.base.update(uuid, values as never)
    return row === null ? null : toNote(row as NoteRow)
  }

  /** Мягкое удаление: tombstone (deleted_at) + delete-запись в outbox. */
  public async deleteNote(uuid: string): Promise<Note | null> {
    const row = await this.base.softDelete(uuid)
    return row === null ? null : toNote(row as NoteRow)
  }

  public async getNoteByUuid(uuid: string): Promise<Note | null> {
    const row = await this.base.findById(uuid)
    return row === null ? null : toNote(row as NoteRow)
  }

  /** Активные заметки (без tombstone) с фильтром по архиву; pinned сверху. */
  public async listNotes(opts: ListNotesOptions = {}): Promise<Note[]> {
    const archived = flag(opts.archived ?? false)
    const rows = await this.db
      .select()
      .from(notes)
      .where(and(isNull(notes.deletedAt), eq(notes.isArchived, archived)))
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt))
    return rows.map(toNote)
  }

  /** Поиск по title/body (LIKE), исключая удалённые. */
  public async searchNotes(query: string): Promise<Note[]> {
    const pattern = `%${query}%`
    const rows = await this.db
      .select()
      .from(notes)
      .where(
        and(
          isNull(notes.deletedAt),
          or(like(notes.title, pattern), like(notes.body, pattern)),
        ),
      )
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt))
    return rows.map(toNote)
  }

  public async togglePin(uuid: string, pinned: boolean): Promise<Note | null> {
    return this.updateNote(uuid, { isPinned: pinned })
  }

  public async toggleArchive(uuid: string, archived: boolean): Promise<Note | null> {
    return this.updateNote(uuid, { isArchived: archived })
  }
}

/** Singleton поверх дефолтного клиента для использования в хуках/сторах. */
export const notesRepo = new NotesRepository()
