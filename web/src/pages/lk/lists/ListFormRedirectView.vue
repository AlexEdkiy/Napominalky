<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { shoppingListsApi } from '@/api/shoppingListsApi'
import { useLkForms } from '@/composables/useLkForms'

/**
 * Тонкая страница-редирект для deep-link'а `/lk/lists/:uuid` — страница
 * деталей списка заменена центральной модалкой «Задача/покупка»
 * (`LkTaskFormDialog`, рендерится один раз в `LkLayout`): она же редактирует
 * пункты списка. При заходе по прямой ссылке (в т.ч. из событий календаря):
 * подгружает список, открывает модалку в edit-режиме поверх таблицы
 * «Задачи и списки» и сразу редиректит на неё. Если список не найден —
 * просто возвращает на таблицу.
 */
const route = useRoute()
const router = useRouter()
const { openTaskForm } = useLkForms()

onMounted(async () => {
  const uuid = typeof route.params.uuid === 'string' ? route.params.uuid : null
  if (uuid !== null) {
    try {
      const list = await shoppingListsApi.fetchList(uuid)
      openTaskForm(list)
    } catch {
      // Список недоступен (удалён/чужой) — молча возвращаемся к таблице.
    }
  }
  await router.replace({ name: 'lk-tasks' })
})
</script>

<template>
  <div class="list-form-redirect" />
</template>
