<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isAxiosError } from 'axios'

import { remindersApi } from '@/api/remindersApi'
import { useSetLkBreadcrumbTail } from '@/composables/useLkBreadcrumbTail'
import { dateTimeLocalToIso, isoToDateTimeLocal } from '@/utils/datetime'
import type { ValidationErrorResponse } from '@/types/api'
import type { RecurrenceType } from '@/types/reminder'

const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'Без повтора' },
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
]

const route = useRoute()
const router = useRouter()

const uuidParam = computed<string | null>(() => {
  const value = route.params.uuid
  return typeof value === 'string' ? value : null
})
const isCreate = computed<boolean>(() => uuidParam.value === null)

const form = reactive({ title: '', notes: '', remind_at: '', recurrence: 'none' as RecurrenceType })
const errors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
const isLoading = ref(false)
const isSubmitting = ref(false)
const notesTextarea = ref<HTMLTextAreaElement | null>(null)

// Крошка-хвост читает уже загруженный заголовок напоминания. На маршруте
// создания (`lk-reminder-create`) значение игнорируется — там хвост
// статический (см. `constants/lkBreadcrumbs.ts`).
const loadedTitle = ref<string | null>(null)
useSetLkBreadcrumbTail(() => loadedTitle.value)

async function resizeTextarea(): Promise<void> {
  await nextTick()
  const el = notesTextarea.value
  if (el) {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
}

watch(() => form.notes, resizeTextarea)

function applyValidation(error: unknown): void {
  if (isAxiosError<ValidationErrorResponse>(error) && error.response?.status === 422) {
    errors.value = error.response.data.errors
    return
  }
  generalError.value = 'Не удалось сохранить напоминание. Попробуйте позже.'
}

async function loadReminder(uuid: string): Promise<void> {
  isLoading.value = true
  generalError.value = null
  try {
    const reminder = await remindersApi.fetchReminder(uuid)
    form.title = reminder.title
    form.notes = reminder.notes ?? ''
    form.remind_at = isoToDateTimeLocal(reminder.remind_at)
    form.recurrence = reminder.recurrence
    loadedTitle.value = reminder.title
    await resizeTextarea()
  } catch {
    generalError.value = 'Не удалось загрузить напоминание.'
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  isSubmitting.value = true
  errors.value = {}
  generalError.value = null
  try {
    const remindAtIso = dateTimeLocalToIso(form.remind_at)
    if (remindAtIso === null) {
      errors.value = { remind_at: ['Укажите дату и время напоминания.'] }
      return
    }
    const payload = {
      title: form.title,
      notes: form.notes || null,
      remind_at: remindAtIso,
      recurrence: form.recurrence,
    }
    if (isCreate.value) {
      await remindersApi.createReminder(payload)
    } else {
      await remindersApi.updateReminder(uuidParam.value as string, payload)
    }
    await router.push({ name: 'lk-reminders' })
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
  if (!window.confirm('Удалить напоминание безвозвратно?')) {
    return
  }
  try {
    await remindersApi.deleteReminder(uuidParam.value)
    await router.push({ name: 'lk-reminders' })
  } catch {
    generalError.value = 'Не удалось удалить напоминание.'
  }
}

onMounted(() => {
  if (uuidParam.value !== null) {
    void loadReminder(uuidParam.value)
  }
})
</script>

<template>
  <section class="reminder-edit">
    <p v-if="isLoading" class="reminder-edit__state" aria-live="polite">Загрузка…</p>

    <form v-else class="reminder-edit__card" novalidate @submit.prevent="handleSubmit">
      <h1 class="reminder-edit__title">{{ isCreate ? 'Новое напоминание' : 'Редактирование напоминания' }}</h1>

      <p v-if="generalError" role="alert" class="reminder-edit__error">{{ generalError }}</p>

      <div class="reminder-edit__field">
        <label for="reminder-title">Заголовок</label>
        <input id="reminder-title" v-model="form.title" type="text" required />
        <span v-if="errors.title" class="reminder-edit__error">{{ errors.title[0] }}</span>
      </div>

      <div class="reminder-edit__field">
        <label for="reminder-notes">Заметки</label>
        <textarea
          id="reminder-notes"
          ref="notesTextarea"
          v-model="form.notes"
          class="reminder-edit__textarea"
          rows="3"
        ></textarea>
        <span v-if="errors.notes" class="reminder-edit__error">{{ errors.notes[0] }}</span>
      </div>

      <div class="reminder-edit__field">
        <label for="reminder-remind-at">Когда</label>
        <input id="reminder-remind-at" v-model="form.remind_at" type="datetime-local" required />
        <span v-if="errors.remind_at" class="reminder-edit__error">{{ errors.remind_at[0] }}</span>
      </div>

      <div class="reminder-edit__field">
        <span class="reminder-edit__label">Повтор</span>
        <div class="reminder-edit__recurrence" role="radiogroup" aria-label="Повтор напоминания">
          <button
            v-for="option in recurrenceOptions"
            :key="option.value"
            type="button"
            class="reminder-edit__recurrence-btn"
            :class="{ 'reminder-edit__recurrence-btn--active': form.recurrence === option.value }"
            role="radio"
            :aria-checked="form.recurrence === option.value"
            @click="form.recurrence = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <span v-if="errors.recurrence" class="reminder-edit__error">{{ errors.recurrence[0] }}</span>
      </div>

      <div class="reminder-edit__actions">
        <button type="submit" class="reminder-edit__save" :disabled="isSubmitting">
          {{ isSubmitting ? 'Сохранение…' : 'Сохранить' }}
        </button>
        <button v-if="!isCreate" type="button" class="reminder-edit__delete" @click="handleDelete">
          Удалить
        </button>
        <RouterLink :to="{ name: 'lk-reminders' }" class="reminder-edit__cancel">Отмена</RouterLink>
      </div>
    </form>
  </section>
</template>

<style scoped>
.reminder-edit {
  max-width: 640px;
  margin: 0 auto;
}

.reminder-edit__state {
  padding: 2rem 0;
  color: #6b716e;
}

.reminder-edit__card {
  background: #fff;
  border-radius: 18px;
  padding: 1.25rem 1.4rem 1.4rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.reminder-edit__title {
  margin: 0 0 1.1rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2622;
}

.reminder-edit__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.reminder-edit__field label,
.reminder-edit__label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #6b716e;
}

.reminder-edit__field input,
.reminder-edit__textarea {
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  border: 1px solid #d8ebe4;
  font-size: 0.92rem;
  font-family: inherit;
  color: #1f2622;
}

.reminder-edit__textarea {
  resize: none;
  overflow: hidden;
  min-height: 60px;
  line-height: 1.5;
}

.reminder-edit__recurrence {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.reminder-edit__recurrence-btn {
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  border: 1px solid #d8ebe4;
  background: #fff;
  color: #6b716e;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.reminder-edit__recurrence-btn--active {
  background: #f7ebd5;
  border-color: #c98a2b;
  color: #c98a2b;
}

.reminder-edit__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.reminder-edit__save {
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 10px;
  background: #17897a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.reminder-edit__save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reminder-edit__delete {
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 10px;
  background: #f6dfda;
  color: #cf5b4a;
  font-weight: 600;
  cursor: pointer;
}

.reminder-edit__cancel {
  color: #6b716e;
  font-size: 0.88rem;
  text-decoration: underline;
}

.reminder-edit__error {
  display: block;
  color: #cf5b4a;
  font-size: 0.8rem;
}
</style>
