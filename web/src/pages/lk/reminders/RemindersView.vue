<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import LkConfirmDialog from '@/components/lk/LkConfirmDialog.vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import LkReminderCard from '@/components/lk/reminders/LkReminderCard.vue'
import { useLkForms } from '@/composables/useLkForms'
import { useReminders } from '@/composables/useReminders'
import { groupPlanned, overdueLabel, splitByOverdue } from '@/utils/reminderGrouping'
import type { Reminder, SnoozeOption } from '@/types/reminder'

/** Разумный верхний предел страницы (см. контракт API, `per_page` ≤ 100). */
const REMINDERS_PER_PAGE = 100

/**
 * Фильтр списка — как сегменты в МП: активные разбиты на «Просроченные»
 * (remind_at < now, красная подсветка) и «Запланированные» (секции
 * Сегодня/Завтра/На этой неделе/Позже); плюс «Выполненные» и «Все».
 */
type ReminderViewFilter = 'overdue' | 'planned' | 'completed' | 'all'

const { openReminderForm, remindersVersion } = useLkForms()
const { reminders, isLoading, error, load, complete, snooze, snoozeUntil, remove } = useReminders()

const status = ref<ReminderViewFilter>('planned')

/** Точка «сейчас» для разбивки/подписей; обновляется при каждой загрузке. */
const now = ref(new Date())

const pending = computed<Reminder[]>(() => reminders.value.filter((item) => !item.is_completed))
const overdueSplit = computed(() => splitByOverdue(pending.value, now.value))

const statusOptions = computed<{ value: ReminderViewFilter; label: string; count: number | null }[]>(
  () => [
    { value: 'overdue', label: 'Просроченные', count: overdueSplit.value.overdue.length },
    { value: 'planned', label: 'Запланированные', count: overdueSplit.value.planned.length },
    { value: 'completed', label: 'Выполненные', count: null },
    { value: 'all', label: 'Все', count: null },
  ],
)

/** Напоминания текущего фильтра (в порядке remind_at). */
const visibleReminders = computed<Reminder[]>(() => {
  if (status.value === 'overdue') return overdueSplit.value.overdue
  if (status.value === 'planned') return overdueSplit.value.planned
  if (status.value === 'completed') return reminders.value.filter((item) => item.is_completed)
  return reminders.value
})

/** Секции «Сегодня/Завтра/На этой неделе/Позже» — только для «Запланированные». */
const plannedSections = computed(() =>
  status.value === 'planned' ? groupPlanned(overdueSplit.value.planned, now.value) : [],
)

/** Подпись просрочки карточки: активное с remind_at < now (кроме «Запланированные»). */
function overdueTextFor(reminder: Reminder): string | null {
  if (reminder.is_completed) return null
  if (new Date(reminder.remind_at).getTime() >= now.value.getTime()) return null
  return overdueLabel(reminder.remind_at, now.value)
}

const EMPTY_TEXT: Record<ReminderViewFilter, string> = {
  overdue: 'Нет просроченных — всё под контролем.',
  planned: 'Ничего не запланировано.',
  completed: 'Выполненных напоминаний пока нет.',
  all: 'Напоминаний пока нет.',
}

// Множественный выбор для массового удаления (отдельно от «выполнить»).
const selectedUuids = ref<Set<string>>(new Set())
const isBulkDeleteOpen = ref(false)
const bulkError = ref<string | null>(null)

const selectedCount = computed<number>(() => selectedUuids.value.size)
const allSelected = computed<boolean>(
  () =>
    visibleReminders.value.length > 0 &&
    visibleReminders.value.every((item) => selectedUuids.value.has(item.uuid)),
)
const isIndeterminate = computed<boolean>(() => selectedCount.value > 0 && !allSelected.value)

async function refresh(): Promise<void> {
  // Грузим всё одной страницей: счётчики «Просроченные/Запланированные»
  // видны в любом фильтре, разбивка — на клиенте (как в МП).
  await load({ status: 'all', sort: 'remind_at', order: 'asc', per_page: REMINDERS_PER_PAGE })
  now.value = new Date()
  // После перезагрузки в выборе остаются только видимые напоминания.
  selectedUuids.value = new Set(
    [...selectedUuids.value].filter((uuid) => reminders.value.some((item) => item.uuid === uuid)),
  )
}

