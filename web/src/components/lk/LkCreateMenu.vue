<script setup lang="ts">
import LkIcon from '@/components/lk/LkIcon.vue'

const emit = defineEmits<{
  selectNote: []
  selectReminder: []
  selectList: []
}>()
</script>

<template>
  <div class="lk-create-menu" role="menu" aria-label="Создать">
    <button type="button" class="lk-create-menu__item" role="menuitem" @click="emit('selectNote')">
      <span class="lk-create-menu__icon lk-create-menu__icon--teal"><LkIcon name="note" :size="20" /></span>
      <span class="lk-create-menu__label">Заметка</span>
    </button>
    <button type="button" class="lk-create-menu__item" role="menuitem" @click="emit('selectReminder')">
      <span class="lk-create-menu__icon lk-create-menu__icon--amber"><LkIcon name="bell" :size="20" /></span>
      <span class="lk-create-menu__label">Напоминание</span>
    </button>
    <button type="button" class="lk-create-menu__item" role="menuitem" @click="emit('selectList')">
      <span class="lk-create-menu__icon lk-create-menu__icon--blue"><LkIcon name="list" :size="20" /></span>
      <span class="lk-create-menu__label">Список</span>
    </button>
  </div>
</template>

<style scoped>
.lk-create-menu {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.lk-create-menu__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.65rem;
  border: none;
  background: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  font-size: 0.92rem;
  font-weight: 600;
  color: #1f2622;
}

.lk-create-menu__item:hover {
  background: #eef1f0;
}

.lk-create-menu__icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lk-create-menu__icon--teal {
  background: #d8ebe4;
  color: #17897a;
}

.lk-create-menu__icon--amber {
  background: #f7ebd5;
  color: #c98a2b;
}

.lk-create-menu__icon--blue {
  background: #dde6f3;
  color: #4067a8;
}

.lk-create-menu__label {
  flex: 1;
}
</style>
