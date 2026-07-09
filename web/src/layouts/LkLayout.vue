<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import LkBottomNav from '@/components/lk/LkBottomNav.vue'
import LkCreateListDialog from '@/components/lk/LkCreateListDialog.vue'
import LkCreateMenu from '@/components/lk/LkCreateMenu.vue'
import LkMobileHeader from '@/components/lk/LkMobileHeader.vue'
import LkSidebar from '@/components/lk/LkSidebar.vue'
import LkTopbar from '@/components/lk/LkTopbar.vue'
import { provideLkBreadcrumbTail } from '@/composables/useLkBreadcrumbTail'
import { useLkBreakpoint } from '@/composables/useLkBreakpoint'
import { useLkNavCounts } from '@/composables/useLkNavCounts'
import { useSyncMeter } from '@/composables/useSyncMeter'
import { LK_DEFAULT_SECTION_META, LK_SECTION_META } from '@/constants/lkNav'
import { useAuthStore } from '@/stores/authStore'
import type { ShoppingList } from '@/types/shoppingList'
import { getUserDisplayName } from '@/utils/user'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { isDesktop } = useLkBreakpoint()
const { activeTasksCount, notesCount, load: loadNavCounts } = useLkNavCounts()
const { runSync } = useSyncMeter()

const isSidebarCollapsed = ref(false)
const isCreateMenuOpen = ref(false)
const isListDialogOpen = ref(false)
const createButtonRect = ref<DOMRect | null>(null)

const MENU_WIDTH = 280
const MENU_MARGIN = 12

// Позиция поповера «Создать» на десктопе: привязан к фактическому положению
// кнопки в сайдбаре (`createButtonRect`, приходит от `LkSidebar` через
// событие `create`), а не к фиксированному месту в углу экрана — см. бриф
// «поповер, привязанный к кнопке «Создать»» (позиционирование корректное).
const createMenuAnchorStyle = computed(() => {
  const rect = createButtonRect.value
  if (!isDesktop.value || rect === null) {
    return undefined
  }
  const maxLeft = Math.max(MENU_MARGIN, window.innerWidth - MENU_WIDTH - MENU_MARGIN)
  const left = Math.min(rect.right + MENU_MARGIN, maxLeft)
  const top = Math.min(rect.top, Math.max(MENU_MARGIN, window.innerHeight - 260))
  return { position: 'fixed' as const, top: `${top}px`, left: `${left}px` }
})

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

function toggleCreateMenu(anchor?: DOMRect): void {
  isCreateMenuOpen.value = !isCreateMenuOpen.value
  createButtonRect.value = anchor ?? null
}

function closeCreateMenu(): void {
  isCreateMenuOpen.value = false
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isCreateMenuOpen.value) {
    closeCreateMenu()
  }
}

function handleSelectNote(): void {
  closeCreateMenu()
  void router.push({ name: 'lk-note-create' })
}

function handleSelectReminder(): void {
  closeCreateMenu()
  void router.push({ name: 'lk-reminder-create' })
}

function handleSelectList(): void {
  closeCreateMenu()
  isListDialogOpen.value = true
}

function closeListDialog(): void {
  isListDialogOpen.value = false
}

function handleListCreated(list: ShoppingList): void {
  isListDialogOpen.value = false
  void router.push({ name: 'lk-list-detail', params: { uuid: list.uuid } })
}

onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKeydown)
  if (auth.user === null) {
    try {
      await auth.fetchMe()
    } catch {
      // Профиль подгрузит конкретный раздел; навигация остаётся доступной.
    }
  }
  void loadNavCounts()
  void runSync()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
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

    <div
      v-if="isCreateMenuOpen"
      class="lk-shell__create-overlay"
      :class="{ 'lk-shell__create-overlay--desktop': isDesktop }"
      @click="closeCreateMenu"
    >
      <div class="lk-shell__create-menu" :style="createMenuAnchorStyle" @click.stop>
        <LkCreateMenu
          @select-note="handleSelectNote"
          @select-reminder="handleSelectReminder"
          @select-list="handleSelectList"
        />
      </div>
    </div>

    <LkCreateListDialog v-if="isListDialogOpen" @close="closeListDialog" @created="handleListCreated" />
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

.lk-shell__create-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 20, 0.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 40;
}

/*
 * Desktop: имитируем поповер у кнопки «Создать» в сайдбаре (без затемнения
 * фона; сам оверлей — прозрачный слой на весь экран только для перехвата
 * клика вне поповера). Фактическая позиция карточки — инлайн-стиль
 * `createMenuAnchorStyle`, вычисленный из `getBoundingClientRect()` кнопки
 * (см. `LkSidebar.vue`), поэтому поповер всегда рядом с кнопкой, а не в
 * фиксированном углу экрана. Ниже — фолбэк-позиция на случай, если якорь
 * почему-то недоступен; mobile сохраняет затемнённый нижний action-sheet.
 */
.lk-shell__create-overlay--desktop {
  background: transparent;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 0 0 5.5rem 1.25rem;
}

.lk-shell__create-menu {
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 0.5rem;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
}

.lk-shell__create-overlay--desktop .lk-shell__create-menu {
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  max-width: 280px;
}
</style>
