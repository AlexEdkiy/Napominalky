<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'

import LkConfirmDialog from '@/components/lk/LkConfirmDialog.vue'
import LkOverviewReminderItem from '@/components/lk/LkOverviewReminderItem.vue'
import LkStatCard from '@/components/lk/LkStatCard.vue'
import { useLkDashboard } from '@/composables/useLkDashboard'
import { useLkForms } from '@/composables/useLkForms'

const { openReminderForm, remindersVersion } = useLkForms()
const {
  isLoading,
  error,
  stats,
  todaysReminders,
  upcomingReminders,
  pendingCompleteUuid,
  load,
  requestComplete,
  confirmComplete,
  cancelComplete,
} = useLkDashboard()

// Модалка «Напоминание» рендерится в `LkLayout` — перезагружаем сводку после
// успешного сохранения/удаления через неё (см. `notifyReminderSaved`).
watch(remindersVersion, () => void load())

onMounted(load)

function openReminder(uuid: string): void {
  const reminder = [...todaysReminders.value, ...upcomingReminders.value].find(
    (candidate) => candidate.uuid === uuid,
  )
  openReminderForm(reminder)
}
</script>

<template>
  <section class="dashboard">
    <p v-if="isLoading" class="dashboard__state" aria-live="polite">Загрузка…</p>

    <p v-else-if="error" class="dashboard__state dashboard__state--error" role="alert">
      {{ error }}
    </p>

    <template v-else>
      <div class="dashboard__stats">
        <LkStatCard
          icon="list"
          variant="blue"
          :value="String(stats.activeTasksCount)"
          label="Активных задач"
          :to="{ name: 'lk-tasks' }"
        />
        <LkStatCard
          icon="bell"
          variant="amber"
          :value="String(stats.remindersTodayCount)"
          label="Напоминаний сегодня"
          :to="{ name: 'lk-reminders' }"
        />
        <LkStatCard
          icon="note"
          variant="teal"
          :value="String(stats.notesCount)"
          label="Заметок"
          :to="{ name: 'lk-notes' }"
        />
        <LkStatCard
          icon="check"
          variant="gradient"
          :value="`${stats.completedWeekPercent}%`"
          label="Выполнено за неделю"
        />
      </div>

      <div class="dashboard__panels">
        <section class="dashboard__panel" aria-labelledby="dashboard-today-heading">
          <header class="dashboard__panel-header">
            <h2 id="dashboard-today-heading" class="dashboard__panel-title">Задачи на сегодня</h2>
            <RouterLink :to="{ name: 'lk-tasks' }" class="dashboard__panel-link">
              Все задачи →
            </RouterLink>
          </header>

          <p v-if="todaysReminders.length === 0" class="dashboard__empty">
            Нет задач на сегодня.
          </p>
          <ul v-else class="dashboard__list">
            <LkOverviewReminderItem
              v-for="reminder in todaysReminders"
              :key="reminder.uuid"
              :reminder="reminder"
              variant="today"
              @complete="requestComplete"
              @open="openReminder"
            />
          </ul>
        </section>

        <section class="dashboard__panel" aria-labelledby="dashboard-upcoming-heading">
          <header class="dashboard__panel-header">
            <h2 id="dashboard-upcoming-heading" class="dashboard__panel-title">
              Ближайшие напоминания
            </h2>
          </header>

          <p v-if="upcomingReminders.length === 0" class="dashboard__empty">
            Предстоящих напоминаний нет.
          </p>
          <ul v-else class="dashboard__list">
            <LkOverviewReminderItem
              v-for="reminder in upcomingReminders"
              :key="reminder.uuid"
              :reminder="reminder"
              variant="upcoming"
              @open="openReminder"
            />
          </ul>
        </section>
      </div>
    </template>

    <LkConfirmDialog
      v-if="pendingCompleteUuid !== null"
      title="Подтвердите выполнение задачи"
      confirm-label="Да"
      cancel-label="Отмена"
      @confirm="confirmComplete"
      @cancel="cancelComplete"
    />
  </section>
</template>

<style scoped>
.dashboard {
  max-width: 1080px;
  margin: 0 auto;
}

.dashboard__state {
  padding: 2rem 0;
  color: #6b716e;
}

.dashboard__state--error {
  color: #cf5b4a;
}

.dashboard__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 900px) {
  .dashboard__stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

.dashboard__panels {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1.25rem;
}

@media (max-width: 900px) {
  .dashboard__panels {
    grid-template-columns: 1fr;
  }
}

.dashboard__panel {
  background: #fff;
  border-radius: 18px;
  padding: 1.1rem 1.25rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.dashboard__panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.dashboard__panel-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f2622;
}

.dashboard__panel-link {
  font-size: 0.85rem;
  color: #17897a;
  text-decoration: none;
  white-space: nowrap;
}

.dashboard__panel-link:hover {
  text-decoration: underline;
}

.dashboard__empty {
  color: #8a938f;
  padding: 0.5rem 0;
}

.dashboard__list {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
