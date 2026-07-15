<script setup lang="ts">
import { computed } from 'vue'

import LkTagPill from '@/components/lk/LkTagPill.vue'
import { lkTableDateLabel, lkTableTimeLabel } from '@/composables/useLkTasksTable'
import type { LkListDerivedDates } from '@/composables/useLkTasksTable'
import type { ShoppingList } from '@/types/shoppingList'

interface Props {
  list: ShoppingList
  /**
   * Производные даты пунктов (ДАТА/НАПОМИНАНИЕ). `null`, пока фоновая
   * подгрузка пунктов не завершилась — колонки показывают «—».
   */
  derived: LkListDerivedDates | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggleCompleted: [list: ShoppingList]
  open: [list: ShoppingList]
}>()

/** Русское склонение «пункт/пункта/пунктов». */
function pluralizeItems(count: number): string {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) {
    return 'пунктов'
  }
  if (mod10 === 1) {
    return 'пункт'
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return 'пункта'
  }
  return 'пунктов'
}

/** Слово для отмеченных пунктов по типу списка: покупки — «куплено», задачи — «сделано» (как в МП). */
const checkedWord = computed<string>(() => (props.list.type === 'goods' ? 'куплено' : 'сделано'))

const subtitle = computed<string>(
  () =>
    `${props.list.items_count} ${pluralizeItems(props.list.items_count)} · ` +
    `${props.list.checked_items_count} ${checkedWord.value}`,
)

const dateLabel = computed<string>(() => lkTableDateLabel(props.derived?.deadline ?? null, new Date()))
const timeLabel = computed<string>(() => lkTableTimeLabel(props.derived?.reminderAt ?? null))

function handleRowClick(): void {
  emit('open', props.list)
}

function handleToggle(): void {
  emit('toggleCompleted', props.list)
}
</script>

<template>
  <tr
    class="lk-task-row"
    :class="{ 'lk-task-row--completed': list.is_completed }"
    @click="handleRowClick"
  >
    <td class="lk-task-row__cell lk-task-row__cell--task">
      <span class="lk-task-row__task">
        <input
          type="checkbox"
          class="lk-task-row__checkbox"
          :checked="list.is_completed"
          :aria-label="`Отметить выполненной: ${list.title}`"
          @click.stop
          @change="handleToggle"
        />
        <span class="lk-task-row__text">
          <span class="lk-task-row__title">{{ list.title }}</span>
          <span class="lk-task-row__subtitle">{{ subtitle }}</span>
        </span>
      </span>
    </td>

    <td class="lk-task-row__cell lk-task-row__cell--tags">
      <span v-if="list.tags.length > 0" class="lk-task-row__tags">
        <LkTagPill v-for="tag in list.tags" :key="tag" :tag="tag" />
      </span>
      <span v-else class="lk-task-row__empty">—</span>
    </td>

    <td class="lk-task-row__cell">
      <span
        v-if="dateLabel !== ''"
        class="lk-task-row__date"
        :class="{ 'lk-task-row__date--today': dateLabel === 'Сегодня' }"
      >
        {{ dateLabel }}
      </span>
      <span v-else class="lk-task-row__empty">—</span>
    </td>

    <td class="lk-task-row__cell">
      <span v-if="timeLabel !== ''" class="lk-task-row__reminder">⏰ {{ timeLabel }}</span>
      <span v-else class="lk-task-row__empty">—</span>
    </td>
  </tr>
</template>

<style scoped>
.lk-task-row {
  cursor: pointer;
  border-top: 1px solid #eef1f0;
}

.lk-task-row:hover {
  background: #fafbfa;
}

.lk-task-row__cell {
  padding: 13px 16px;
  vertical-align: middle;
}

.lk-task-row__task {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lk-task-row__checkbox {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  accent-color: #17897a;
  cursor: pointer;
}

.lk-task-row__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.lk-task-row__title {
  font-weight: 700;
  color: #1f2622;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lk-task-row--completed .lk-task-row__title {
  text-decoration: line-through;
  color: #9aa39f;
}

.lk-task-row--completed .lk-task-row__subtitle,
.lk-task-row--completed .lk-task-row__date,
.lk-task-row--completed .lk-task-row__reminder {
  color: #b3bab6;
}

.lk-task-row__subtitle {
  font-size: 12px;
  color: #8a938f;
  white-space: nowrap;
}

.lk-task-row__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.lk-task-row__date {
  font-size: 13.5px;
  font-weight: 600;
  color: #5a625e;
  white-space: nowrap;
}

.lk-task-row__date--today {
  color: #17897a;
}

.lk-task-row__reminder {
  font-size: 13.5px;
  font-weight: 600;
  color: #c98a2b;
  white-space: nowrap;
}

.lk-task-row__empty {
  color: #b3bab6;
}
</style>
