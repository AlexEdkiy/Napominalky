<script setup lang="ts">
import LkIcon from '@/components/lk/LkIcon.vue'
const props = withDefaults(defineProps<{ count?: number | null; compact?: boolean }>(), { count: null, compact: false })
const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <button
    type="button"
    class="lk-today-bell"
    :class="{ 'lk-today-bell--compact': compact }"
    :aria-label="count === null ? 'Открыть списки с дедлайном на сегодня' : `Списки с дедлайном на сегодня: ${count}`"
    title="Дедлайны на сегодня"
    @click="emit('open')"
  >
    <LkIcon name="bell" :size="20" />
    <span v-if="props.count !== null && props.count > 0" class="lk-today-bell__dot" aria-hidden="true" />
  </button>
</template>

<style scoped>
.lk-today-bell {
  position: relative;
  border: none;
  background: #f2f4f3;
  color: #5a625e;
  border-radius: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: none;
}
.lk-today-bell:hover { background: #e9edeb; }
.lk-today-bell:focus-visible { outline: 2px solid #17897a; outline-offset: 2px; }
.lk-today-bell--compact {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.lk-today-bell--compact:hover { background: rgba(255, 255, 255, 0.24); }
.lk-today-bell--compact:focus-visible { outline-color: #fff; }
.lk-today-bell__dot {
  position: absolute;
  top: 5px;
  right: 6px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #d92d35;
  border: 2px solid #fff;
}
</style>
