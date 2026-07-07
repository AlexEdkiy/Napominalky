<script setup lang="ts">
import { computed } from 'vue'

import { SHOPPING_CATEGORY_COLORS } from '@/constants/lkCategoryColors'
import type { ShoppingCategory } from '@/types/shoppingList'

interface Props {
  category: ShoppingCategory
  label: string
}

const props = defineProps<Props>()

const colors = computed(() => SHOPPING_CATEGORY_COLORS[props.category])
</script>

<template>
  <span class="lk-category-pill" :style="{ background: colors.bg, color: colors.fg }">
    {{ label }}
  </span>
</template>

<style scoped>
.lk-category-pill {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
</style>
