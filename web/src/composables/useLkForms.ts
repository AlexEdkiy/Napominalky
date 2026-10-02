import { ref } from 'vue'

import type { Note } from '@/types/note'
import type { Reminder } from '@/types/reminder'
import type { ShoppingList } from '@/types/shoppingList'

/**
 * Module-level (синглтон) состояние 3 форм ЛК, вынесенных в центральные
 * модалки (см. `web-lk-forms.md`): задача/список, заметка, напоминание.
 * Модалки (`LkTaskFormDialog`/`LkNoteFormDialog`/`LkReminderFormDialog`)
 * рендерятся ОДИН раз в `LkLayout.vue` и читают это состояние — открыть
 * форму можно из любого места (меню «Создать», +кнопки разделов, клик по
 * карточке) через `openTaskForm`/`openNoteForm`/`openReminderForm`, без
 * навигации по маршрутам.
 */
const isTaskFormOpen = ref(false)
const taskFormList = ref<ShoppingList | null>(null)
const taskFormItemUuid = ref<string | null>(null)

const isNoteFormOpen = ref(false)
const noteFormNote = ref<Note | null>(null)

const isReminderFormOpen = ref(false)
const reminderFormReminder = ref<Reminder | null>(null)

/**
 * Счётчики версий — увеличиваются при успешном создании/изменении/удалении
 * через соответствующую модалку. Страницы разделов (`TasksView`,
 * `NotesListView`, `RemindersView`, `LkTasksRightRail`)
 * подписываются на них через `watch`, чтобы перезагрузить свои данные без
 * прямой связи с модалкой (она рендерится в `LkLayout`, а не на странице).
 */
const tasksVersion = ref(0)
const notesVersion = ref(0)
const remindersVersion = ref(0)

function openTaskForm(list?: ShoppingList, itemUuid?: string): void {
  taskFormList.value = list ?? null
  taskFormItemUuid.value = itemUuid ?? null
  isTaskFormOpen.value = true
}

function openNoteForm(note?: Note): void {
  noteFormNote.value = note ?? null
  isNoteFormOpen.value = true
}

function openReminderForm(reminder?: Reminder): void {
  reminderFormReminder.value = reminder ?? null
  isReminderFormOpen.value = true
}

/** Закрывает все 3 модалки (крестик/Отмена/Esc/клик по scrim). */
function closeForm(): void {
  isTaskFormOpen.value = false
  taskFormItemUuid.value = null
  isNoteFormOpen.value = false
  isReminderFormOpen.value = false
}

function notifyTaskSaved(): void {
  tasksVersion.value += 1
}

function notifyNoteSaved(): void {
  notesVersion.value += 1
}

function notifyReminderSaved(): void {
  remindersVersion.value += 1
}

/**
 * Сбрасывает синглтон-состояние в исходное — только для тестов (модуль
 * переиспользуется между `it()`-блоками в одном тестовом файле).
 */
export function resetLkFormsForTests(): void {
  isTaskFormOpen.value = false
  taskFormItemUuid.value = null
  taskFormList.value = null
  isNoteFormOpen.value = false
  noteFormNote.value = null
  isReminderFormOpen.value = false
  reminderFormReminder.value = null
  tasksVersion.value = 0
  notesVersion.value = 0
  remindersVersion.value = 0
}

export function useLkForms() {
  return {
    isTaskFormOpen,
    taskFormList,
    taskFormItemUuid,
    isNoteFormOpen,
    noteFormNote,
    isReminderFormOpen,
    reminderFormReminder,
    tasksVersion,
    notesVersion,
    remindersVersion,
    openTaskForm,
    openNoteForm,
    openReminderForm,
    closeForm,
    notifyTaskSaved,
    notifyNoteSaved,
    notifyReminderSaved,
  }
}
