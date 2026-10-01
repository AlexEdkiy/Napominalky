<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import LkTaskItemsPopover from '@/components/lk/tasks/LkTaskItemsPopover.vue'
import { useLkBreakpoint } from '@/composables/useLkBreakpoint'
import { isLkDateToday } from '@/composables/useLkTasksTable'
import type { LkListDerivedDates } from '@/composables/useLkTasksTable'
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
  /**
   * Производные даты пунктов (ближайший deadline на список) для быстрого
   * фильтра «Сделать сегодня» — правило «Сегодня» общее с таблицей задач
   * (см. `isLkDateToday`). Пока даты не подгружены, фильтр даёт пустой набор.
   */
  derivedDates?: Map<string, LkListDerivedDates>
}

const props = withDefaults(defineProps<Props>(), {
  derivedDates: () => new Map(),
})

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

/** Быстрый фильтр «Сделать сегодня»: только задачи с датой (дедлайном) на сегодня. */
const todayOnly = ref(false)

const filteredLists = computed<ShoppingList[]>(() => {
  if (!todayOnly.value) {
    return props.lists
  }
  const now = new Date()
  return props.lists.filter((list) =>
    isLkDateToday(props.derivedDates.get(list.uuid)?.deadline ?? null, now),
  )
})

const effectiveCount = computed<number>(() =>
  isDesktop.value ? visibleCount.value : MOBILE_VISIBLE,
)
const visibleLists = computed<ShoppingList[]>(() =>
  filteredLists.value.slice(0, effectiveCount.value),
)
/** «Все задачи» показывается ТОЛЬКО когда есть скрытые (не поместившиеся) элементы. */
const hasHidden = computed<boolean>(() => filteredLists.value.length > effectiveCount.value)

const emptyText = computed<string>(() =>
  todayOnly.value ? 'На сегодня задач нет.' : 'Пока нет задач.',
)

function handleOpen(list: ShoppingList): void {
  emit('open', list)
}
</script>

<template>
  <section class="lk-overview-tasks" aria-labelledby="lk-overview-tasks-heading">
    <header class="lk-overview-tasks__header">
      <div class="lk-overview-tasks__heading">
        <h2 id="lk-overview-tasks-heading" class="lk-overview-tasks__title">Задачи</h2>
        <button
          type="button"
          class="lk-overview-tasks__filter"
          :class="{ 'lk-overview-tasks__filter--active': todayOnly }"
          :aria-pressed="todayOnly"
          @click="todayOnly = !todayOnly"
        >
          Сделать сегодня
        </button>
      </div>
      <RouterLink v-if="hasHidden" :to="{ name: 'lk-tasks' }" class="lk-overview-tasks__link">
        Все задачи →
      </RouterLink>
    </header>

    <div ref="listContainer" class="lk-overview-tasks__container">
      <p v-if="filteredLists.length === 0" class="lk-overview-tasks__empty">{{ emptyText }}</p>
      <ul v-else class="lk-overview-tasks__list">
        <li v-for="list in visibleLists" :key="list.uuid" class="lk-overview-tasks__item">
          <div
            class="lk-overview-tasks__body"
            :role="list.type === 'goods' ? 'button' : undefined"
            :tabindex="list.type === 'goods' ? 0 : undefined"
            :aria-label="list.type === 'goods' ? `Открыть: ${list.title}` : undefined"
            @click="list.type === 'goods' && handleOpen(list)"
            @keydown.enter.self="list.type === 'goods' && handleOpen(list)"
            @keydown.space.self.prevent="list.type === 'goods' && handleOpen(list)"
          >
            <span
              class="lk-overview-tasks__dot"
              :style="{ background: shoppingListAccent(list.type).color }"
              aria-hidden="true"
            />
            <LkTaskItemsPopover
              v-if="list.type === 'tasks'"
              v-slot="{ describedBy }"
              class="lk-overview-tasks__preview"
              :items="props.derivedDates.get(list.uuid)?.items"
            >
              <button
                type="button"
                class="lk-overview-tasks__item-title"
                :aria-label="`Открыть: ${list.title}`"
                :aria-describedby="describedBy"
                @click="handleOpen(list)"
              >
                {{ list.title }}
              </button>
            </LkTaskItemsPopover>
            <span v-else class="lk-overview-tasks__item-title">{{ list.title }}</span>
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

.lk-overview-tasks__heading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.lk-overview-tasks__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f2622;
}

/* Чип-тумблер «Сделать сегодня» — в стиле фильтров раздела «Задачи и списки». */
.lk-overview-tasks__filter {
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 9px;
  background: #f1f4f2;
  color: #5a625e;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.lk-overview-tasks__filter:hover {
  background: #e8edeb;
}

.lk-overview-tasks__filter--active,
.lk-overview-tasks__filter--active:hover {
  background: #1f2622;
  color: #fff;
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

.lk-overview-tasks__item-title:focus-visible,
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

.lk-overview-tasks__preview {
  flex: 1;
  min-width: 0;
}

.lk-overview-tasks__item-title {
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
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
