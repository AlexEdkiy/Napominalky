<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isAxiosError } from 'axios'

import { notesApi } from '@/api/notesApi'
import { useNotes } from '@/composables/useNotes'
import type { ValidationErrorResponse } from '@/types/api'

const route = useRoute()
const router = useRouter()
const { create, update, remove } = useNotes()

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
    const result = isCreate.value
      ? await create(payload)
      : await update(uuidParam.value as string, payload)
    if (result !== null) {
      await router.push({ name: 'lk-notes' })
    }
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
  const ok = await remove(uuidParam.value)
  if (ok) {
    await router.push({ name: 'lk-notes' })
  } else {
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
  <main class="note-edit">
    <h1>{{ isCreate ? 'Новая заметка' : 'Редактирование заметки' }}</h1>

    <p v-if="isLoading">Загрузка…</p>

    <form v-else novalidate @submit.prevent="handleSubmit">
      <p v-if="generalError" role="alert" class="error">{{ generalError }}</p>

      <div class="field">
        <label for="note-title">Заголовок</label>
        <input id="note-title" v-model="form.title" type="text" required />
        <span v-if="errors.title" class="error">{{ errors.title[0] }}</span>
      </div>

      <div class="field">
        <label for="note-body">Текст</label>
        <textarea id="note-body" v-model="form.body" rows="8"></textarea>
        <span v-if="errors.body" class="error">{{ errors.body[0] }}</span>
      </div>

      <label class="checkbox">
        <input v-model="form.is_pinned" type="checkbox" />
        Закрепить
      </label>

      <label class="checkbox">
        <input v-model="form.is_archived" type="checkbox" />
        В архив
      </label>

      <div class="actions">
        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Сохранение…' : 'Сохранить' }}
        </button>
        <button v-if="!isCreate" type="button" class="danger" @click="handleDelete">
          Удалить
        </button>
        <RouterLink :to="{ name: 'lk-notes' }">Отмена</RouterLink>
      </div>
    </form>
  </main>
</template>

<style scoped>
.note-edit {
  max-width: 640px;
  margin: 0 auto;
}

.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.danger {
  color: #c0392b;
}

.error {
  color: #c0392b;
}
</style>
