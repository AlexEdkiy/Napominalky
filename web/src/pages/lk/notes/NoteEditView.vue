<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isAxiosError } from 'axios'

import { notesApi } from '@/api/notesApi'
import { useSetLkBreadcrumbTail } from '@/composables/useLkBreadcrumbTail'
import type { ValidationErrorResponse } from '@/types/api'

const route = useRoute()
const router = useRouter()

const uuidParam = computed<string | null>(() => {
  const value = route.params.uuid
  return typeof value === 'string' ? value : null
})
const isCreate = computed<boolean>(() => uuidParam.value === null)

const form = reactive({ title: '', body: '', is_pinned: false, is_archived: false })
const errors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
const isLoading = ref(false)
const isSubmitting = ref(false)
const bodyTextarea = ref<HTMLTextAreaElement | null>(null)

// Крошка-хвост читает уже загруженный заголовок заметки. На маршруте
// создания (`lk-note-create`) значение игнорируется — там хвост статический
// (см. `constants/lkBreadcrumbs.ts`).
const loadedTitle = ref<string | null>(null)
useSetLkBreadcrumbTail(() => loadedTitle.value)

async function resizeTextarea(): Promise<void> {
  await nextTick()
  const el = bodyTextarea.value
  if (el) {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
}

watch(() => form.body, resizeTextarea)

function applyValidation(error: unknown): void {
  if (isAxiosError<ValidationErrorResponse>(error) && error.response?.status === 422) {
    errors.value = error.response.data.errors
    return
  }
  generalError.value = 'Не удалось сохранить заметку. Попробуйте позже.'
}

async function loadNote(uuid: string): Promise<void> {
  isLoading.value = true
  generalError.value = null
  try {
    const note = await notesApi.fetchNote(uuid)
    form.title = note.title
    form.body = note.body ?? ''
    form.is_pinned = note.is_pinned
    form.is_archived = note.is_archived
    loadedTitle.value = note.title
    await resizeTextarea()
  } catch {
    generalError.value = 'Не удалось загрузить заметку.'
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  isSubmitting.value = true
  errors.value = {}
  generalError.value = null
  try {
    const payload = {
      title: form.title,
      body: form.body || null,
      is_pinned: form.is_pinned,
      is_archived: form.is_archived,
    }
    if (isCreate.value) {
      await notesApi.createNote(payload)
    } else {
      await notesApi.updateNote(uuidParam.value as string, payload)
    }
    await router.push({ name: 'lk-notes' })
  } catch (error) {
    applyValidation(error)
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(): Promise<void> {
  if (uuidParam.value === null) {
    return
  }
  if (!window.confirm('Удалить заметку безвозвратно?')) {
    return
  }
  try {
    await notesApi.deleteNote(uuidParam.value)
    await router.push({ name: 'lk-notes' })
  } catch {
    generalError.value = 'Не удалось удалить заметку.'
  }
}

onMounted(() => {
  if (uuidParam.value !== null) {
    void loadNote(uuidParam.value)
  }
})
</script>

<template>
  <section class="note-edit">
    <p v-if="isLoading" class="note-edit__state" aria-live="polite">Загрузка…</p>

    <form v-else class="note-edit__card" novalidate @submit.prevent="handleSubmit">
      <h1 class="note-edit__title">{{ isCreate ? 'Новая заметка' : 'Редактирование заметки' }}</h1>

      <p v-if="generalError" role="alert" class="note-edit__error">{{ generalError }}</p>

      <div class="note-edit__field">
        <label for="note-title">Заголовок</label>
        <input id="note-title" v-model="form.title" type="text" required />
        <span v-if="errors.title" class="note-edit__error">{{ errors.title[0] }}</span>
      </div>

      <div class="note-edit__field">
        <label for="note-body">Текст</label>
        <textarea
          id="note-body"
          ref="bodyTextarea"
          v-model="form.body"
          class="note-edit__textarea"
          rows="6"
        ></textarea>
        <span v-if="errors.body" class="note-edit__error">{{ errors.body[0] }}</span>
      </div>

      <div class="note-edit__toggles">
        <label class="note-edit__toggle-row" for="note-pin-toggle">
          Закрепить
          <input id="note-pin-toggle" v-model="form.is_pinned" type="checkbox" role="switch" />
        </label>
        <label class="note-edit__toggle-row" for="note-archive-toggle">
          В архив
          <input id="note-archive-toggle" v-model="form.is_archived" type="checkbox" role="switch" />
        </label>
      </div>

      <div class="note-edit__actions">
        <button type="submit" class="note-edit__save" :disabled="isSubmitting">
          {{ isSubmitting ? 'Сохранение…' : 'Сохранить' }}
        </button>
        <button v-if="!isCreate" type="button" class="note-edit__delete" @click="handleDelete">Удалить</button>
        <RouterLink :to="{ name: 'lk-notes' }" class="note-edit__cancel">Отмена</RouterLink>
      </div>
    </form>
  </section>
</template>

<style scoped>
.note-edit {
  max-width: 640px;
  margin: 0 auto;
}

.note-edit__state {
  padding: 2rem 0;
  color: #6b716e;
}

.note-edit__card {
  background: #fff;
  border-radius: 18px;
  padding: 1.25rem 1.4rem 1.4rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.note-edit__title {
  margin: 0 0 1.1rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2622;
}

.note-edit__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.note-edit__field label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #6b716e;
}

.note-edit__field input,
.note-edit__textarea {
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  border: 1px solid #d8ebe4;
  font-size: 0.92rem;
  font-family: inherit;
  color: #1f2622;
}

.note-edit__textarea {
  resize: vertical;
  min-height: 140px;
  line-height: 1.5;
}

.note-edit__toggles {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.1rem;
}

.note-edit__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.88rem;
  color: #1f2622;
  cursor: pointer;
}

.note-edit__toggle-row input {
  cursor: pointer;
  width: 1.2rem;
  height: 1.2rem;
  accent-color: #17897a;
}

.note-edit__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.note-edit__save {
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 10px;
  background: #17897a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.note-edit__save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.note-edit__delete {
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 10px;
  background: #f6dfda;
  color: #cf5b4a;
  font-weight: 600;
  cursor: pointer;
}

.note-edit__cancel {
  color: #6b716e;
  font-size: 0.88rem;
  text-decoration: underline;
}

.note-edit__error {
  display: block;
  color: #cf5b4a;
  font-size: 0.8rem;
}
</style>
