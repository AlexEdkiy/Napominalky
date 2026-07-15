<script setup lang="ts">
import { computed } from 'vue'

import LkIcon from '@/components/lk/LkIcon.vue'
import type { Reminder, SnoozeOption } from '@/types/reminder'
import { formatDateTime } from '@/utils/datetime'

interface Props {
  reminder: Reminder
  /** Показывать чекбокс множественного выбора (не «выполнить»). */
  selectable?: boolean
  /** Карточка выбрана (управляется родителем). */
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectable: false,
  selected: false,
})

const emit = defineEmits<{
  open: [uuid: string]
  complete: [uuid: string]
  snooze: [uuid: string, option: SnoozeOption]
  remove: [uuid: string]
  toggleSelect: [uuid: string]
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

function stop(event: Event, action: () => void): void {
  event.stopPropagation()
  action()
}
</script>

<template>
  <article
    class="lk-reminder-card"
    :class="{ 'lk-reminder-card--done': reminder.is_completed }"
    @click="emit('open', reminder.uuid)"
  >
    <label v-if="selectable" class="lk-reminder-card__select" @click.stop>
      <input
        type="checkbox"
        class="lk-reminder-card__select-input"
        :checked="selected"
        :aria-label="`Выбрать: ${reminder.title}`"
        @change="emit('toggleSelect', reminder.uuid)"
      />
    </label>

    <span class="lk-reminder-card__icon"><LkIcon name="bell" :size="18" /></span>

    <div class="lk-reminder-card__body">
      <div class="lk-reminder-card__row">
        <h3 class="lk-reminder-card__title">{{ reminder.title }}</h3>
        <span
          class="lk-reminder-card__status"
          :class="reminder.is_completed ? 'lk-reminder-card__status--done' : 'lk-reminder-card__status--pending'"
        >
          {{ reminder.is_completed ? 'Выполнено' : 'Ожидает' }}
        </span>
      </div>

      <p class="lk-reminder-card__meta">
        <span>{{ remindAtLabel }}</span>
        <span v-if="reminder.recurrence !== 'none'" class="lk-reminder-card__recurrence">
          {{ recurrenceLabel }}
        </span>
        <span v-if="snoozedLabel" class="lk-reminder-card__snoozed">Отложено до {{ snoozedLabel }}</span>
      </p>

      <p v-if="reminder.notes" class="lk-reminder-card__notes">{{ reminder.notes }}</p>

      <div class="lk-reminder-card__actions">
        <button
          v-if="!reminder.is_completed"
          type="button"
          class="lk-reminder-card__action lk-reminder-card__action--complete"
          :aria-label="`Отметить выполненным: ${reminder.title}`"
          @click="stop($event, () => emit('complete', reminder.uuid))"
        >
          <LkIcon name="check" :size="14" />
          Выполнить
        </button>
        <button
          v-if="!reminder.is_completed"
          type="button"
          class="lk-reminder-card__action"
          @click="stop($event, () => emit('snooze', reminder.uuid, '10m'))"
        >
          +10 мин
        </button>
        <button
          v-if="!reminder.is_completed"
          type="button"
          class="lk-reminder-card__action"
          @click="stop($event, () => emit('snooze', reminder.uuid, '1h'))"
        >
          +1 час
        </button>
        <button
          type="button"
          class="lk-reminder-card__action"
          :aria-label="`Редактировать ${reminder.title}`"
          @click="stop($event, () => emit('open', reminder.uuid))"
        >
          <LkIcon name="edit" :size="14" />
        </button>
        <button
          type="button"
          class="lk-reminder-card__action lk-reminder-card__action--danger"
          :aria-label="`Удалить ${reminder.title}`"
          @click="stop($event, () => emit('remove', reminder.uuid))"
        >
          <LkIcon name="trash" :size="14" />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.lk-reminder-card {
  display: flex;
  gap: 0.75rem;
  background: #fff;
  border-radius: 18px;
  padding: 1rem 1.15rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.lk-reminder-card--done {
  opacity: 0.65;
}

.lk-reminder-card__select {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 0.65rem;
  cursor: pointer;
}

.lk-reminder-card__select-input {
  width: 16px;
  height: 16px;
  accent-color: #17897a;
  cursor: pointer;
}

.lk-reminder-card__icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #f7ebd5;
  color: #c98a2b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lk-reminder-card__body {
  flex: 1;
  min-width: 0;
}

.lk-reminder-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.lk-reminder-card__title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: #1f2622;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lk-reminder-card__status {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.lk-reminder-card__status--pending {
  background: #f7ebd5;
  color: #c98a2b;
}

.lk-reminder-card__status--done {
  background: #eef1f0;
  color: #6b716e;
}

.lk-reminder-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  margin: 0.35rem 0 0;
  color: #8a938f;
  font-size: 0.82rem;
}

.lk-reminder-card__recurrence {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: #eef1f0;
  color: #6b716e;
  font-size: 0.72rem;
  font-weight: 600;
}

.lk-reminder-card__snoozed {
  color: #c98a2b;
}

.lk-reminder-card__notes {
  margin: 0.4rem 0 0;
  color: #6b716e;
  font-size: 0.85rem;
  white-space: pre-wrap;
}

.lk-reminder-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.65rem;
}

.lk-reminder-card__action {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: 8px;
  border: none;
  background: #eef1f0;
  color: #6b716e;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.lk-reminder-card__action--complete {
  background: #d8ebe4;
  color: #17897a;
}

.lk-reminder-card__action--danger:hover {
  background: #f6dfda;
  color: #cf5b4a;
}
</style>
