<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import type { UpdateShoppingListPayload } from '@/types/shoppingList'
import { dateTimeLocalToIso, isoToDateTimeLocal } from '@/utils/datetime'
import { colorForTag } from '@/constants/lkTagColors'
import { LK_TASK_TAG_PRESETS } from '@/constants/lkTaskTags'

const props = defineProps<{
  field: 'tags' | 'deadline' | 'reminder_at'
  label: string
  value: string | string[] | null
  busy: boolean
  save: (patch: UpdateShoppingListPayload) => Promise<void>
}>()

const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLFormElement | null>(null)
const opened = ref(false)
const saving = ref(false)
const draft = ref('')
const tags = ref<string[]>([])
const error = ref('')
const position = ref({ top: '0px', left: '0px' })

function place(): void {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const height = panel.value?.offsetHeight ?? 210
  const width = Math.min(300, window.innerWidth - 24)
  position.value = {
    left: String(Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))) + 'px',
    top:
      String(Math.max(12, rect.bottom + height + 8 > window.innerHeight ? rect.top - height - 8 : rect.bottom + 8)) +
      'px',
  }
}

function close(): void {
  if (saving.value) return
  opened.value = false
  unbind()
  trigger.value?.focus()
}

function outside(event: MouseEvent): void {
  const target = event.target as Node
  if (!panel.value?.contains(target) && !trigger.value?.contains(target)) close()
}

function escape(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
  }
}

function unbind(): void {
  document.removeEventListener('mousedown', outside)
  document.removeEventListener('keydown', escape)
  window.removeEventListener('resize', place)
  window.removeEventListener('scroll', place, true)
}

async function open(): Promise<void> {
  if (props.busy) return
  opened.value = true
  error.value = ''
  tags.value = Array.isArray(props.value) && props.value.length > 0 ? [...props.value] : ['']
  const text = typeof props.value === 'string' ? props.value : null
  draft.value = props.field === 'reminder_at' ? isoToDateTimeLocal(text) : (text ?? '')
  await nextTick()
  place()
  panel.value?.querySelector('input')?.focus()
  document.addEventListener('mousedown', outside)
  document.addEventListener('keydown', escape)
  window.addEventListener('resize', place)
  window.addEventListener('scroll', place, true)
}

function hasTag(tag: string): boolean {
  return tags.value.some((value) => value.trim() === tag)
}

function toggleTag(tag: string): void {
  if (hasTag(tag)) {
    tags.value = tags.value.filter((value) => value.trim() !== tag)
    return
  }
  const emptyIndex = tags.value.findIndex((value) => value.trim() === '')
  if (emptyIndex === -1) tags.value.push(tag)
  else tags.value[emptyIndex] = tag
}

async function submit(clear = false): Promise<void> {
  if (saving.value || props.busy) return
  saving.value = true
  error.value = ''
  const patch: UpdateShoppingListPayload =
    props.field === 'tags'
      ? { tags: clear ? [] : [...new Set(tags.value.map((tag) => tag.trim()).filter(Boolean))] }
      : props.field === 'deadline'
        ? { deadline: clear || draft.value === '' ? null : draft.value }
        : { reminder_at: clear ? null : dateTimeLocalToIso(draft.value) }
  try {
    await props.save(patch)
    saving.value = false
    close()
  } catch {
    error.value = 'Не удалось сохранить. Проверьте данные и попробуйте ещё раз.'
  } finally {
    saving.value = false
  }
}

watch([() => tags.value.length, error], async () => {
  if (!opened.value) return
  await nextTick()
  place()
})

