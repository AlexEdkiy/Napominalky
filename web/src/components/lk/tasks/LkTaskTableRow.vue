<script setup lang="ts">
import { computed, ref } from 'vue'

import LkTaskInlineEditor from './LkTaskInlineEditor.vue'
import LkTaskItemsPopover from './LkTaskItemsPopover.vue'
import LkCommentsPopover from '@/components/lk/LkCommentsPopover.vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import LkStatusBadge from '@/components/lk/LkStatusBadge.vue'
import LkTagPill from '@/components/lk/LkTagPill.vue'
import { lkTableDateLabel, lkTableTimeLabel } from '@/composables/useLkTasksTable'
import type { LkListCommentPreview, LkListDerivedDates } from '@/composables/useLkTasksTable'
import { formatDateTime } from '@/utils/datetime'
import type { ShoppingList, TaskStatus, UpdateShoppingListPayload } from '@/types/shoppingList'

interface Props {
  list: ShoppingList
  busy: boolean
  saveFields: (list: ShoppingList, patch: UpdateShoppingListPayload) => Promise<void>
  /**
   * Общие даты задачи и превью пунктов; комментарии используются только для покупок.
   * Даты tasks приходят с сервером, превью пунктов подгружается в фоне.
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

/** Суммарный счётчик комментариев пунктов; 0 (индикатор скрыт), пока derived не загружен. */
const commentsCount = computed<number>(() => props.derived?.commentsCount ?? 0)
/** Комментарии для попапа — уже «плоские», с itemName для группировки по пунктам. */
const popoverComments = computed<LkListCommentPreview[]>(() => props.derived?.comments ?? [])

function handleRowClick(): void {
  if (props.list.type === 'goods') emit('open', props.list)
}

function handleToggle(): void {
  emit('toggleCompleted', props.list)
}

/** Выбор в меню бейджа СТАТУС (только tasks); клик по бейджу строку не открывает. */
const statusError = ref('')

async function handleStatusSelect(value: TaskStatus | 'auto'): Promise<void> {
  statusError.value = ''
  try {
    await savePatch(value === 'auto' ? { status_is_manual: false } : { status: value })
  } catch {
    statusError.value = 'Не удалось изменить статус. Повторите попытку.'
  }
}

function savePatch(patch: UpdateShoppingListPayload): Promise<void> {
  return props.saveFields(props.list, patch)
}
</script>

<template>
  <tr
    class="lk-task-row"
    :class="{ 'lk-task-row--completed': list.is_completed, 'lk-task-row--goods': list.type === 'goods' }"
    @click="handleRowClick"
  >
    <td class="lk-task-row__cell lk-task-row__cell--task">
      <span class="lk-task-row__task">
        <input
          type="checkbox"
          class="lk-task-row__checkbox"
          :checked="list.is_completed"
          :disabled="busy"
          :aria-label="`Отметить выполненной: ${list.title}`"
          @click.stop
          @change="handleToggle"
        />
        <span class="lk-task-row__text">
          <button
            v-if="list.type === 'tasks'"
            type="button"
            class="lk-task-row__title lk-task-row__open"
            :title="list.title"
            @click.stop="emit('open', list)"
          >
            {{ list.title }}
          </button>
          <span v-else class="lk-task-row__title">{{ list.title }}</span>
          <span class="lk-task-row__subtitle-line">
            <LkTaskItemsPopover v-if="list.type === 'tasks' && derived?.items" :items="derived.items">
              <button
                type="button"
                class="lk-task-row__subtitle lk-task-row__items"
                :aria-label="'Пункты задачи: ' + list.title"
                @click.stop
              >
                {{ subtitle }}
              </button>
            </LkTaskItemsPopover>
            <span v-else class="lk-task-row__subtitle">{{ subtitle }}</span>
            <!-- 💬 + суммарный счётчик тредов пунктов; hover — попап с
                 содержимым, сгруппированным по пунктам. @click.stop:
                 клик по индикатору не открывает модалку строки. -->
            <LkCommentsPopover v-if="list.type === 'goods' && commentsCount > 0" :comments="popoverComments">
              <button
                type="button"
                class="lk-task-row__comments"
                :aria-label="`Комментарии: ${commentsCount}`"
                @click.stop
              >
                <LkIcon name="comment" :size="13" />
                {{ commentsCount }}
              </button>
            </LkCommentsPopover>
          </span>
        </span>
      </span>
    </td>

    <!-- Статусы только у tasks; для goods — прочерк. @click.stop: клик по
         бейджу/меню не должен открывать модалку строки. -->
    <td class="lk-task-row__cell lk-task-row__cell--status" @click.stop>
      <span v-if="list.type === 'tasks'" class="lk-task-row__status">
        <LkStatusBadge :status="list.status" :interactive="!busy" with-auto @select="handleStatusSelect" />
        <span
          v-if="list.status_is_manual"
          class="lk-task-row__status-manual"
          role="img"
          title="Задано вручную"
          aria-label="Задано вручную"
        />
      </span>
      <span v-else class="lk-task-row__empty">—</span>
      <span v-if="statusError" role="alert" class="lk-task-row__error">{{ statusError }}</span>
    </td>

