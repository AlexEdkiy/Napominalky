<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { isAxiosError } from 'axios'

import LkShareButton from '@/components/lk/LkShareButton.vue'
import { noteShareText } from '@/utils/shareText'
import LkConfirmDialog from '@/components/lk/LkConfirmDialog.vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import { useLkBreakpoint } from '@/composables/useLkBreakpoint'
import { useLkForms } from '@/composables/useLkForms'
import { notesApi } from '@/api/notesApi'
import { NAMED_NOTE_COLORS, NOTE_COLOR_OPTIONS, isNoteColor } from '@/constants/lkNoteColors'
import type { ValidationErrorResponse } from '@/types/api'
import type { NoteColor } from '@/types/note'

/** Свотчи: 4 токена брифа (teal/coral/amber/purple) + 4 маркера мобилки (WEB-52). */
const COLOR_OPTIONS: NoteColor[] = NOTE_COLOR_OPTIONS
const DEFAULT_COLOR: NoteColor = 'teal'

const { isDesktop } = useLkBreakpoint()
const { isNoteFormOpen, noteFormNote, closeForm, notifyNoteSaved } = useLkForms()

const form = reactive<{ title: string; body: string; color: NoteColor }>({
  title: '',
  body: '',
  color: DEFAULT_COLOR,
})
const errors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
const isSubmitting = ref(false)
const isDeleting = ref(false)
const isArchiving = ref(false)
const isConfirmingDelete = ref(false)

const isEdit = computed<boolean>(() => noteFormNote.value !== null)
const title = computed<string>(() => (isEdit.value ? 'Редактирование заметки' : 'Новая заметка'))
const submitLabel = computed<string>(() => (isEdit.value ? 'Сохранить' : 'Создать'))
const isArchived = computed<boolean>(() => noteFormNote.value?.is_archived === true)
const archiveLabel = computed<string>(() => (isArchived.value ? 'Вернуть из архива' : 'В архив'))

function resetForm(): void {
  const note = noteFormNote.value
  form.title = note?.title ?? ''
  form.body = note?.body ?? ''
  // Цвет из мобилки/старых записей вне палитры — не теряем, но свотч не подсветится.
  form.color = isNoteColor(note?.color) ? note.color : DEFAULT_COLOR
  errors.value = {}
  generalError.value = null
  isConfirmingDelete.value = false
}

watch(isNoteFormOpen, (open) => {
  if (open) {
    resetForm()
  }
})

function applyValidation(error: unknown): void {
  if (isAxiosError<ValidationErrorResponse>(error) && error.response?.status === 422) {
    errors.value = error.response.data.errors
    return
  }
  generalError.value = 'Не удалось сохранить заметку. Попробуйте позже.'
}

