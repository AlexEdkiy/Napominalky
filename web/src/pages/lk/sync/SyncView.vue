<script setup lang="ts">
import { onMounted } from 'vue'

import { useSync } from '@/composables/useSync'
import type { SyncConflict } from '@/types/sync'
import { formatDateTime } from '@/utils/datetime'

const { conflicts, status, isLoading, error, unresolvedCount, load, loadStatus } = useSync()

function formatPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2)
}

function conflictTitle(conflict: SyncConflict): string {
  return `${conflict.entity_type} · ${conflict.entity_uuid}`
}

onMounted(() => {
  void load()
  void loadStatus()
})
</script>

<template>
  <main class="sync">
    <header class="sync__header">
      <h1>Синхронизация</h1>
    </header>

    <section class="sync__status" aria-label="Статус синхронизации">
      <h2>Статус</h2>
      <dl class="sync__stats">
        <div>
          <dt>Неразрешённых конфликтов</dt>
          <dd>{{ unresolvedCount }}</dd>
        </div>
        <div>
          <dt>Последний курсор</dt>
          <dd>{{ status?.cursor ?? '—' }}</dd>
        </div>
      </dl>
      <p class="sync__note">
        Разрешение конфликтов — в следующем релизе.
      </p>
    </section>

    <section class="sync__conflicts" aria-label="Конфликты синхронизации">
      <h2>Конфликты</h2>

      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <p v-if="isLoading">Загрузка…</p>
      <p v-else-if="conflicts.length === 0" class="empty">Конфликтов нет.</p>

      <ul v-else class="sync__list">
        <li v-for="conflict in conflicts" :key="conflict.uuid" class="conflict">
          <header class="conflict__head">
            <span class="conflict__title">{{ conflictTitle(conflict) }}</span>
            <time :datetime="conflict.created_at">{{ formatDateTime(conflict.created_at) }}</time>
          </header>

          <span v-if="conflict.resolved_at !== null" class="conflict__resolved">
            Разрешён {{ formatDateTime(conflict.resolved_at) }}
          </span>

          <div class="conflict__payloads">
            <figure>
              <figcaption>Сервер</figcaption>
              <pre>{{ formatPayload(conflict.server_payload) }}</pre>
            </figure>
            <figure>
              <figcaption>Клиент</figcaption>
              <pre>{{ formatPayload(conflict.client_payload) }}</pre>
            </figure>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.sync {
  max-width: 960px;
  margin: 0 auto;
}

.sync__status {
  margin-bottom: 1.5rem;
}

.sync__stats {
  display: flex;
  gap: 2rem;
  margin: 0.5rem 0;
}

.sync__stats dt {
  color: #777;
  font-size: 0.85rem;
}

.sync__stats dd {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.sync__note {
  color: #777;
  font-style: italic;
}

.sync__list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.conflict {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
}

.conflict__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.conflict__title {
  font-weight: 600;
}

.conflict__resolved {
  display: inline-block;
  margin-top: 0.25rem;
  color: #2e7d32;
  font-size: 0.85rem;
}

.conflict__payloads {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 0.75rem;
}

.conflict__payloads figcaption {
  color: #777;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.conflict__payloads pre {
  background: #f5f5f5;
  border-radius: 6px;
  padding: 0.5rem;
  overflow-x: auto;
  font-size: 0.8rem;
  margin: 0;
}

.error {
  color: #c0392b;
}

.empty {
  color: #777;
}
</style>
