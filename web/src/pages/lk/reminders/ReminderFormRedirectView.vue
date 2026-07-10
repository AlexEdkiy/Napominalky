<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { remindersApi } from '@/api/remindersApi'
import { useLkForms } from '@/composables/useLkForms'

/**
 * Тонкая страница-редирект для deep-link'ов `/lk/reminders/new` и
 * `/lk/reminders/:uuid` — форма напоминания теперь центральная модалка
 * (`LkReminderFormDialog`, рендерится один раз в `LkLayout`), а не отдельная
 * страница. При заходе по прямой ссылке: подгружает напоминание (если есть
 * `uuid`), открывает модалку через `useLkForms` и сразу редиректит на
 * список напоминаний, чтобы модалка отображалась поверх привычного раздела.
 */
const route = useRoute()
const router = useRouter()
const { openReminderForm } = useLkForms()

onMounted(async () => {
  const uuid = typeof route.params.uuid === 'string' ? route.params.uuid : null
  if (uuid !== null) {
    try {
      const reminder = await remindersApi.fetchReminder(uuid)
      openReminderForm(reminder)
    } catch {
      openReminderForm()
    }
  } else {
    openReminderForm()
  }
  await router.replace({ name: 'lk-reminders' })
})
</script>

<template>
  <div class="reminder-form-redirect" />
</template>
