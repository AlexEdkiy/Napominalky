<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useLkBreakpoint } from '@/composables/useLkBreakpoint'
import { useLkVisibleCount } from '@/composables/useLkVisibleCount'
import type { ShoppingList } from '@/types/shoppingList'
import { shoppingListAccent } from '@/utils/shoppingList'

/** Высота строки в px — синхронизирована с CSS `.lk-overview-tasks__item` (height: 48px). */
const ROW_HEIGHT = 48
/** Запас снизу: нижний паддинг карточки + отступ до края экрана. */
const RESERVED_BOTTOM = 40
/** Разумные границы адаптивного числа строк. */
const MIN_VISIBLE = 3
const MAX_VISIBLE = 8
/** Фолбэк мобильной раскладки: страница скроллится, высота экрана — не показатель. */
const MOBILE_VISIBLE = 4

interface Props {
  /** Активные списки задач/покупок — тот же источник, что раздел «Задачи и списки». */
  lists: ShoppingList[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [list: ShoppingList]
}>()

const { isDesktop } = useLkBreakpoint()
const listContainer = ref<HTMLElement | null>(null)
const { visibleCount } = useLkVisibleCount(listContainer, {
  rowHeight: ROW_HEIGHT,
  reservedBottom: RESERVED_BOTTOM,
  minCount: MIN_VISIBLE,
  maxCount: MAX_VISIBLE,
})

const effectiveCount = computed<number>(() =>
  isDesktop.value ? visibleCount.value : MOBILE_VISIBLE,
)
const visibleLists = computed<ShoppingList[]>(() => props.lists.slice(0, effectiveCount.value))
/** «Все задачи» показывается ТОЛЬКО когда есть скрытые (не поместившиеся) элементы. */
const hasHidden = computed<boolean>(() => props.lists.length > effectiveCount.value)

function handleOpen(list: ShoppingList): void {
  emit('open', list)
}
</script>

<template>
  <section class="lk-overview-tasks" aria-labelledby="lk-overview-tasks-heading">
    <header class="lk-overview-tasks__header">
      <h2 id="lk-overview-tasks-heading" class="lk-overview-tasks__title">Задачи</h2>
      <RouterLink v-if="hasHidden" :to="{ name: 'lk-tasks' }" class="lk-overview-tasks__link">
        Все задачи →
      </RouterLink>
    </header>

    <div ref="listContainer" class="lk-overview-tasks__container">
      <p v-if="lists.length === 0" class="lk-overview-tasks__empty">Пока нет задач.</p>
      <ul v-else class="lk-overview-tasks__list">
        <li v-for="list in visibleLists" :key="list.uuid" class="lk-overview-tasks__item">
          <div
            class="lk-overview-tasks__body"
            role="button"
            tabindex="0"
            :aria-label="`Открыть: ${list.title}`"
            @click="handleOpen(list)"
            @keydown.enter="handleOpen(list)"
            @keydown.space.prevent="handleOpen(list)"
          >
            <span
              class="lk-overview-tasks__dot"
              :style="{ background: shoppingListAccent(list.type).color }"
              aria-hidden="true"
            />
            <span class="lk-overview-tasks__item-title">{{ list.title }}</span>
            <span class="lk-overview-tasks__count">
              {{ list.checked_items_count }} / {{ list.items_count }}
            </span>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.lk-overview-tasks {
  background: #fff;
  border-radius: 18px;
  padding: 1.1rem 1.25rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.lk-overview-tasks__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.lk-overview-tasks__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f2622;
}

.lk-overview-tasks__link {
  font-size: 0.85rem;
  color: #17897a;
  text-decoration: none;
  white-space: nowrap;
}

.lk-overview-tasks__link:hover {
  text-decoration: underline;
}

.lk-overview-tasks__empty {
  color: #8a938f;
  padding: 0.5rem 0;
  margin: 0;
}

.lk-overview-tasks__list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* Высота строки фиксирована (48px, box-sizing) — по ней считается видимое число. */
.lk-overview-tasks__item {
  box-sizing: border-box;
  height: 48px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #eef1f0;
}

.lk-overview-tasks__item:last-child {
  border-bottom: none;
}

.lk-overview-tasks__body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 10px;
  padding: 0.35rem 0.4rem;
  margin: 0 -0.4rem;
  cursor: pointer;
}

.lk-overview-tasks__body:hover {
  background: #f7f9f8;
}

.lk-overview-tasks__body:focus-visible {
  outline: 2px solid #17897a;
  outline-offset: 2px;
}

.lk-overview-tasks__dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.lk-overview-tasks__item-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2622;
}

.lk-overview-tasks__count {
  flex-shrink: 0;
  font-size: 0.8rem;
  color: #8a938f;
}
</style>
