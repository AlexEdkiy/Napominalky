<script setup lang="ts">
import LkBreadcrumbs from '@/components/lk/LkBreadcrumbs.vue'
import LkIcon from '@/components/lk/LkIcon.vue'

interface Props {
  title: string
  subtitle: string
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
      <LkIcon name="menu" :size="20" />
    </button>

    <div class="lk-topbar__titles">
      <LkBreadcrumbs class="lk-topbar__breadcrumbs" />
      <h1 class="lk-topbar__title">{{ title }}</h1>
      <p v-if="subtitle" class="lk-topbar__subtitle">{{ subtitle }}</p>
    </div>

    <div class="lk-topbar__search">
      <LkIcon name="search" :size="16" />
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
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.lk-topbar__burger {
  border: none;
  background: none;
  color: #1f2622;
  display: flex;
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 8px;
}

.lk-topbar__burger:hover {
  background: #f3f4f2;
}

.lk-topbar__titles {
  flex: 1;
  min-width: 0;
}

.lk-topbar__breadcrumbs {
  margin-bottom: 0.2rem;
}

.lk-topbar__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2622;
}

.lk-topbar__subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.85rem;
  color: #8a938f;
}

.lk-topbar__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 280px;
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  background: #eef1f0;
  color: #6b716e;
}

.lk-topbar__search input {
  border: none;
  background: none;
  outline: none;
  width: 100%;
  font-size: 0.85rem;
  color: #1f2622;
}

.lk-topbar__bell {
  position: relative;
  border: none;
  background: #eef1f0;
  color: #1f2622;
  border-radius: 10px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.lk-topbar__bell-dot {
  position: absolute;
  top: 8px;
  right: 9px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #cf5b4a;
}
</style>
