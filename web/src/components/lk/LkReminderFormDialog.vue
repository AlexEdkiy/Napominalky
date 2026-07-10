<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { isAxiosError } from 'axios'

import LkConfirmDialog from '@/components/lk/LkConfirmDialog.vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import { useLkBreakpoint } from '@/composables/useLkBreakpoint'
import { useLkForms } from '@/composables/useLkForms'
import { remindersApi } from '@/api/remindersApi'
import type { ValidationErrorResponse } from '@/types/api'
import type { RecurrenceType } from '@/types/reminder'

interface DatePill {
  key: string
  label: string
  date: Date
}

/** Пресеты времени (amber-пилюли), см. `web-lk-forms.md`, форма 3. */
const TIME_PRESETS = ['09:00', '12:00', '18:00', '21:00']

const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'Без повтора' },
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
]

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

/** Ближайшая суббота — сегодня, если сегодня уже суббота. */
function nextSaturday(from: Date): Date {
  const diff = (6 - from.getDay() + 7) % 7
  return addDays(from, diff)
}

function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatActualDateLabel(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

const { isDesktop } = useLkBreakpoint()
const { isReminderFormOpen, reminderFormReminder, closeForm, notifyReminderSaved } = useLkForms()

const form = reactive({ title: '', notes: '', recurrence: 'none' as RecurrenceType })
const errors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
const isSubmitting = ref(false)
const isDeleting = ref(false)
const isConfirmingDelete = ref(false)

const datePresets = ref<DatePill[]>([])
const actualDatePill = ref<DatePill | null>(null)
const selectedDateKey = ref<string | null>(null)

const actualTimeValue = ref<string | null>(null)
const selectedTimeKey = ref<string | null>(null)

const isEdit = computed<boolean>(() => reminderFormReminder.value !== null)
const title = computed<string>(() => (isEdit.value ? 'Редактирование напоминания' : 'Новое напоминание'))
const submitLabel = computed<string>(() => (isEdit.value ? 'Сохранить' : 'Создать'))

const datePills = computed<DatePill[]>(() =>
  actualDatePill.value !== null ? [...datePresets.value, actualDatePill.value] : datePresets.value,
)
const timePills = computed<string[]>(() =>
  actualTimeValue.value !== null ? [actualTimeValue.value, ...TIME_PRESETS] : TIME_PRESETS,
)

function resetForm(): void {
  const reminder = reminderFormReminder.value
  form.title = reminder?.title ?? ''
  form.notes = reminder?.notes ?? ''
  form.recurrence = reminder?.recurrence ?? 'none'
  errors.value = {}
  generalError.value = null
  isConfirmingDelete.value = false

  const today = startOfDay(new Date())
  datePresets.value = [
    { key: 'today', label: 'Сегодня', date: today },
    { key: 'tomorrow', label: 'Завтра', date: addDays(today, 1) },
    { key: 'weekend', label: 'В выходные', date: nextSaturday(today) },
    { key: 'nextWeek', label: 'Через неделю', date: addDays(today, 7) },
  ]
  actualDatePill.value = null
  actualTimeValue.value = null
  selectedDateKey.value = null
  selectedTimeKey.value = null

  if (reminder === null) {
    return
  }
  const remindDate = new Date(reminder.remind_at)
  if (Number.isNaN(remindDate.getTime())) {
    return
  }
  const matchedDate = datePresets.value.find((preset) => isSameDate(preset.date, remindDate))
  if (matchedDate) {
    selectedDateKey.value = matchedDate.key
  } else {
    actualDatePill.value = { key: 'actual', label: formatActualDateLabel(remindDate), date: startOfDay(remindDate) }
    selectedDateKey.value = 'actual'
  }

  const hh = String(remindDate.getHours()).padStart(2, '0')
  const mm = String(remindDate.getMinutes()).padStart(2, '0')
  const timeValue = `${hh}:${mm}`
  if (TIME_PRESETS.includes(timeValue)) {
    selectedTimeKey.value = timeValue
  } else {
    actualTimeValue.value = timeValue
    selectedTimeKey.value = timeValue
  }
}

watch(isReminderFormOpen, (open) => {
  if (open) {
    resetForm()
  }
})

function selectDate(key: string): void {
  selectedDateKey.value = key
}

function selectTime(value: string): void {
  selectedTimeKey.value = value
}

function buildRemindAtIso(): string | null {
  const datePill = datePills.value.find((pill) => pill.key === selectedDateKey.value)
  if (!datePill || selectedTimeKey.value === null) {
    return null
  }
  const [hours, minutes] = selectedTimeKey.value.split(':').map(Number)
  const combined = new Date(
    datePill.date.getFullYear(),
    datePill.date.getMonth(),
    datePill.date.getDate(),
    hours,
    minutes,
  )
  return combined.toISOString()
}

function applyValidation(error: unknown): void {
  if (isAxiosError<ValidationErrorResponse>(error) && error.response?.status === 422) {
    errors.value = error.response.data.errors
    return
  }
  generalError.value = 'Не удалось сохранить напоминание. Попробуйте позже.'
}

function handleClose(): void {
  closeForm()
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isReminderFormOpen.value) {
    handleClose()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

async function handleSubmit(): Promise<void> {
  errors.value = {}
  generalError.value = null
  const trimmedTitle = form.title.trim()
  if (trimmedTitle === '') {
    errors.value = { title: ['Введите текст напоминания.'] }
    return
  }
  const remindAtIso = buildRemindAtIso()
  if (remindAtIso === null) {
    errors.value = { remind_at: ['Укажите дату и время напоминания.'] }
    return
  }
  isSubmitting.value = true
  try {
    const payload = {
      title: trimmedTitle,
      notes: form.notes || null,
      remind_at: remindAtIso,
      recurrence: form.recurrence,
    }
    const current = reminderFormReminder.value
    if (current === null) {
      await remindersApi.createReminder(payload)
    } else {
      await remindersApi.updateReminder(current.uuid, payload)
    }
    notifyReminderSaved()
    closeForm()
  } catch (error) {
    applyValidation(error)
  } finally {
    isSubmitting.value = false
  }
}

function requestDelete(): void {
  isConfirmingDelete.value = true
}

function cancelDelete(): void {
  isConfirmingDelete.value = false
}

async function confirmDelete(): Promise<void> {
  const current = reminderFormReminder.value
  isConfirmingDelete.value = false
  if (current === null) {
    return
  }
  isDeleting.value = true
  try {
    await remindersApi.deleteReminder(current.uuid)
    notifyReminderSaved()
    closeForm()
  } catch {
    generalError.value = 'Не удалось удалить напоминание.'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div v-if="isReminderFormOpen" class="lk-form-dialog__overlay" :class="{ 'lk-form-dialog__overlay--desktop': isDesktop }" @click.self="handleClose">
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

        <label class="lk-form-dialog__label" for="reminder-form-title">О чём напомнить</label>
        <input
          id="reminder-form-title"
          v-model="form.title"
          type="text"
          class="lk-form-dialog__input"
          placeholder="Например, позвонить маме"
          required
          autofocus
        />
        <span v-if="errors.title" class="lk-form-dialog__error">{{ errors.title[0] }}</span>

        <label class="lk-form-dialog__label" for="reminder-form-notes">Заметка</label>
        <input
          id="reminder-form-notes"
          v-model="form.notes"
          type="text"
          class="lk-form-dialog__input"
          placeholder="Добавьте детали"
        />

        <span class="lk-form-dialog__label">Дата</span>
        <div class="lk-form-dialog__pills">
          <button
            v-for="pill in datePills"
            :key="pill.key"
            type="button"
            class="lk-form-dialog__pill"
            :class="{ 'lk-form-dialog__pill--active': selectedDateKey === pill.key }"
            @click="selectDate(pill.key)"
          >
            {{ pill.label }}
          </button>
        </div>
        <span v-if="errors.remind_at" class="lk-form-dialog__error">{{ errors.remind_at[0] }}</span>

        <span class="lk-form-dialog__label">Время</span>
        <div class="lk-form-dialog__pills">
          <button
            v-for="value in timePills"
            :key="value"
            type="button"
            class="lk-form-dialog__pill lk-form-dialog__pill--amber"
            :class="{ 'lk-form-dialog__pill--active': selectedTimeKey === value }"
            @click="selectTime(value)"
          >
            {{ value }}
          </button>
        </div>

        <span class="lk-form-dialog__label">Повтор</span>
        <div class="lk-form-dialog__pills" role="radiogroup" aria-label="Повтор напоминания">
          <button
            v-for="option in recurrenceOptions"
            :key="option.value"
            type="button"
            class="lk-form-dialog__pill"
            :class="{ 'lk-form-dialog__pill--active': form.recurrence === option.value }"
            role="radio"
            :aria-checked="form.recurrence === option.value"
            @click="form.recurrence = option.value"
          >
            {{ option.label }}
          </button>
        </div>

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
      title="Удалить напоминание?"
      message="Напоминание будет удалено безвозвратно."
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

.lk-form-dialog__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lk-form-dialog__pill {
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 18px;
  background: #eef1f0;
  color: #5a625e;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.lk-form-dialog__pill--active {
  background: #17897a;
  color: #fff;
}

.lk-form-dialog__pill--amber {
  background: #f7ebd5;
  color: #c98a2b;
}

.lk-form-dialog__pill--amber.lk-form-dialog__pill--active {
  background: #d99a3e;
  color: #fff;
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
</style>