function changeStatus(next: ReminderViewFilter): void {
  status.value = next
  selectedUuids.value = new Set()
}

function toggleSelect(uuid: string): void {
  const next = new Set(selectedUuids.value)
  if (!next.delete(uuid)) {
    next.add(uuid)
  }
  selectedUuids.value = next
}

function toggleSelectAll(): void {
  selectedUuids.value = allSelected.value
    ? new Set()
    : new Set(visibleReminders.value.map((item) => item.uuid))
}

/**
 * Массовое удаление выбранных: параллельные DELETE, частичные ошибки не рушат
 * UI — неудалённые остаются в списке (и в выборе после прореживания в refresh).
 */
async function confirmBulkDelete(): Promise<void> {
  isBulkDeleteOpen.value = false
  bulkError.value = null
  const uuids = [...selectedUuids.value]
  const results = await Promise.all(uuids.map(async (uuid) => ({ uuid, ok: await remove(uuid) })))
  const failedCount = results.filter((result) => !result.ok).length
  await refresh()
  if (failedCount > 0) {
    bulkError.value = `Не удалось удалить напоминаний: ${failedCount}. Они остались в списке.`
  }
}

function handleCreate(): void {
  openReminderForm()
}

function handleOpen(uuid: string): void {
  const reminder = reminders.value.find((candidate) => candidate.uuid === uuid)
  openReminderForm(reminder)
}

async function handleComplete(uuid: string): Promise<void> {
  await complete(uuid)
}

async function handleSnooze(uuid: string, option: SnoozeOption): Promise<void> {
  await snooze(uuid, option)
}

/** «Своё время»: POST snoozed_until (ISO, строго в будущем). */
async function handleSnoozeUntil(uuid: string, snoozedUntilIso: string): Promise<void> {
  await snoozeUntil(uuid, snoozedUntilIso)
}

async function handleRemove(uuid: string): Promise<void> {
  if (!window.confirm('Удалить напоминание?')) {
    return
  }
  await remove(uuid)
}

// Модалка «Напоминание» рендерится в `LkLayout`, а не здесь — перезагружаем
// после успешного сохранения/удаления через неё (см. `notifyReminderSaved`).
watch(remindersVersion, () => void refresh())

onMounted(refresh)
</script>

<template>
  <section class="reminders-view">
    <div class="reminders-view__toolbar">
      <nav class="reminders-view__filters" aria-label="Фильтр по статусу">
        <button
          v-for="option in statusOptions"
          :key="option.value"
          type="button"
          class="reminders-view__filter"
          :class="{
            'reminders-view__filter--active': status === option.value,
            'reminders-view__filter--overdue':
              option.value === 'overdue' && status === option.value && option.count !== null && option.count > 0,
          }"
          @click="changeStatus(option.value)"
        >
          {{ option.label }}
          <span v-if="option.count !== null" class="reminders-view__filter-count">{{ option.count }}</span>
        </button>
      </nav>

      <button type="button" class="reminders-view__create-btn" @click="handleCreate">
        <LkIcon name="plus" :size="16" />
        Новое напоминание
      </button>
    </div>

    <p v-if="isLoading && reminders.length === 0" class="reminders-view__state" aria-live="polite">Загрузка…</p>
    <p v-else-if="error" class="reminders-view__state reminders-view__state--error" role="alert">{{ error }}</p>

    <template v-else-if="visibleReminders.length === 0">
      <p class="reminders-view__empty">
        {{ EMPTY_TEXT[status] }}
        <button type="button" class="reminders-view__empty-cta" @click="handleCreate">
          Создать напоминание
        </button>
      </p>
    </template>

    <template v-else>
      <div class="reminders-view__selection-bar">
        <label class="reminders-view__select-all">
          <input
            type="checkbox"
            class="reminders-view__select-all-input"
            :checked="allSelected"
            :indeterminate="isIndeterminate"
            aria-label="Выделить все напоминания"
            @change="toggleSelectAll"
          />
          Выделить все
        </label>
        <span class="reminders-view__selected-count" aria-live="polite">Выбрано: {{ selectedCount }}</span>
        <button
          type="button"
          class="reminders-view__bulk-delete"
          :disabled="selectedCount === 0"
          @click="isBulkDeleteOpen = true"
        >
          Удалить выделенные
        </button>
      </div>

      <p v-if="bulkError" class="reminders-view__state reminders-view__state--error" role="alert">
        {{ bulkError }}
      </p>

      <!-- «Запланированные» — секциями Сегодня/Завтра/На этой неделе/Позже (как в МП) -->
      <template v-if="status === 'planned'">
        <section v-for="section in plannedSections" :key="section.key" class="reminders-view__section">
          <h3 class="reminders-view__section-title">{{ section.title }}</h3>
          <div class="reminders-view__list">
            <LkReminderCard
              v-for="reminder in section.data"
              :key="reminder.uuid"
              :reminder="reminder"
              selectable
              :selected="selectedUuids.has(reminder.uuid)"
              @open="handleOpen"
              @complete="handleComplete"
              @snooze="handleSnooze"
              @snooze-until="handleSnoozeUntil"
              @remove="handleRemove"
              @toggle-select="toggleSelect"
            />
          </div>
        </section>
      </template>

      <div v-else class="reminders-view__list">
        <LkReminderCard
          v-for="reminder in visibleReminders"
          :key="reminder.uuid"
          :reminder="reminder"
          selectable
          :selected="selectedUuids.has(reminder.uuid)"
          :overdue-text="overdueTextFor(reminder)"
          @open="handleOpen"
          @complete="handleComplete"
          @snooze="handleSnooze"
          @snooze-until="handleSnoozeUntil"
          @remove="handleRemove"
          @toggle-select="toggleSelect"
        />
      </div>
    </template>

    <LkConfirmDialog
      v-if="isBulkDeleteOpen"
      :title="`Удалить выбранные напоминания (${selectedCount})?`"
      confirm-label="Да"
      cancel-label="Отмена"
      @confirm="confirmBulkDelete"
      @cancel="isBulkDeleteOpen = false"
    />
  </section>
