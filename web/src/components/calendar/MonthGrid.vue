<script setup lang="ts">
import { computed } from 'vue'

import type { Reminder } from '@/types/reminder'
import { getCalendarDays, sameDay, ymd } from '@/utils/calendar'
import type { CalendarDay } from '@/utils/calendar'

interface Props {
  year: number
  month: number
  byDay: Map<string, Reminder[]>
  selectedDate: Date | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectDay: [date: Date]
}>()

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

const today = new Date()

const days = computed<CalendarDay[]>(() => getCalendarDays(props.year, props.month))

function reminderCount(day: CalendarDay): number {
  return props.byDay.get(day.key)?.length ?? 0
}

function isToday(day: CalendarDay): boolean {
  return sameDay(day.date, today)
}

function isSelected(day: CalendarDay): boolean {
  return props.selectedDate !== null && day.key === ymd(props.selectedDate)
}

function dayLabel(day: CalendarDay): string {
  const count = reminderCount(day)
  const suffix = count > 0 ? `, напоминаний: ${count}` : ''
  return `${day.key}${suffix}`
}
</script>

<template>
  <div class="month-grid" role="grid" aria-label="Календарь месяца">
    <div class="month-grid__head" role="row">
      <span v-for="label in weekdayLabels" :key="label" class="month-grid__weekday" role="columnheader">
        {{ label }}
      </span>
    </div>
    <div class="month-grid__body" role="rowgroup">
      <button
        v-for="day in days"
        :key="day.key"
        type="button"
        role="gridcell"
        class="month-grid__cell"
        :class="{
          'month-grid__cell--muted': !day.inCurrentMonth,
          'month-grid__cell--today': isToday(day),
          'month-grid__cell--selected': isSelected(day),
        }"
        :aria-label="dayLabel(day)"
        :aria-selected="isSelected(day)"
        @click="emit('selectDay', day.date)"
      >
        <span class="month-grid__day-number">{{ day.dayOfMonth }}</span>
        <span
          v-if="reminderCount(day) > 0"
          class="month-grid__dot"
          :aria-hidden="true"
        ></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.month-grid {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.month-grid__head,
.month-grid__body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.month-grid__weekday {
  text-align: center;
  padding: 0.5rem 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #555;
  background: #f8f8f8;
}

.month-grid__cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.25rem;
  min-height: 3.5rem;
  padding: 0.4rem 0;
  border: none;
  border-top: 1px solid #eee;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: #222;
}

.month-grid__cell:hover {
  background: #f3f4f6;
}

.month-grid__cell--muted {
  color: #b0b0b0;
}

.month-grid__cell--today .month-grid__day-number {
  font-weight: 700;
  color: #2563eb;
}

.month-grid__cell--selected {
  background: #dbeafe;
}

.month-grid__dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #2563eb;
}
</style>
