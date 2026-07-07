<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useLkBreadcrumbTail } from '@/composables/useLkBreadcrumbTail'
import { buildLkBreadcrumbs } from '@/constants/lkBreadcrumbs'

interface Props {
  /**
   * Компактный режим мобильной шапки: на верхнем уровне раздела
   * («Личный кабинет / Раздел») крошки скрываются — там нечего сворачивать,
   * секцию видно и так по нижней навигации; на подстранице показываются.
   */
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), { compact: false })

const route = useRoute()
const tail = useLkBreadcrumbTail()

const items = computed(() => buildLkBreadcrumbs(route.name as string | undefined, tail.value))

const isVisible = computed<boolean>(() => {
  // Только «Личный кабинет» (Обзор) — возвращаться некуда, крошки не нужны.
  if (items.value.length <= 1) {
    return false
  }
  // Мобайл: верхний уровень раздела («Личный кабинет / Раздел») можно скрыть.
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
      <span v-else class="lk-breadcrumbs__item lk-breadcrumbs__item--current" aria-current="page">
        {{ item.label }}
      </span>
      <span v-if="index < items.length - 1" class="lk-breadcrumbs__sep" aria-hidden="true">›</span>
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

.lk-breadcrumbs__item--link {
  color: #6b716e;
}

.lk-breadcrumbs__item--link:hover {
  color: #17897a;
  text-decoration: underline;
}

.lk-breadcrumbs__item--current {
  color: #1f2622;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.lk-breadcrumbs__sep {
  color: #c7d0cc;
}
</style>
