<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  value: number
  max: number
}

const props = defineProps<Props>()

const percent = computed<number>(() => {
  if (props.max <= 0) {
    return 0
  }
  return Math.round((props.value / props.max) * 100)
})

const label = computed<string>(() => `${props.value} / ${props.max}`)
</script>

<template>
  <div class="progress">
    <div
      class="progress__track"
      role="progressbar"
      :aria-valuenow="value"
      :aria-valuemin="0"
      :aria-valuemax="max"
      :aria-label="`Куплено ${label}`"
    >
      <div class="progress__fill" :style="{ width: `${percent}%` }"></div>
    </div>
    <span class="progress__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress__track {
  flex: 1;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.progress__fill {
  height: 100%;
  background: #2ecc71;
  transition: width 0.2s ease;
}

.progress__label {
  font-size: 0.85rem;
  color: #555;
  white-space: nowrap;
}
</style>
