<script setup lang="ts">
import LkIcon from '@/components/lk/LkIcon.vue'
import type { LkIconName } from '@/types/lkIcon'

interface Props {
  icon: LkIconName
  value: string
  label: string
  variant: 'teal' | 'amber' | 'blue' | 'gradient'
}

defineProps<Props>()
</script>

<template>
  <article class="lk-stat-card" :class="`lk-stat-card--${variant}`">
    <span class="lk-stat-card__icon">
      <LkIcon :name="icon" :size="20" />
    </span>
    <span class="lk-stat-card__value">{{ value }}</span>
    <span class="lk-stat-card__label">{{ label }}</span>
  </article>
</template>

<style scoped>
.lk-stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.1rem 1.25rem;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.lk-stat-card__icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lk-stat-card--teal .lk-stat-card__icon {
  background: #d8ebe4;
  color: #17897a;
}

.lk-stat-card--amber .lk-stat-card__icon {
  background: #f7ebd5;
  color: #c98a2b;
}

.lk-stat-card--blue .lk-stat-card__icon {
  background: #dde6f3;
  color: #4067a8;
}

.lk-stat-card--gradient {
  background: linear-gradient(135deg, #17897a 0%, #0b3f37 100%);
  color: #fff;
}

.lk-stat-card--gradient .lk-stat-card__icon {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.lk-stat-card__value {
  font-size: 1.6rem;
  font-weight: 900;
  color: #1f2622;
}

.lk-stat-card--gradient .lk-stat-card__value {
  color: #fff;
}

.lk-stat-card__label {
  font-size: 0.85rem;
  color: #6b716e;
}

.lk-stat-card--gradient .lk-stat-card__label {
  color: rgba(255, 255, 255, 0.85);
}
</style>
