<script setup lang="ts">
import { computed } from 'vue'

import { formatDateTime } from '@/utils/datetime'
import type { Reminder, SnoozeOption } from '@/types/reminder'

interface Props {
  reminder: Reminder
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [uuid: string]
  complete: [uuid: string]
  snooze: [uuid: string, option: SnoozeOption]
  remove: [uuid: string]
}>()

const recurrenceLabels: Record<Reminder['recurrence'], string> = {
  none: 'Без повтора',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
}

const remindAtLabel = computed<string>(() => formatDateTime(props.reminder.remind_at))
const recurrenceLabel = computed<string>(() => recurrenceLabels[props.reminder.recurrence])
const snoozedLabel = computed<string>(() => formatDateTime(props.reminder.snoozed_until))

function handleOpen(): void {
  emit('open', props.reminder.uuid)
}
</script>

<template>
  <article class="reminder-card" :class="{ 'reminder-card--done': reminder.is_completed }">
    <div class="reminder-card__main" @click="handleOpen">
      <header class="reminder-card__header">
        <h3 class="reminder-card__title">{{ reminder.title }}</h3>
        <span
          class="badge"
          :class="reminder.is_completed ? 'badge--done' : 'badge--pending'"
        >
          {{ reminder.is_completed ? 'Выполнено' : 'Ожидает' }}
        </span>
      </header>
      <p class="reminder-card__meta">
        <span>🕑 {{ remindAtLabel }}</span>
        <span v-if="reminder.recurrence !== 'none'" class="badge badge--recurrence">
          🔁 {{ recurrenceLabel }}
        </span>
        <span v-if="snoozedLabel" class="reminder-card__snoozed">⏰ до {{ snoozedLabel }}</span>
      </p>
      <p v-if="reminder.notes" class="reminder-card__notes">{{ reminder.notes }}</p>
    </div>

    <footer class="reminder-card__actions">
      <button
        v-if="!reminder.is_completed"
        type="button"
        @click="emit('complete', reminder.uuid)"
      >
        Выполнить
      </button>
      <button
        v-if="!reminder.is_completed"
        type="button"
        @click="emit('snooze', reminder.uuid, '10m')"
      >
        +10 мин
      </button>
      <button
        v-if="!reminder.is_completed"
        type="button"
        @click="emit('snooze', reminder.uuid, '1h')"
      >
        +1 час
      </button>
      <button type="button" class="danger" @click="emit('remove', reminder.uuid)">Удалить</button>
    </footer>
  </article>
</template>

<style scoped>
.reminder-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  background: #fff;
}

.reminder-card--done {
  opacity: 0.65;
}

.reminder-card__main {
  cursor: pointer;
}

.reminder-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.reminder-card__title {
  margin: 0;
  font-size: 1rem;
}

.reminder-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin: 0.5rem 0 0;
  color: #555;
  font-size: 0.9rem;
}

.reminder-card__notes {
  margin: 0.5rem 0 0;
  color: #555;
  white-space: pre-wrap;
}

.reminder-card__snoozed {
  color: #b9770e;
}

.reminder-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.badge {
  font-size: 0.8rem;
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
}

.badge--pending {
  background: #fef3c7;
  color: #92400e;
}

.badge--done {
  background: #dcfce7;
  color: #166534;
}

.badge--recurrence {
  background: #e0e7ff;
  color: #3730a3;
}

.danger {
  color: #c0392b;
}
</style>