function handleClose(): void {
  closeForm()
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isNoteFormOpen.value) {
    handleClose()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

async function handleSubmit(): Promise<void> {
  errors.value = {}
  generalError.value = null
  const trimmedTitle = form.title.trim()
  const trimmedBody = form.body.trim()
  if (trimmedTitle === '' && trimmedBody === '') {
    // Пустая заметка (ни заголовка, ни текста) — не создаём, просто закрываем.
    handleClose()
    return
  }
  isSubmitting.value = true
  try {
    const current = noteFormNote.value
    if (current === null) {
      await notesApi.createNote({ title: trimmedTitle, body: form.body || null, color: form.color })
    } else {
      await notesApi.updateNote(current.uuid, { title: trimmedTitle, body: form.body || null, color: form.color })
    }
    notifyNoteSaved()
    closeForm()
  } catch (error) {
    applyValidation(error)
  } finally {
    isSubmitting.value = false
  }
}

/**
 * «В архив» / «Вернуть из архива» из формы (WEB-52): POST …/archive, затем
 * список перечитывается через `notifyNoteSaved`, форма закрывается.
 */
async function handleToggleArchive(): Promise<void> {
  const current = noteFormNote.value
  if (current === null) {
    return
  }
  generalError.value = null
  isArchiving.value = true
  try {
    await notesApi.toggleArchive(current.uuid, !current.is_archived)
    notifyNoteSaved()
    closeForm()
  } catch {
    generalError.value = isArchived.value
      ? 'Не удалось вернуть заметку из архива.'
      : 'Не удалось отправить заметку в архив.'
  } finally {
    isArchiving.value = false
  }
}

function requestDelete(): void {
  isConfirmingDelete.value = true
}

function cancelDelete(): void {
  isConfirmingDelete.value = false
}

async function confirmDelete(): Promise<void> {
  const current = noteFormNote.value
  isConfirmingDelete.value = false
  if (current === null) {
    return
  }
  isDeleting.value = true
  try {
    await notesApi.deleteNote(current.uuid)
    notifyNoteSaved()
    closeForm()
  } catch {
    generalError.value = 'Не удалось удалить заметку.'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div v-if="isNoteFormOpen" class="lk-form-dialog__overlay" :class="{ 'lk-form-dialog__overlay--desktop': isDesktop }" @click.self="handleClose">
    <div
      class="lk-form-dialog__panel"
      :class="{ 'lk-form-dialog__panel--desktop': isDesktop }"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <header class="lk-form-dialog__header">
        <h2 class="lk-form-dialog__title">{{ title }}</h2>
        <button type="button" class="lk-form-dialog__close" aria-label="Закрыть" @click="handleClose">
          &times;
        </button>
      </header>

      <form novalidate @submit.prevent="handleSubmit">
        <p v-if="generalError" role="alert" class="lk-form-dialog__error">{{ generalError }}</p>

        <label class="lk-form-dialog__label" for="note-form-title">Заголовок</label>
        <input
          id="note-form-title"
          v-model="form.title"
          type="text"
          class="lk-form-dialog__input"
          placeholder="О чём заметка?"
          autofocus
        />
        <span v-if="errors.title" class="lk-form-dialog__error">{{ errors.title[0] }}</span>

        <label class="lk-form-dialog__label" for="note-form-body">Текст</label>
        <textarea
          id="note-form-body"
          v-model="form.body"
          class="lk-form-dialog__textarea"
          rows="5"
          placeholder="Запишите, пока не забылось…"
        ></textarea>
        <span v-if="errors.body" class="lk-form-dialog__error">{{ errors.body[0] }}</span>

        <span class="lk-form-dialog__label">Цвет стикера</span>
        <div class="lk-note-form-dialog__swatches" role="radiogroup" aria-label="Цвет стикера">
          <button
            v-for="option in COLOR_OPTIONS"
            :key="option"
            type="button"
            class="lk-note-form-dialog__swatch"
            :class="{ 'lk-note-form-dialog__swatch--active': form.color === option }"
            :style="{ background: NAMED_NOTE_COLORS[option].bg, borderColor: NAMED_NOTE_COLORS[option].accent }"
            role="radio"
            :aria-checked="form.color === option"
            :aria-label="option"
            @click="form.color = option"
          />
        </div>

        <LkShareButton :text="noteShareText(form.title, form.body)" :disabled="isSubmitting || isDeleting" />

        <footer class="lk-form-dialog__footer">
          <button
            v-if="isEdit"
            type="button"
            class="lk-form-dialog__delete"
            :disabled="isDeleting"
            @click="requestDelete"
          >
            <LkIcon name="trash" :size="16" />
            Удалить
          </button>
          <button
            v-if="isEdit"
            type="button"
            class="lk-note-form-dialog__archive"
            :class="{ 'lk-note-form-dialog__archive--restore': isArchived }"
            :disabled="isArchiving"
            :aria-pressed="isArchived"
            @click="handleToggleArchive"
          >
            <LkIcon name="archive" :size="16" />
            {{ isArchiving ? '…' : archiveLabel }}
          </button>
          <span class="lk-form-dialog__spacer" />
          <button type="button" class="lk-form-dialog__cancel" @click="handleClose">Отмена</button>
          <button type="submit" class="lk-form-dialog__submit" :disabled="isSubmitting">
            {{ isSubmitting ? '…' : submitLabel }}
          </button>
        </footer>
      </form>
    </div>

    <LkConfirmDialog
      v-if="isConfirmingDelete"
      title="Удалить заметку?"
      message="Заметка будет удалена безвозвратно."
      confirm-label="Удалить"
      cancel-label="Отмена"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.lk-form-dialog__overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(12, 50, 44, 0.42);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.lk-form-dialog__overlay--desktop {
  align-items: center;
}

.lk-form-dialog__panel {
  background: #fff;
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  max-height: 86%;
  overflow-y: auto;
  border-radius: 22px 22px 0 0;
  padding: 24px 20px;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.25);
}

.lk-form-dialog__panel--desktop {
  max-width: 580px;
  border-radius: 22px;
  padding: 24px 28px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
  margin: auto;
}

.lk-form-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.lk-form-dialog__title {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  color: #1f2622;
}

.lk-form-dialog__close {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  background: #f2f4f3;
  color: #5a625e;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.lk-form-dialog__label {
  display: block;
  margin-top: 16px;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9aa39f;
}

.lk-form-dialog__input {
  display: block;
  width: 100%;
  height: 46px;
  box-sizing: border-box;
  border: 1.5px solid #e3e6e5;
  border-radius: 13px;
  padding: 0 15px;
  background: #fbfcfb;
  font-size: 15px;
  font-weight: 700;
  color: #1f2622;
  font-family: inherit;
}

.lk-form-dialog__textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 1.5px solid #e3e6e5;
  border-radius: 13px;
  padding: 12px 15px;
  background: #fbfcfb;
  font-size: 15px;
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  color: #1f2622;
}

.lk-note-form-dialog__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.lk-note-form-dialog__swatch {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.lk-note-form-dialog__swatch--active {
  outline: 2px solid #1f2622;
  outline-offset: 2px;
}

.lk-form-dialog__footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
}

.lk-form-dialog__spacer {
  flex: 1;
}

.lk-note-form-dialog__archive {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 13px;
  background: #eef1f0;
  color: #4a5350;
  font-weight: 700;
  cursor: pointer;
}

.lk-note-form-dialog__archive--restore {
  background: #d8ebe4;
  color: #17897a;
}

.lk-note-form-dialog__archive:disabled {
  opacity: 0.6;
  cursor: default;
}

.lk-form-dialog__delete {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 13px;
  background: #fbe3df;
  color: #cf5b4a;
  font-weight: 700;
  cursor: pointer;
}

.lk-form-dialog__cancel {
  height: 44px;
  padding: 0 18px;
  border: none;
  border-radius: 13px;
  background: #eef1f0;
  color: #5a625e;
  font-weight: 700;
  cursor: pointer;
}

.lk-form-dialog__submit {
  height: 44px;
  padding: 0 20px;
  border: none;
  border-radius: 13px;
  background: #17897a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(23, 137, 122, 0.35);
}

.lk-form-dialog__submit:disabled,
.lk-form-dialog__delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lk-form-dialog__error {
  display: block;
  color: #cf5b4a;
  font-size: 0.8rem;
  margin-top: 4px;
}
@media (max-width: 767px) {
  .lk-form-dialog__footer {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lk-form-dialog__footer > button {
    justify-content: center;
    min-width: 0;
  }

  .lk-form-dialog__spacer { display: none; }
}
</style>
