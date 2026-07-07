<script setup lang="ts">
interface Props {
  /** Условная "высота" скелета — имитирует разную длину заметок в masonry. */
  variant?: 'short' | 'tall'
}

withDefaults(defineProps<Props>(), { variant: 'short' })
</script>

<template>
  <div class="lk-note-skeleton" :class="`lk-note-skeleton--${variant}`" aria-hidden="true">
    <div class="lk-note-skeleton__title" />
    <div class="lk-note-skeleton__line" />
    <div class="lk-note-skeleton__line" />
    <div v-if="variant === 'tall'" class="lk-note-skeleton__line" />
  </div>
</template>

<style scoped>
.lk-note-skeleton {
  break-inside: avoid;
  margin-bottom: 1rem;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  padding: 1rem 1.1rem;
}

.lk-note-skeleton__title,
.lk-note-skeleton__line {
  border-radius: 6px;
  background: linear-gradient(90deg, #eef1f0 25%, #e4e8e6 37%, #eef1f0 63%);
  background-size: 400% 100%;
  animation: lk-note-skeleton-shimmer 1.4s ease infinite;
}

.lk-note-skeleton__title {
  height: 1rem;
  width: 60%;
  margin-bottom: 0.85rem;
}

.lk-note-skeleton__line {
  height: 0.7rem;
  width: 100%;
  margin-bottom: 0.55rem;
}

.lk-note-skeleton--tall {
  padding-bottom: 1.75rem;
}

@keyframes lk-note-skeleton-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>
