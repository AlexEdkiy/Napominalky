<script setup lang="ts">
import { onMounted, watch } from 'vue'

import LkMiniCalendar from '@/components/lk/tasks/LkMiniCalendar.vue'
import LkOverviewReminderItem from '@/components/lk/LkOverviewReminderItem.vue'
import { useCalendar } from '@/composables/useCalendar'
import { useLkForms } from '@/composables/useLkForms'
import { useLkUpcomingReminders } from '@/composables/useLkUpcomingReminders'

const { openReminderForm, remindersVersion } = useLkForms()
const { currentYear, currentMonth, byDay, load: loadCalendar } = useCalendar()
const { isLoading, error, reminders, load: loadReminders } = useLkUpcomingReminders()

function handleOpenReminder(uuid: string): void {
  const reminder = reminders.value.find((candidate) => candidate.uuid === uuid)
  openReminderForm(reminder)
}

// Модалка «Напоминание» рендерится в `LkLayout` — обновляем свой список
// ближайших напоминаний после успешного сохранения/удаления через неё.
watch(remindersVersion, () => void loadReminders())

onMounted(() => {
  void loadCalendar()
  void loadReminders()
})
</script>

<template>
  <aside class="lk-tasks-right-rail" aria-label="Календарь и ближайшие напоминания">
    <section class="lk-tasks-right-rail__panel">
      <LkMiniCalendar :year="currentYear" :month="currentMonth" :by-day="byDay" />
    </section>

    <section class="lk-tasks-right-rail__panel" aria-labelledby="right-rail-upcoming-heading">
      <h3 id="right-rail-upcoming-heading" class="lk-tasks-right-rail__title">Ближайшие напоминания</h3>

      <p v-if="isLoading" class="lk-tasks-right-rail__state">Загрузка…</p>
      <p v-else-if="error" class="lk-tasks-right-rail__state lk-tasks-right-rail__state--error" role="alert">
        {{ error }}
      </p>
      <p v-else-if="reminders.length === 0" class="lk-tasks-right-rail__state">
        Предстоящих напоминаний нет.
      </p>
      <ul v-else class="lk-tasks-right-rail__list">
        <LkOverviewReminderItem
          v-for="reminder in reminders"
          :key="reminder.uuid"
          :reminder="reminder"
          variant="upcoming"
          @open="handleOpenReminder"
        />
      </ul>
    </section>
  </aside>
</template>

<style scoped>
.lk-tasks-right-rail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 280px;
  flex-shrink: 0;
}

.lk-tasks-right-rail__panel {
  background: #fff;
  border-radius: 18px;
  padding: 1.1rem 1.15rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.lk-tasks-right-rail__title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1f2622;
}

.lk-tasks-right-rail__state {
  color: #8a938f;
  padding: 0.4rem 0;
  margin: 0;
}

.lk-tasks-right-rail__state--error {
  color: #cf5b4a;
}

.lk-tasks-right-rail__list {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
