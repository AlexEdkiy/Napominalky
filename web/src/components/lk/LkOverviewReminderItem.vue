<script setup lang="ts">
import { computed } from 'vue'

import LkIcon from '@/components/lk/LkIcon.vue'
import type { Reminder } from '@/types/reminder'

interface Props {
  reminder: Reminder
  /** today — чекбокс отметки выполнения; upcoming — только просмотр (иконка). */
  variant: 'today' | 'upcoming'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  complete: [uuid: string]
}>()

const timeLabel = computed<string>(() => {
  const date = new Date(props.reminder.remind_at)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
})

const dayLabel = computed<string>(() => {
  const remindDate = new Date(props.reminder.remind_at)
  if (Number.isNaN(remindDate.getTime())) {
    return ''
  }
  const now = new Date()
  const isToday =
    remindDate.getFullYear() === now.getFullYear() &&
    remindDate.getMonth() === now.getMonth() &&
    remindDate.getDate() === now.getDate()
  if (isToday) {
    return 'Сегодня'
  }
  return remindDate.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
})

function handleComplete(): void {
  emit('complete', props.reminder.uuid)
}
</script>

<template>
  <li class="lk-reminder-item">
    <button
      v-if="variant === 'today'"
      type="button"
      class="lk-reminder-item__checkbox"
      :aria-label="`Отметить выполненным: ${reminder.title}`"
      @click="handleComplete"
    >
      <LkIcon v-if="reminder.is_completed" name="check" :size="14" />
    </button>
    <span v-else class="lk-reminder-item__icon">
      <LkIcon name="bell" :size="16" />
    </span>

    <span class="lk-reminder-item__title">{{ reminder.title }}</span>
    <span class="lk-reminder-item__time">{{ dayLabel }} · {{ timeLabel }}</span>
  </li>
</template>

<style scoped>
.lk-reminder-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid #eef1f0;
}

.lk-reminder-item:last-child {
  border-bottom: none;
}

.lk-reminder-item__checkbox {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 2px solid #c7d0cc;
  background: #fff;
  color: #17897a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lk-reminder-item__icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #f7ebd5;
  color: #c98a2b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lk-reminder-item__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2622;
}

.lk-reminder-item__time {
  flex-shrink: 0;
  font-size: 0.8rem;
  color: #8a938f;
}
</style>
