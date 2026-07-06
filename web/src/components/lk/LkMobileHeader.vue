<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import LkIcon from '@/components/lk/LkIcon.vue'
import { useAuthStore } from '@/stores/authStore'
import { getUserInitial } from '@/utils/user'

interface Props {
  title: string
  subtitle: string
}

defineProps<Props>()

const auth = useAuthStore()
const isSearchOpen = ref(false)
const userInitial = computed(() => getUserInitial(auth.user))

function toggleSearch(): void {
  isSearchOpen.value = !isSearchOpen.value
}
</script>

<template>
  <header class="lk-mobile-header">
    <div class="lk-mobile-header__row">
      <div class="lk-mobile-header__titles">
        <h1 class="lk-mobile-header__title">{{ title }}</h1>
        <p v-if="subtitle" class="lk-mobile-header__subtitle">{{ subtitle }}</p>
      </div>

      <button
        type="button"
        class="lk-mobile-header__icon-btn"
        aria-label="Поиск"
        @click="toggleSearch"
      >
        <LkIcon name="search" :size="18" />
      </button>

      <RouterLink :to="{ name: 'lk-account' }" class="lk-mobile-header__avatar">
        {{ userInitial }}
      </RouterLink>
    </div>

    <div v-if="isSearchOpen" class="lk-mobile-header__search">
      <LkIcon name="search" :size="16" />
      <input type="search" placeholder="Поиск по всему" aria-label="Поиск по всему" />
    </div>
  </header>
</template>

<style scoped>
.lk-mobile-header {
  padding: 1rem 1rem 0.85rem;
  background: linear-gradient(135deg, #0f6155 0%, #0b3f37 100%);
  color: #fff;
}

.lk-mobile-header__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.lk-mobile-header__titles {
  flex: 1;
  min-width: 0;
}

.lk-mobile-header__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.lk-mobile-header__subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lk-mobile-header__icon-btn {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lk-mobile-header__avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  text-decoration: none;
}

.lk-mobile-header__search {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
}

.lk-mobile-header__search input {
  border: none;
  background: none;
  outline: none;
  width: 100%;
  color: #fff;
  font-size: 0.85rem;
}

.lk-mobile-header__search input::placeholder {
  color: rgba(255, 255, 255, 0.65);
}
</style>
