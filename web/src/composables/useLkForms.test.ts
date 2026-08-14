import { beforeEach, describe, expect, it } from 'vitest'

import { resetLkFormsForTests, useLkForms } from './useLkForms'
import type { Note } from '@/types/note'
import type { Reminder } from '@/types/reminder'
import type { ShoppingList } from '@/types/shoppingList'

const list: ShoppingList = {
  uuid: 'l-1',
  title: 'Продукты',
  type: 'goods',
  tags: [],
  items_count: 0,
  checked_items_count: 0,
  is_completed: false,
  status: 'new',
  status_label: 'Новая',
  status_is_manual: false,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

const note: Note = {
  uuid: 'n-1',
  title: 'Заметка',
  body: null,
  color: null,
  is_pinned: false,
  is_archived: false,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

const reminder: Reminder = {
  uuid: 'r-1',
  title: 'Позвонить',
  notes: null,
  remind_at: '2026-07-10T18:00:00.000Z',
  recurrence: 'none',
  is_completed: false,
  completed_at: null,
  snoozed_until: null,
  source_uuid: null,
  source_type: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

describe('useLkForms', () => {
  beforeEach(() => {
    resetLkFormsForTests()
  })

  it('is a singleton: state changes are visible from independently-called instances', () => {
    const a = useLkForms()
    const b = useLkForms()

    a.openTaskForm(list)

    expect(b.isTaskFormOpen.value).toBe(true)
    expect(b.taskFormList.value).toEqual(list)
  })

  it('opens the task form with no list for creation and with a list for editing', () => {
    const forms = useLkForms()

    forms.openTaskForm()
    expect(forms.isTaskFormOpen.value).toBe(true)
    expect(forms.taskFormList.value).toBeNull()

    forms.closeForm()
    forms.openTaskForm(list)
    expect(forms.isTaskFormOpen.value).toBe(true)
    expect(forms.taskFormList.value).toEqual(list)
  })

  it('opens the note form with no note for creation and with a note for editing', () => {
    const forms = useLkForms()

    forms.openNoteForm()
    expect(forms.isNoteFormOpen.value).toBe(true)
    expect(forms.noteFormNote.value).toBeNull()

    forms.closeForm()
    forms.openNoteForm(note)
    expect(forms.isNoteFormOpen.value).toBe(true)
    expect(forms.noteFormNote.value).toEqual(note)
  })

  it('opens the reminder form with no reminder for creation and with a reminder for editing', () => {
    const forms = useLkForms()

    forms.openReminderForm()
    expect(forms.isReminderFormOpen.value).toBe(true)
    expect(forms.reminderFormReminder.value).toBeNull()

    forms.closeForm()
    forms.openReminderForm(reminder)
    expect(forms.isReminderFormOpen.value).toBe(true)
    expect(forms.reminderFormReminder.value).toEqual(reminder)
  })

  it('closes all 3 forms at once', () => {
    const forms = useLkForms()

    forms.openTaskForm(list)
    forms.openNoteForm(note)
    forms.openReminderForm(reminder)
    forms.closeForm()

    expect(forms.isTaskFormOpen.value).toBe(false)
    expect(forms.isNoteFormOpen.value).toBe(false)
    expect(forms.isReminderFormOpen.value).toBe(false)
  })

  it('bumps the version counters independently when a save is notified', () => {
    const forms = useLkForms()

    forms.notifyTaskSaved()
    expect(forms.tasksVersion.value).toBe(1)
    expect(forms.notesVersion.value).toBe(0)
    expect(forms.remindersVersion.value).toBe(0)

    forms.notifyNoteSaved()
    forms.notifyReminderSaved()
    forms.notifyReminderSaved()

    expect(forms.notesVersion.value).toBe(1)
    expect(forms.remindersVersion.value).toBe(2)
  })
})