    <td class="lk-task-row__cell lk-task-row__cell--tags">
      <LkTaskInlineEditor
        v-if="list.type === 'tasks'"
        field="tags"
        :label="'Теги: ' + list.title"
        :value="list.tags"
        :busy="busy"
        :save="savePatch"
      >
        <span v-if="list.tags.length" class="lk-task-row__tags">
          <LkTagPill v-for="tag in list.tags" :key="tag" :tag="tag" />
        </span>
        <span v-else class="lk-task-row__empty">—</span>
      </LkTaskInlineEditor>
      <span v-else-if="list.tags.length > 0" class="lk-task-row__tags">
        <LkTagPill v-for="tag in list.tags" :key="tag" :tag="tag" />
      </span>
      <span v-else class="lk-task-row__empty">—</span>
    </td>

    <td class="lk-task-row__cell lk-task-row__cell--date">
      <LkTaskInlineEditor
        v-if="list.type === 'tasks'"
        field="deadline"
        :label="'Дедлайн: ' + list.title"
        :value="derived?.deadline ?? null"
        :busy="busy"
        :save="savePatch"
      >
        <span
          v-if="dateLabel"
          class="lk-task-row__date"
          :class="{ 'lk-task-row__date--today': dateLabel === 'Сегодня' }"
          >{{ dateLabel }}</span
        >
        <span v-else class="lk-task-row__empty">—</span>
      </LkTaskInlineEditor>
      <span
        v-else-if="dateLabel"
        class="lk-task-row__date"
        :class="{ 'lk-task-row__date--today': dateLabel === 'Сегодня' }"
        >{{ dateLabel }}</span
      >
      <span v-else class="lk-task-row__empty">—</span>
    </td>

    <td class="lk-task-row__cell lk-task-row__cell--reminder">
      <LkTaskInlineEditor
        v-if="list.type === 'tasks'"
        field="reminder_at"
        :label="'Напоминание: ' + list.title"
        :value="derived?.reminderAt ?? null"
        :busy="busy"
        :save="savePatch"
      >
        <span v-if="derived?.reminderAt" class="lk-task-row__reminder lk-task-row__reminder--full">
          ⏰ {{ formatDateTime(derived.reminderAt) }}
        </span>
        <span v-else class="lk-task-row__empty">—</span>
      </LkTaskInlineEditor>
      <span v-else-if="timeLabel" class="lk-task-row__reminder">⏰ {{ timeLabel }}</span>
      <span v-else class="lk-task-row__empty">—</span>
    </td>
  </tr>
</template>

<style scoped>
.lk-task-row {
  border-top: 1px solid #eef1f0;
}

.lk-task-row--goods {
  cursor: pointer;
}
.lk-task-row__open,
.lk-task-row__items {
  border: 0;
  padding: 0;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.lk-task-row__open:hover {
  text-decoration: underline;
}
.lk-task-row__open:focus-visible,
.lk-task-row__items:focus-visible {
  outline: 2px solid #17897a;
  outline-offset: 2px;
}
.lk-task-row__error {
  display: block;
  color: #b13b36;
  font-size: 12px;
}
.lk-task-row__reminder.lk-task-row__reminder--full {
  white-space: normal;
  overflow-wrap: anywhere;
}
.lk-task-row:hover {
  background: #fafbfa;
}

.lk-task-row__cell {
  padding: 13px 16px;
  vertical-align: middle;
}

/* Ширины колонок фиксированы (table-layout: fixed в TasksView): в узких
   колонках длинный контент усекается, не расширяя колонку и не сдвигая соседей. */
.lk-task-row__cell--tags {
  overflow: hidden;
}

.lk-task-row__cell--date,
.lk-task-row__cell--reminder {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.lk-task-row__subtitle-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.lk-task-row__subtitle {
  font-size: 12px;
  color: #8a938f;
  white-space: nowrap;
}

/* Индикатор 💬 + счётчик рядом с подписью; попап позиционируется от него. */
.lk-task-row__comments {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border: none;
  border-radius: 8px;
  background: #eef1f0;
  color: #5a625e;
  font-size: 11.5px;
  font-weight: 700;
  font-family: inherit;
  line-height: 1.4;
  cursor: default;
}

.lk-task-row__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Меню бейджа позиционируется от .lk-status-badge — ячейке нужен visible. */
.lk-task-row__cell--status {
  overflow: visible;
}

.lk-task-row__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Индикатор ручного закрепления статуса — маленькая точка рядом с бейджем. */
.lk-task-row__status-manual {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8a938f;
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

/* Метрики «—» совпадают с метриками значений (__date/__reminder, 13.5px):
   подмена плейсхолдера значением не меняет высоту строки. Значение «⏰ HH:MM»
   появляется целиком (иконка + время) внутри фиксированной колонки —
   резервировать место под ⏰ отдельно не нужно, соседей она не сдвигает. */
.lk-task-row__empty {
  font-size: 13.5px;
  font-weight: 600;
  color: #b3bab6;
  white-space: nowrap;
}
</style>
