<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import LkBottomNav from '@/components/lk/LkBottomNav.vue'
import LkMobileHeader from '@/components/lk/LkMobileHeader.vue'
import LkSidebar from '@/components/lk/LkSidebar.vue'
import LkTopbar from '@/components/lk/LkTopbar.vue'
import { provideLkBreadcrumbTail } from '@/composables/useLkBreadcrumbTail'
import { useLkBreakpoint } from '@/composables/useLkBreakpoint'
import { useLkNavCounts } from '@/composables/useLkNavCounts'
import { LK_DEFAULT_SECTION_META, LK_SECTION_META } from '@/constants/lkNav'
import { useAuthStore } from '@/stores/authStore'
import { getUserDisplayName } from '@/utils/user'

const route = useRoute()
const auth = useAuthStore()
const { isDesktop } = useLkBreakpoint()
const { activeTasksCount, notesCount, load: loadNavCounts } = useLkNavCounts()

const isSidebarCollapsed = ref(false)
const isCreateMenuOpen = ref(false)

// Общий реактивный «хвост» хлебных крошек (название списка/заметки/напоминания),
// который пишут дочерние страницы через `useSetLkBreadcrumbTail` и читает
// `LkBreadcrumbs` в topbar/mobile-шапке. См. `useLkBreadcrumbTail.ts`.
provideLkBreadcrumbTail()

const sectionMeta = computed(() => {
  const name = typeof route.name === 'string' ? route.name : ''
  return LK_SECTION_META[name] ?? LK_DEFAULT_SECTION_META
})

const sectionSubtitle = computed(() => {
  if (route.name !== 'lk-dashboard') {
    return sectionMeta.value.subtitle
  }
  const who = getUserDisplayName(auth.user)
  if (!who) {
    return sectionMeta.value.subtitle
  }
  // Макет: «Добрый день, {имя} — вот что запланировано» — продолжение
  // предложения после тире со строчной буквы.
  const lowerFirstSubtitle =
    sectionMeta.value.subtitle.charAt(0).toLowerCase() + sectionMeta.value.subtitle.slice(1)
  return `Добрый день, ${who} — ${lowerFirstSubtitle}`
})

function toggleSidebar(): void {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

function toggleCreateMenu(): void {
  isCreateMenuOpen.value = !isCreateMenuOpen.value
}

function closeCreateMenu(): void {
  isCreateMenuOpen.value = false
}

onMounted(async () => {
  if (auth.user === null) {
    try {
      await auth.fetchMe()
    } catch {
      // Профиль подгрузит конкретный раздел; навигация остаётся доступной.
    }
  }
  void loadNavCounts()
})
</script>

<template>
  <div class="lk-shell" :class="isDesktop ? 'lk-shell--desktop' : 'lk-shell--mobile'">
    <LkSidebar
      v-if="isDesktop"
      :collapsed="isSidebarCollapsed"
      :active-tasks-count="activeTasksCount"
      :notes-count="notesCount"
      @create="toggleCreateMenu"
    />

    <div class="lk-shell__main">
      <LkTopbar
        v-if="isDesktop"
        :title="sectionMeta.title"
        :subtitle="sectionSubtitle"
        @toggle-sidebar="toggleSidebar"
      />
      <LkMobileHeader v-else :title="sectionMeta.title" :subtitle="sectionSubtitle" />

      <main class="lk-shell__content">
        <RouterView />
      </main>

      <LkBottomNav v-if="!isDesktop" @create="toggleCreateMenu" />
    </div>

    <div v-if="isCreateMenuOpen" class="lk-shell__overlay" @click="closeCreateMenu">
      <div class="lk-shell__create-menu" @click.stop>
        <RouterLink :to="{ name: 'lk-note-create' }" class="lk-shell__create-item" @click="closeCreateMenu">
          Новая заметка
        </RouterLink>
        <RouterLink :to="{ name: 'lk-reminder-create' }" class="lk-shell__create-item" @click="closeCreateMenu">
          Новое напоминание
        </RouterLink>
        <RouterLink :to="{ name: 'lk-lists' }" class="lk-shell__create-item" @click="closeCreateMenu">
          Новый список покупок
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lk-shell {
  min-height: 100vh;
  background: #eef1f0;
  color: #1f2622;
}

.lk-shell--desktop {
  display: flex;
}

.lk-shell--mobile {
  display: flex;
  flex-direction: column;
}

.lk-shell__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.lk-shell--mobile .lk-shell__main {
  min-height: 0;
}

.lk-shell__content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.lk-shell--mobile .lk-shell__content {
  padding: 1rem;
}

.lk-shell__overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 20, 0.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 40;
}

.lk-shell--desktop .lk-shell__overlay {
  align-items: center;
}

.lk-shell__create-menu {
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 0.75rem;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.lk-shell--desktop .lk-shell__create-menu {
  border-radius: 16px;
}

.lk-shell__create-item {
  padding: 0.75rem 1rem;
  border-radius: 10px;
  text-decoration: none;
  color: #1f2622;
  font-weight: 500;
}

.lk-shell__create-item:hover {
  background: #eef1f0;
}
</style>