</template>

<style scoped>
.reminders-view {
  max-width: 760px;
  margin: 0 auto;
}

.reminders-view__toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.reminders-view__filters {
  display: flex;
  gap: 0.4rem;
  background: #fff;
  border-radius: 12px;
  padding: 0.3rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.reminders-view__filter {
  padding: 0.4rem 0.85rem;
  border: none;
  border-radius: 9px;
  background: none;
  color: #6b716e;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.reminders-view__filter--active {
  background: #d8ebe4;
  color: #17897a;
}

/* Активный фильтр «Просроченные» с ненулевым счётчиком — danger-тон. */
.reminders-view__filter--overdue {
  background: #f6dfda;
  color: #cf5b4a;
}

.reminders-view__filter-count {
  display: inline-block;
  min-width: 1.35em;
  margin-left: 0.35rem;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.06);
  font-size: 0.75rem;
  text-align: center;
}

.reminders-view__create-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.9rem;
  border: none;
  border-radius: 10px;
  background: #e9a63c;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.reminders-view__create-btn:hover {
  background: #d99a3e;
}

.reminders-view__state {
  padding: 2rem 0;
  color: #6b716e;
}

.reminders-view__state--error {
  color: #cf5b4a;
}

.reminders-view__empty {
  padding: 2rem 0;
  color: #6b716e;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: flex-start;
}

.reminders-view__empty-cta {
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  border: none;
  background: #17897a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.reminders-view__selection-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  background: #fff;
  border-radius: 12px;
  padding: 0.55rem 0.9rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.reminders-view__select-all {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: #1f2622;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.reminders-view__select-all-input {
  width: 16px;
  height: 16px;
  accent-color: #17897a;
  cursor: pointer;
}

.reminders-view__selected-count {
  color: #6b716e;
  font-size: 0.85rem;
}

.reminders-view__bulk-delete {
  margin-left: auto;
  padding: 0.45rem 0.9rem;
  border: none;
  border-radius: 10px;
  background: #cf5b4a;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.reminders-view__bulk-delete:hover:not(:disabled) {
  background: #bd4e3e;
}

.reminders-view__bulk-delete:disabled {
  background: #eef1f0;
  color: #8a938f;
  cursor: not-allowed;
}

.reminders-view__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reminders-view__section {
  margin-bottom: 1rem;
}

.reminders-view__section-title {
  margin: 0 0 0.5rem;
  color: #8a938f;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
