<script setup lang="ts">
import { LK_CALENDAR_EVENT_COLORS, LK_CALENDAR_EVENT_LEGEND_ORDER } from '@/constants/lkCalendarColors'

interface Props {
  compact?: boolean
}

withDefaults(defineProps<Props>(), { compact: false })
</script>

<template>
  <ul class="lk-calendar-legend" :class="{ 'lk-calendar-legend--compact': compact }" aria-label="Типы событий">
    <li v-for="type in LK_CALENDAR_EVENT_LEGEND_ORDER" :key="type" class="lk-calendar-legend__item">
      <span
        class="lk-calendar-legend__dot"
        :style="{ background: LK_CALENDAR_EVENT_COLORS[type].color }"
        aria-hidden="true"
      />
      {{ LK_CALENDAR_EVENT_COLORS[type].label }}
    </li>
  </ul>
</template>

<style scoped>
.lk-calendar-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.9rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.lk-calendar-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #6b716e;
  white-space: nowrap;
}

.lk-calendar-legend__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.lk-calendar-legend--compact {
  gap: 0.6rem;
}

.lk-calendar-legend--compact .lk-calendar-legend__item {
  font-size: 0.72rem;
}
</style>
