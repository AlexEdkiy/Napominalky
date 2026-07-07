<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import type { Reminder } from '@/types/reminder'
import { getCalendarDays, sameDay } from '@/utils/calendar'
import type { CalendarDay } from '@/utils/calendar'

interface Props {
  year: number
  month: number
  byDay: Map<string, Reminder[]>
}

const props = defineProps<Props>()

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const
const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const

const today = new Date()

const days = computed<CalendarDay[]>(() => getCalendarDays(props.year, props.month))
const monthLabel = computed<string>(() => `${monthNames[props.month]} ${props.year}`)

function hasReminders(day: CalendarDay): boolean {
  return (props.byDay.get(day.key)?.length ?? 0) > 0
}

function isToday(day: CalendarDay): boolean {
  return sameDay(day.date, today)
}
</script>

<template>
  <RouterLink :to="{ name: 'lk-calendar' }" class="lk-mini-calendar">
    <header class="lk-mini-calendar__header">
      <h3 class="lk-mini-calendar__title">Календарь</h3>
      <span class="lk-mini-calendar__month">{{ monthLabel }}</span>
    </header>

    <div class="lk-mini-calendar__weekdays">
      <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
    </div>

    <div class="lk-mini-calendar__days">
      <span
        v-for="day in days"
        :key="day.key"
        class="lk-mini-calendar__day"
        :class="{
          'lk-mini-calendar__day--muted': !day.inCurrentMonth,
          'lk-mini-calendar__day--today': isToday(day),
        }"
      >
        {{ day.dayOfMonth }}
        <span v-if="hasReminders(day)" class="lk-mini-calendar__dot" aria-hidden="true" />
      </span>
    </div>
  </RouterLink>
</template>

<style scoped>
.lk-mini-calendar {
  display: block;
  text-decoration: none;
  color: inherit;
}

.lk-mini-calendar__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.lk-mini-calendar__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1f2622;
}

.lk-mini-calendar__month {
  font-size: 0.75rem;
  color: #8a938f;
}

.lk-mini-calendar__weekdays,
.lk-mini-calendar__days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.lk-mini-calendar__weekdays span {
  text-align: center;
  font-size: 0.65rem;
  color: #9aa39f;
  padding-bottom: 0.25rem;
}

.lk-mini-calendar__day {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  font-size: 0.72rem;
  color: #1f2622;
  border-radius: 8px;
}

.lk-mini-calendar__day--muted {
  color: #c7d0cc;
}

.lk-mini-calendar__day--today {
  background: #d8ebe4;
  color: #17897a;
  font-weight: 700;
}

.lk-mini-calendar__dot {
  position: absolute;
  bottom: 2px;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: #d99a3e;
}
</style>
