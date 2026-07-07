<script setup lang="ts">
import { computed } from 'vue'

import { colorForTag } from '@/constants/lkTagColors'

interface Props {
  tag: string
}

const props = defineProps<Props>()

const colors = computed(() => colorForTag(props.tag))
</script>

<template>
  <span class="lk-tag-pill" :style="{ background: colors.bg, color: colors.fg }">{{ tag }}</span>
</template>

<style scoped>
.lk-tag-pill {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}
</style>
