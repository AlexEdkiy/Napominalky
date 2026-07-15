<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import LkCalendarDayPanel from '@/components/lk/calendar/LkCalendarDayPanel.vue'
import LkCalendarGrid from '@/components/lk/calendar/LkCalendarGrid.vue'
import LkCalendarLegend from '@/components/lk/calendar/LkCalendarLegend.vue'
import { useLkBreakpoint, useLkWideDesktop } from '@/composables/useLkBreakpoint'
import { useLkCalendar } from '@/composables/useLkCalendar'
import type { LkCalendarEvent } from '@/types/lkCalendar'

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const

const { isDesktop } = useLkBreakpoint()
// Day-панель — right-rail только на «широком» десктопе (≥1280px), иначе —
// секция под сеткой (1024–1279px и мобайл). JS-управляемое переключение (как
// у right-rail «Задач и списков» в фазе 2) вместо голого CSS media-query —
// тестируемо и единообразно с остальной оболочкой ЛК.
const { isWideDesktop } = useLkWideDesktop()
const {
  currentYear,
  currentMonth,
  selectedDate,
  selectedDayEvents,
  isLoading,
  error,
  byDay,
  load,
  prevMonth,
  nextMonth,
  goToday,
  selectDay,
} = useLkCalendar()

const router = useRouter()

const monthLabel = computed<string>(() => `${monthNames[currentMonth.value]} ${currentYear.value}`)

/** Двойной клик по чипу в сетке — открыть объект (redirect-view покажет модалку). */
async function openEvent(event: LkCalendarEvent): Promise<void> {
  try {
    await router.push(event.route)
  } catch {
    // Навигация не удалась (guard/дубликат) — календарь остаётся открытым, не рушим страницу.
  }
}

onMounted(load)
</script>

<template>
  <section class="calendar-view">
    <header class="calendar-view__header">
      <div class="calendar-view__nav">
        <button type="button" class="calendar-view__nav-btn" aria-label="Предыдущий месяц" @click="prevMonth">
          ‹
        </button>
        <h2 class="calendar-view__month">{{ monthLabel }}</h2>
        <button type="button" class="calendar-view__nav-btn" aria-label="Следующий месяц" @click="nextMonth">
          ›
        </button>
        <button type="button" class="calendar-view__today-btn" @click="goToday">Сегодня</button>
      </div>

      <LkCalendarLegend :compact="!isDesktop" />
    </header>

    <p v-if="isLoading" class="calendar-view__state" aria-live="polite">Загрузка…</p>
    <div v-else-if="error" class="calendar-view__state calendar-view__state--error" role="alert">
      <span>{{ error }}</span>
      <button type="button" class="calendar-view__retry-btn" @click="load">Повторить</button>
    </div>

    <div v-else class="calendar-view__layout" :class="{ 'calendar-view__layout--rail': isWideDesktop }">
      <div class="calendar-view__main">
        <LkCalendarGrid
          :year="currentYear"
          :month="currentMonth"
          :by-day="byDay"
          :selected-date="selectedDate"
          :compact="!isDesktop"
          @select-day="selectDay"
          @open-event="openEvent"
        />
      </div>

      <div class="calendar-view__day" :class="{ 'calendar-view__day--rail': isWideDesktop }">
        <LkCalendarDayPanel :date="selectedDate" :events="selectedDayEvents" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.calendar-view {
  max-width: 1240px;
  margin: 0 auto;
}

.calendar-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.1rem;
}

.calendar-view__nav {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.calendar-view__nav-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  color: #1f2622;
}

.calendar-view__nav-btn:hover {
  background: #eef1f0;
}

.calendar-view__month {
  margin: 0;
  min-width: 9rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2622;
  text-align: center;
}

.calendar-view__today-btn {
  padding: 0.4rem 0.85rem;
  border: none;
  border-radius: 10px;
  background: #d8ebe4;
  color: #17897a;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.calendar-view__today-btn:hover {
  background: #c6ded6;
}

.calendar-view__state {
  padding: 2rem 0;
  color: #6b716e;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.calendar-view__state--error {
  color: #cf5b4a;
}

.calendar-view__retry-btn {
  padding: 0.4rem 0.9rem;
  border: none;
  border-radius: 10px;
  background: #cf5b4a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.calendar-view__layout {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.25rem;
}

.calendar-view__main {
  min-width: 0;
}

.calendar-view__day {
  width: 100%;
}

.calendar-view__layout--rail {
  flex-direction: row;
  align-items: flex-start;
}

.calendar-view__layout--rail .calendar-view__main {
  flex: 1;
}

.calendar-view__day--rail {
  width: 320px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
}
</style>
