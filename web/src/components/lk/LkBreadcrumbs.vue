<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useLkBreadcrumbTail } from '@/composables/useLkBreadcrumbTail'
import { useLkForms } from '@/composables/useLkForms'
import { buildLkBreadcrumbs, lkFormBreadcrumbLabel } from '@/constants/lkBreadcrumbs'
import type { LkBreadcrumbItem } from '@/constants/lkBreadcrumbs'

interface Props {
  /**
   * Компактный режим мобильной шапки: на верхнем уровне раздела
   * («Главная / Раздел») крошки скрываются — там нечего сворачивать,
   * секцию видно и так по нижней навигации; на подстранице показываются.
   */
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), { compact: false })

const route = useRoute()
const tail = useLkBreadcrumbTail()
const forms = useLkForms()

/**
 * Крошка открытой формы-модалки (задача/заметка/напоминание): дописывается
 * поверх цепочки маршрута, пока модалка открыта. Режим (создание или
 * редактирование) определяется по наличию редактируемой сущности в состоянии
 * `useLkForms` — модалки получают её через `openTaskForm(list)` и т.п.
 */
const formSegment = computed<LkBreadcrumbItem | null>(() => {
  if (forms.isTaskFormOpen.value) {
    return { label: lkFormBreadcrumbLabel('task', forms.taskFormList.value !== null) }
  }
  if (forms.isNoteFormOpen.value) {
    return { label: lkFormBreadcrumbLabel('note', forms.noteFormNote.value !== null) }
  }
  if (forms.isReminderFormOpen.value) {
    return { label: lkFormBreadcrumbLabel('reminder', forms.reminderFormReminder.value !== null) }
  }
  return null
})

const items = computed<LkBreadcrumbItem[]>(() => {
  const base = buildLkBreadcrumbs(route.name as string | undefined, tail.value)
  return formSegment.value ? [...base, formSegment.value] : base
})

const isVisible = computed<boolean>(() => {
  // Только «Главная» (Обзор) — возвращаться некуда, крошки не нужны.
  if (items.value.length <= 1) {
    return false
  }
  // Мобайл: верхний уровень раздела («Главная / Раздел») можно скрыть.
  if (props.compact && items.value.length <= 2) {
    return false
  }
  return true
})
</script>

<template>
  <nav
    v-if="isVisible"
    class="lk-breadcrumbs"
    :class="{ 'lk-breadcrumbs--compact': compact }"
    aria-label="Хлебные крошки"
  >
    <template v-for="(item, index) in items" :key="`${item.label}-${index}`">
      <RouterLink
        v-if="index < items.length - 1 && item.routeName"
        :to="{ name: item.routeName }"
        class="lk-breadcrumbs__item lk-breadcrumbs__item--link"
      >
        {{ item.label }}
      </RouterLink>
      <!-- Промежуточный сегмент без маршрута (напр. название списка под крошкой формы). -->
      <span
        v-else-if="index < items.length - 1"
        class="lk-breadcrumbs__item lk-breadcrumbs__item--muted"
      >
        {{ item.label }}
      </span>
      <span v-else class="lk-breadcrumbs__item lk-breadcrumbs__item--current" aria-current="page">
        {{ item.label }}
      </span>
      <svg
        v-if="index < items.length - 1"
        class="lk-breadcrumbs__sep"
        viewBox="0 0 24 24"
        width="10"
        height="10"
        fill="none"
        stroke="#b3bab6"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="9 6 15 12 9 18" />
      </svg>
    </template>
  </nav>
</template>

<style scoped>
.lk-breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
  font-size: 0.78rem;
  line-height: 1.2;
}

.lk-breadcrumbs__item {
  text-decoration: none;
  white-space: nowrap;
}

.lk-breadcrumbs__item--link,
.lk-breadcrumbs__item--muted {
  color: #8a938f;
}

.lk-breadcrumbs__item--link:hover {
  color: #17897a;
  text-decoration: underline;
}

.lk-breadcrumbs__item--muted {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.lk-breadcrumbs__item--current {
  color: #17897a;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.lk-breadcrumbs__sep {
  flex-shrink: 0;
}
</style>
