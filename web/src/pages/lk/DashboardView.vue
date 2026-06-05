<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/authStore'

interface SectionCard {
  routeName: string
  title: string
  description: string
  ready: boolean
}

const auth = useAuthStore()

const greeting = computed(() => {
  const who = auth.user?.name ?? auth.user?.email
  return who ? `Здравствуйте, ${who}!` : 'Добро пожаловать!'
})

const sections: SectionCard[] = [
  { routeName: 'lk-notes', title: 'Заметки', description: 'Создавайте и редактируйте заметки.', ready: true },
  { routeName: 'lk-lists', title: 'Списки покупок', description: 'Ведите списки покупок.', ready: true },
  { routeName: 'lk-reminders', title: 'Напоминания', description: 'Не забывайте о важном.', ready: true },
  { routeName: 'lk-calendar', title: 'Календарь', description: 'Скоро появится.', ready: false },
  { routeName: 'lk-sync', title: 'Синхронизация', description: 'Скоро появится.', ready: false },
  { routeName: 'lk-settings', title: 'Настройки', description: 'Скоро появится.', ready: false },
]

const readySections = computed(() => sections.filter((section) => section.ready))
const upcomingSections = computed(() => sections.filter((section) => !section.ready))
</script>

<template>
  <section class="dashboard">
    <h1>{{ greeting }}</h1>

    <ul class="cards">
      <li v-for="section in readySections" :key="section.routeName" class="card">
        <RouterLink :to="{ name: section.routeName }" class="card__link">
          <h2 class="card__title">{{ section.title }}</h2>
          <p class="card__desc">{{ section.description }}</p>
        </RouterLink>
      </li>

      <li
        v-for="section in upcomingSections"
        :key="section.routeName"
        class="card card--disabled"
        aria-disabled="true"
      >
        <h2 class="card__title">{{ section.title }}</h2>
        <p class="card__desc">{{ section.description }}</p>
        <span class="card__badge">в разработке</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.dashboard {
  max-width: 960px;
  margin: 0 auto;
}

.cards {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.card {
  position: relative;
  border: 1px solid #e2e2e2;
  border-radius: 8px;
  padding: 1rem;
}

.card--disabled {
  opacity: 0.6;
  background: #f7f7f7;
}

.card__link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.card__title {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.card__desc {
  margin: 0;
  color: #555;
  font-size: 0.9rem;
}

.card__badge {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
}
</style>