onUnmounted(unbind)
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="task-inline__trigger"
    :aria-label="label"
    aria-haspopup="dialog"
    :aria-expanded="opened"
    :disabled="busy"
    @click.stop="open"
  >
    <slot />
  </button>
  <Teleport to="body">
    <form
      v-if="opened"
      ref="panel"
      role="dialog"
      :aria-label="label"
      :style="position"
      class="task-inline__panel"
      @submit.prevent="submit()"
      @click.stop
    >
      <strong>{{ label }}</strong>
      <fieldset :disabled="saving || busy">
        <template v-if="field === 'tags'">
          <div class="task-inline__presets" role="group" aria-label="Готовые теги">
            <button
              v-for="tag in LK_TASK_TAG_PRESETS"
              :key="tag"
              type="button"
              class="task-inline__preset"
              :aria-pressed="hasTag(tag)"
              :style="{ backgroundColor: colorForTag(tag).bg, color: colorForTag(tag).fg }"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
          <div v-for="(_, index) in tags" :key="index" class="task-inline__tag">
            <input v-model="tags[index]" :aria-label="'Тег ' + (index + 1)" maxlength="255" />
            <button type="button" :aria-label="'Удалить тег ' + (index + 1)" @click="tags.splice(index, 1)">×</button>
          </div>
          <button type="button" class="task-inline__add-tag" @click="tags.push('')">+ Добавить свой тег</button>
        </template>
        <label v-else>
          {{ field === 'deadline' ? 'Дедлайн' : 'Дата и время напоминания' }}
          <input
            v-model="draft"
            :type="field === 'deadline' ? 'date' : 'datetime-local'"
            :aria-label="field === 'deadline' ? 'Дедлайн' : 'Дата и время напоминания'"
          />
        </label>
        <p v-if="field !== 'tags'" class="task-inline__hint">
          Более ранняя дата невыполненного пункта имеет приоритет.
        </p>
      </fieldset>
      <p v-if="error" role="alert" class="task-inline__error">{{ error }}</p>
      <div class="task-inline__actions">
        <button type="button" :disabled="saving || busy" @click="submit(true)">Очистить</button>
        <button type="button" :disabled="saving" @click="close">Отмена</button>
        <button type="submit" class="task-inline__save" :disabled="saving || busy">
          {{ saving ? 'Сохранение…' : 'Сохранить' }}
        </button>
      </div>
    </form>
  </Teleport>
</template>

<style scoped>
.task-inline__trigger {
  display: inline-flex;
  min-height: 32px;
  max-width: 100%;
  align-items: center;
  border: 0;
  padding: 2px 0;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
}
.task-inline__trigger:focus-visible {
  outline: 2px solid #17897a;
  outline-offset: 3px;
}
.task-inline__trigger:hover {
  background: #f0f5f3;
}
.task-inline__trigger:disabled {
  opacity: 0.55;
  cursor: wait;
}
.task-inline__panel {
  position: fixed;
  z-index: 100;
  width: min(300px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 16px;
  display: grid;
  gap: 12px;
  background: #fff;
  color: #1f2622;
  color-scheme: light;
  border: 1px solid #e0e8e4;
  border-radius: 14px;
  box-shadow: 0 10px 35px #1f26222b;
  font-size: 13px;
}
fieldset {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  border: 0;
  min-width: 0;
}
label {
  display: grid;
  gap: 6px;
}
input {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid #ced8d2;
  background: #fff;
  color: #1f2622;
  border-radius: 7px;
  font: inherit;
}
button {
  color: inherit;
  font: inherit;
  cursor: pointer;
}
button:disabled {
  cursor: wait;
  opacity: 0.6;
}
.task-inline__tag {
  display: flex;
  gap: 6px;
}
.task-inline__tag button {
  background: transparent;
  border: 0;
}
.task-inline__hint {
  margin: 0;
  color: #69746e;
  font-size: 12px;
}
.task-inline__error {
  color: #b13b36;
  margin: 0;
}
.task-inline__actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.task-inline__actions button {
  border: 0;
  border-radius: 7px;
  padding: 7px;
  background: #eef3f0;
  color: #40534a;
}
.task-inline__actions .task-inline__save {
  color: #fff;
  background: #147d70;
}
.task-inline__actions button:hover:not(:disabled) {
  background: #dfe9e3;
}
.task-inline__actions .task-inline__save:hover:not(:disabled) {
  background: #11685d;
}
.task-inline__panel button:focus-visible {
  outline: 2px solid #147d70;
  outline-offset: 2px;
}
.task-inline__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 2px;
}
.task-inline__preset {
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 5px 9px;
}
.task-inline__preset[aria-pressed='true'] {
  border-color: currentColor;
  box-shadow: 0 0 0 1px currentColor;
}
.task-inline__preset:hover:not(:disabled) {
  border-color: currentColor;
}
.task-inline__add-tag {
  color: #176859;
  background: #e8f3ef;
  border: 1px solid #b8d6cd;
  border-radius: 7px;
}
.task-inline__add-tag:hover:not(:disabled),
.task-inline__tag button:hover:not(:disabled) {
  background: #dceee6;
}
</style>
