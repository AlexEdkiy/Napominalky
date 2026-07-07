<script setup lang="ts">
import { computed } from 'vue'

import { LK_CALENDAR_EVENT_COLORS } from '@/constants/lkCalendarColors'
import type { LkCalendarEvent } from '@/types/lkCalendar'

interface Props {
  event: LkCalendarEvent
}

const props = defineProps<Props>()

const colors = computed(() => LK_CALENDAR_EVENT_COLORS[props.event.type])
const timeLabel = computed<string>(() => props.event.time ?? 'Весь день')
</script>

<template>
  <li class="lk-calendar-event-row">
    <RouterLink :to="event.route" class="lk-calendar-event-row__link">
      <span
        class="lk-calendar-event-row__type"
        :style="{ background: colors.background, color: colors.color }"
      >
        {{ colors.label }}
      </span>
      <span class="lk-calendar-event-row__time">{{ timeLabel }}</span>
      <span class="lk-calendar-event-row__title">{{ event.title }}</span>
    </RouterLink>
  </li>
</template>

<style scoped>
.lk-calendar-event-row {
  list-style: none;
}

.lk-calendar-event-row__link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.65rem;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
}

.lk-calendar-event-row__link:hover {
  background: #f7f9f8;
}

.lk-calendar-event-row__type {
  flex-shrink: 0;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  white-space: nowrap;
}

.lk-calendar-event-row__time {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  color: #6b716e;
  min-width: 4.2rem;
}

.lk-calendar-event-row__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2622;
}
</style>
