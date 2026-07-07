<script setup lang="ts">
import { computed } from 'vue'

import LkCalendarEventRow from '@/components/lk/calendar/LkCalendarEventRow.vue'
import type { LkCalendarEvent } from '@/types/lkCalendar'

interface Props {
  date: Date
  events: LkCalendarEvent[]
}

const props = defineProps<Props>()

const dateLabel = computed<string>(() =>
  props.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
)
</script>

<template>
  <section class="lk-calendar-day-panel" aria-labelledby="lk-calendar-day-heading">
    <h3 id="lk-calendar-day-heading" class="lk-calendar-day-panel__title">{{ dateLabel }}</h3>

    <p v-if="events.length === 0" class="lk-calendar-day-panel__empty">
      На этот день ничего не запланировано.
    </p>
    <ul v-else class="lk-calendar-day-panel__list">
      <LkCalendarEventRow v-for="event in events" :key="event.id" :event="event" />
    </ul>
  </section>
</template>

<style scoped>
.lk-calendar-day-panel {
  background: #fff;
  border-radius: 18px;
  padding: 1.1rem 1.15rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.lk-calendar-day-panel__title {
  margin: 0 0 0.6rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1f2622;
  text-transform: capitalize;
}

.lk-calendar-day-panel__empty {
  margin: 0;
  padding: 0.4rem 0;
  color: #8a938f;
  font-size: 0.85rem;
}

.lk-calendar-day-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
</style>
