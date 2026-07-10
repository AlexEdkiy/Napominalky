<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { notesApi } from '@/api/notesApi'
import { useLkForms } from '@/composables/useLkForms'

/**
 * Тонкая страница-редирект для deep-link'ов `/lk/notes/new` и
 * `/lk/notes/:uuid` — форма заметки теперь центральная модалка
 * (`LkNoteFormDialog`, рендерится один раз в `LkLayout`), а не отдельная
 * страница. При заходе по прямой ссылке: подгружает заметку (если есть
 * `uuid`), открывает модалку через `useLkForms` и сразу редиректит на
 * список заметок, чтобы модалка отображалась поверх привычного раздела.
 */
const route = useRoute()
const router = useRouter()
const { openNoteForm } = useLkForms()

onMounted(async () => {
  const uuid = typeof route.params.uuid === 'string' ? route.params.uuid : null
  if (uuid !== null) {
    try {
      const note = await notesApi.fetchNote(uuid)
      openNoteForm(note)
    } catch {
      openNoteForm()
    }
  } else {
    openNoteForm()
  }
  await router.replace({ name: 'lk-notes' })
})
</script>

<template>
  <div class="note-form-redirect" />
</template>
