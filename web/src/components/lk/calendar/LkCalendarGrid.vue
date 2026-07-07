<script setup lang="ts">
import { computed } from 'vue'

import { LK_CALENDAR_EVENT_COLORS } from '@/constants/lkCalendarColors'
import type { LkCalendarEvent } from '@/types/lkCalendar'
import { getCalendarDays, sameDay, ymd } from '@/utils/calendar'
import type { CalendarDay } from '@/utils/calendar'

/** Сколько цветных чипов/точек событий показывать в ячейке до «+N». */
const MAX_VISIBLE_EVENTS = 3

interface Props {
  year: number
  month: number
  byDay: Map<string, LkCalendarEvent[]>
  selectedDate: Date
  /** Компактный режим (мобайл): чипы схлопываются в точки-индикаторы без заголовка. */
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), { compact: false })

const emit = defineEmits<{
  selectDay: [date: Date]
}>()

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

const today = new Date()

const days = computed<CalendarDay[]>(() => getCalendarDays(props.year, props.month))

function dayEvents(day: CalendarDay): LkCalendarEvent[] {
  return props.byDay.get(day.key) ?? []
}

function visibleEvents(day: CalendarDay): LkCalendarEvent[] {
  return dayEvents(day).slice(0, MAX_VISIBLE_EVENTS)
}

function overflowCount(day: CalendarDay): number {
  return Math.max(0, dayEvents(day).length - MAX_VISIBLE_EVENTS)
}

function isToday(day: CalendarDay): boolean {
  return sameDay(day.date, today)
}

function isSelected(day: CalendarDay): boolean {
  return day.key === ymd(props.selectedDate)
}

function dayLabel(day: CalendarDay): string {
  const count = dayEvents(day).length
  const suffix = count > 0 ? `, событий: ${count}` : ''
  return `${day.key}${suffix}`
}

/** Цвета чипа события: сплошной фон-точка в compact-режиме, иначе цветной чип с текстом. */
function eventStyle(event: LkCalendarEvent): { background: string; color: string } {
  const colors = LK_CALENDAR_EVENT_COLORS[event.type]
  return { background: props.compact ? colors.color : colors.background, color: colors.color }
}
</script>

<template>
  <div class="lk-calendar-grid" role="grid" aria-label="Календарь месяца">
    <div class="lk-calendar-grid__head" role="row">
      <span v-for="label in weekdayLabels" :key="label" class="lk-calendar-grid__weekday" role="columnheader">
        {{ label }}
      </span>
    </div>

    <div class="lk-calendar-grid__body" role="rowgroup">
      <button
        v-for="day in days"
        :key="day.key"
        type="button"
        role="gridcell"
        class="lk-calendar-grid__cell"
        :class="{
          'lk-calendar-grid__cell--muted': !day.inCurrentMonth,
          'lk-calendar-grid__cell--today': isToday(day),
          'lk-calendar-grid__cell--selected': isSelected(day),
        }"
        :aria-label="dayLabel(day)"
        :aria-selected="isSelected(day)"
        @click="emit('selectDay', day.date)"
      >
        <span class="lk-calendar-grid__day-number">{{ day.dayOfMonth }}</span>

        <span class="lk-calendar-grid__events">
          <span
            v-for="event in visibleEvents(day)"
            :key="event.id"
            class="lk-calendar-grid__event"
            :class="{ 'lk-calendar-grid__event--dot': compact }"
            :style="eventStyle(event)"
          >
            <span v-if="!compact" class="lk-calendar-grid__event-title">{{ event.title }}</span>
          </span>

          <span v-if="overflowCount(day) > 0" class="lk-calendar-grid__more">+{{ overflowCount(day) }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.lk-calendar-grid {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.lk-calendar-grid__head,
.lk-calendar-grid__body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.lk-calendar-grid__weekday {
  text-align: center;
  padding: 0.6rem 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #8a938f;
  background: #f7f9f8;
}

.lk-calendar-grid__cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
  min-height: 5.5rem;
  padding: 0.45rem 0.4rem;
  border: none;
  border-top: 1px solid #eef1f0;
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
  color: #1f2622;
  text-align: left;
}

.lk-calendar-grid__cell:hover {
  background: #f7f9f8;
}

.lk-calendar-grid__cell--muted {
  color: #c7d0cc;
}

.lk-calendar-grid__day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  font-weight: 600;
}

.lk-calendar-grid__cell--today .lk-calendar-grid__day-number {
  background: #17897a;
  color: #fff;
}

.lk-calendar-grid__cell--selected {
  background: #d8ebe4;
}

.lk-calendar-grid__cell--selected .lk-calendar-grid__day-number {
  box-shadow: inset 0 0 0 2px #17897a;
}

.lk-calendar-grid__events {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  width: 100%;
}

.lk-calendar-grid__event {
  display: block;
  border-radius: 6px;
  padding: 0.05rem 0.35rem;
  font-size: 0.68rem;
  font-weight: 600;
}

.lk-calendar-grid__event-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lk-calendar-grid__event--dot {
  width: 6px;
  height: 6px;
  padding: 0;
  border-radius: 999px;
}

.lk-calendar-grid__more {
  font-size: 0.65rem;
  color: #8a938f;
}

@media (max-width: 1023px) {
  .lk-calendar-grid__cell {
    min-height: 3.4rem;
    gap: 0.2rem;
  }

  .lk-calendar-grid__events {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
