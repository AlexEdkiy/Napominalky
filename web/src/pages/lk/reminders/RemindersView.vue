<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import ReminderCard from '@/components/reminders/ReminderCard.vue'
import { useReminders } from '@/composables/useReminders'
import type { ReminderStatusFilter, SnoozeOption } from '@/types/reminder'

const router = useRouter()
const { reminders, isLoading, error, load, complete, snooze, remove } = useReminders()

const status = ref<ReminderStatusFilter>('pending')

async function refresh(): Promise<void> {
  await load({ status: status.value, sort: 'remind_at', order: 'asc' })
}

function changeStatus(next: ReminderStatusFilter): void {
  status.value = next
  void refresh()
}

function handleCreate(): void {
  void router.push({ name: 'lk-reminder-create' })
}

function handleOpen(uuid: string): void {
  void router.push({ name: 'lk-reminder-edit', params: { uuid } })
}

async function handleComplete(uuid: string): Promise<void> {
  await complete(uuid)
}

async function handleSnooze(uuid: string, option: SnoozeOption): Promise<void> {
  await snooze(uuid, option)
}

async function handleRemove(uuid: string): Promise<void> {
  if (!window.confirm('Удалить напоминание?')) {
    return
  }
  await remove(uuid)
}

onMounted(refresh)
</script>

<template>
  <main class="reminders">
    <header class="reminders__header">
      <h1>Напоминания</h1>
      <button type="button" @click="handleCreate">Создать</button>
    </header>

    <nav class="reminders__filters" aria-label="Фильтр по статусу">
      <button
        type="button"
        :class="{ active: status === 'pending' }"
        @click="changeStatus('pending')"
      >
        Активные
      </button>
      <button
        type="button"
        :class="{ active: status === 'completed' }"
        @click="changeStatus('completed')"
      >
        Выполненные
      </button>
      <button type="button" :class="{ active: status === 'all' }" @click="changeStatus('all')">
        Все
      </button>
    </nav>

    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="isLoading">Загрузка…</p>
    <p v-else-if="reminders.length === 0" class="empty">Напоминаний пока нет.</p>

    <section v-else class="reminders__list">
      <ReminderCard
        v-for="reminder in reminders"
        :key="reminder.uuid"
        :reminder="reminder"
        @open="handleOpen"
        @complete="handleComplete"
        @snooze="handleSnooze"
        @remove="handleRemove"
      />
    </section>
  </main>
</template>

<style scoped>
.reminders {
  max-width: 720px;
  margin: 0 auto;
}

.reminders__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reminders__filters {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}

.reminders__filters button.active {
  font-weight: 700;
  border-bottom: 2px solid #3730a3;
}

.error {
  color: #c0392b;
}

.empty {
  color: #777;
}
</style>
