<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isAxiosError } from 'axios'

import { remindersApi } from '@/api/remindersApi'
import { useReminders } from '@/composables/useReminders'
import { dateTimeLocalToIso, isoToDateTimeLocal } from '@/utils/datetime'
import type { ValidationErrorResponse } from '@/types/api'
import type { RecurrenceType } from '@/types/reminder'

const route = useRoute()
const router = useRouter()
const { create, update, remove } = useReminders()

const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'Без повтора' },
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
]

const uuidParam = computed<string | null>(() => {
  const value = route.params.uuid
  return typeof value === 'string' ? value : null
})
const isCreate = computed<boolean>(() => uuidParam.value === null)

const form = reactive({
  title: '',
  notes: '',
  remind_at: '',
  recurrence: 'none' as RecurrenceType,
})
const errors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
const isLoading = ref(false)
const isSubmitting = ref(false)

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
    const result = isCreate.value
      ? await create(payload)
      : await update(uuidParam.value as string, payload)
    if (result !== null) {
      await router.push({ name: 'lk-reminders' })
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
  if (!window.confirm('Удалить напоминание безвозвратно?')) {
    return
  }
  const ok = await remove(uuidParam.value)
  if (ok) {
    await router.push({ name: 'lk-reminders' })
  } else {
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
  <main class="reminder-edit">
    <h1>{{ isCreate ? 'Новое напоминание' : 'Редактирование напоминания' }}</h1>

    <p v-if="isLoading">Загрузка…</p>

    <form v-else novalidate @submit.prevent="handleSubmit">
      <p v-if="generalError" role="alert" class="error">{{ generalError }}</p>

      <div class="field">
        <label for="reminder-title">Заголовок</label>
        <input id="reminder-title" v-model="form.title" type="text" required />
        <span v-if="errors.title" class="error">{{ errors.title[0] }}</span>
      </div>

      <div class="field">
        <label for="reminder-notes">Заметки</label>
        <textarea id="reminder-notes" v-model="form.notes" rows="4"></textarea>
        <span v-if="errors.notes" class="error">{{ errors.notes[0] }}</span>
      </div>

      <div class="field">
        <label for="reminder-remind-at">Дата и время</label>
        <input id="reminder-remind-at" v-model="form.remind_at" type="datetime-local" required />
        <span v-if="errors.remind_at" class="error">{{ errors.remind_at[0] }}</span>
      </div>

      <fieldset class="field">
        <legend>Повтор</legend>
        <label v-for="option in recurrenceOptions" :key="option.value" class="radio">
          <input v-model="form.recurrence" type="radio" :value="option.value" />
          {{ option.label }}
        </label>
        <span v-if="errors.recurrence" class="error">{{ errors.recurrence[0] }}</span>
      </fieldset>

      <div class="actions">
        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Сохранение…' : 'Сохранить' }}
        </button>
        <button v-if="!isCreate" type="button" class="danger" @click="handleDelete">Удалить</button>
        <RouterLink :to="{ name: 'lk-reminders' }">Отмена</RouterLink>
      </div>
    </form>
  </main>
</template>

<style scoped>
.reminder-edit {
  max-width: 640px;
  margin: 0 auto;
}

.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
  border: none;
  padding: 0;
}

.radio {
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
