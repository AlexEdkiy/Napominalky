<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import MonthGrid from '@/components/calendar/MonthGrid.vue'
import { useCalendar } from '@/composables/useCalendar'
import type { Reminder } from '@/types/reminder'
import { ymd } from '@/utils/calendar'

const { currentYear, currentMonth, isLoading, error, byDay, load, prevMonth, nextMonth } =
  useCalendar()

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const

const selectedDate = ref<Date | null>(new Date())

const monthLabel = computed<string>(() => `${monthNames[currentMonth.value]} ${currentYear.value}`)

const selectedDayReminders = computed<Reminder[]>(() => {
  if (selectedDate.value === null) {
    return []
  }
  return byDay.value.get(ymd(selectedDate.value)) ?? []
})

const selectedDayLabel = computed<string>(() => {
  if (selectedDate.value === null) {
    return ''
  }
  return selectedDate.value.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function handleSelectDay(date: Date): void {
  selectedDate.value = date
}

onMounted(load)
</script>

<template>
  <section class="calendar">
    <header class="calendar__nav">
      <button type="button" class="calendar__nav-btn" aria-label="Предыдущий месяц" @click="prevMonth">
        ‹
      </button>
      <h2 class="calendar__title">{{ monthLabel }}</h2>
      <button type="button" class="calendar__nav-btn" aria-label="Следующий месяц" @click="nextMonth">
        ›
      </button>
    </header>

    <p v-if="isLoading" class="calendar__state">Загрузка…</p>
    <p v-else-if="error" class="calendar__state calendar__state--error" role="alert">{{ error }}</p>

    <template v-else>
      <MonthGrid
        :year="currentYear"
        :month="currentMonth"
        :by-day="byDay"
        :selected-date="selectedDate"
        @select-day="handleSelectDay"
      />

      <div class="calendar__day">
        <h3 class="calendar__day-title">{{ selectedDayLabel }}</h3>
        <p v-if="selectedDayReminders.length === 0" class="calendar__state">
          На этот день напоминаний нет.
        </p>
        <ul v-else class="calendar__list">
          <li v-for="reminder in selectedDayReminders" :key="reminder.uuid" class="calendar__item">
            <RouterLink
              class="calendar__link"
              :to="{ name: 'lk-reminder-edit', params: { uuid: reminder.uuid } }"
            >
              <span class="calendar__time">{{ formatTime(reminder.remind_at) }}</span>
              <span class="calendar__item-title">{{ reminder.title }}</span>
              <span
                v-if="reminder.is_completed"
                class="calendar__badge"
                aria-label="Выполнено"
              >✓</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.calendar {
  max-width: 640px;
  margin: 0 auto;
}

.calendar__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.calendar__nav-btn {
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0.25rem 0.75rem;
  cursor: pointer;
}

.calendar__nav-btn:hover {
  background: #f3f4f6;
}

.calendar__title {
  margin: 0;
  font-size: 1.1rem;
}

.calendar__state {
  color: #555;
  padding: 0.75rem 0;
}

.calendar__state--error {
  color: #c0392b;
}

.calendar__day {
  margin-top: 1.25rem;
}

.calendar__day-title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.calendar__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.calendar__item {
  margin-bottom: 0.5rem;
}

.calendar__link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  text-decoration: none;
  color: inherit;
}

.calendar__link:hover {
  background: #f3f4f6;
}

.calendar__time {
  font-variant-numeric: tabular-nums;
  color: #2563eb;
  font-weight: 600;
}

.calendar__item-title {
  flex: 1;
}

.calendar__badge {
  color: #166534;
}
</style>
