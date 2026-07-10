<script setup lang="ts">
import LkBreadcrumbs from '@/components/lk/LkBreadcrumbs.vue'
import LkIcon from '@/components/lk/LkIcon.vue'

interface Props {
  title: string
}

defineProps<Props>()

const emit = defineEmits<{
  toggleSidebar: []
}>()
</script>

<template>
  <header class="lk-topbar">
    <button
      type="button"
      class="lk-topbar__burger"
      aria-label="Свернуть/развернуть сайдбар"
      @click="emit('toggleSidebar')"
    >
      <LkIcon name="sidebar" :size="20" />
    </button>

    <div class="lk-topbar__titles">
      <LkBreadcrumbs class="lk-topbar__breadcrumbs" />
      <h1 class="lk-topbar__title">{{ title }}</h1>
    </div>

    <div class="lk-topbar__search">
      <LkIcon name="search" :size="18" />
      <input type="search" placeholder="Поиск по всему" aria-label="Поиск по всему" />
    </div>

    <button type="button" class="lk-topbar__bell" aria-label="Уведомления">
      <LkIcon name="bell" :size="20" />
      <span class="lk-topbar__bell-dot" aria-hidden="true" />
    </button>
  </header>
</template>

<style scoped>
.lk-topbar {
  display: flex;
  align-items: center;
  gap: 18px;
  height: 78px;
  flex: none;
  padding: 0 30px;
  background: #fff;
  border-bottom: 1px solid #e6e9e7;
}

.lk-topbar__burger {
  width: 44px;
  height: 44px;
  flex: none;
  border: none;
  background: #f2f4f3;
  border-radius: 12px;
  color: #5a625e;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lk-topbar__burger:hover {
  background: #e9edeb;
}

.lk-topbar__titles {
  flex: 1;
  min-width: 0;
}

.lk-topbar__breadcrumbs {
  margin-bottom: 3px;
}

.lk-topbar__title {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.01em;
  color: #1f2622;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lk-topbar__search {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 280px;
  flex: none;
  padding: 10px 15px;
  border-radius: 12px;
  background: #f2f4f3;
  color: #9aa39f;
}

.lk-topbar__search input {
  border: none;
  background: none;
  outline: none;
  width: 100%;
  font-size: 14px;
  color: #1f2622;
}

.lk-topbar__bell {
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

.lk-topbar__bell-dot {
  position: absolute;
  top: 9px;
  right: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e2685f;
  border: 2px solid #f2f4f3;
}
</style>
