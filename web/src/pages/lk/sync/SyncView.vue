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
      <h1 class="sync__title">Синхронизация</h1>
    </header>

    <section class="sync__card" aria-label="Статус синхронизации">
      <h2 class="sync__card-title">Статус</h2>
      <dl class="sync__stats">
        <div class="sync__stat">
          <dt>Неразрешённых конфликтов</dt>
          <dd :class="{ 'sync__stat-value--alert': unresolvedCount > 0 }">
            {{ unresolvedCount }}
          </dd>
        </div>
        <div class="sync__stat">
          <dt>Последний курсор</dt>
          <dd>{{ status?.cursor ?? '—' }}</dd>
        </div>
      </dl>
      <p class="sync__note">
        Разрешение конфликтов — в следующем релизе.
      </p>
    </section>

    <section class="sync__card" aria-label="Конфликты синхронизации">
      <h2 class="sync__card-title">Конфликты</h2>

      <p v-if="error" role="alert" class="sync__error">{{ error }}</p>
      <p v-if="isLoading" class="sync__state" aria-live="polite">Загрузка…</p>
      <p v-else-if="conflicts.length === 0" class="sync__empty">Конфликтов нет.</p>

      <ul v-else class="sync__list">
        <li v-for="conflict in conflicts" :key="conflict.uuid" class="conflict">
          <header class="conflict__head">
            <span class="conflict__title">{{ conflictTitle(conflict) }}</span>
            <time class="conflict__time" :datetime="conflict.created_at">
              {{ formatDateTime(conflict.created_at) }}
            </time>
          </header>

          <span v-if="conflict.resolved_at !== null" class="conflict__resolved">
            Разрешён {{ formatDateTime(conflict.resolved_at) }}
          </span>

          <div class="conflict__payloads">
            <figure class="conflict__payload">
              <figcaption>Сервер</figcaption>
              <pre>{{ formatPayload(conflict.server_payload) }}</pre>
            </figure>
            <figure class="conflict__payload">
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

.sync__title {
  margin: 0 0 1rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: #1f2622;
}

.sync__card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.sync__card-title {
  margin: 0 0 0.9rem;
  font-size: 1rem;
  font-weight: 700;
  color: #1f2622;
}

.sync__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin: 0;
}

.sync__stat dt {
  color: #8a938f;
  font-size: 0.85rem;
}

.sync__stat dd {
  margin: 0.15rem 0 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #1f2622;
  overflow-wrap: anywhere;
}

.sync__stat-value--alert {
  color: #c98a2b;
}

.sync__note {
  margin: 0.9rem 0 0;
  font-size: 0.875rem;
  color: #8a938f;
}

.sync__state {
  margin: 0;
  color: #6b716e;
}

.sync__error {
  margin: 0 0 0.75rem;
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  background: #fbe3df;
  color: #cf5b4a;
}

.sync__empty {
  margin: 0;
  color: #8a938f;
}

.sync__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.conflict {
  border: 1px solid #eef1f0;
  border-radius: 12px;
  padding: 1rem;
}

.conflict__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.conflict__title {
  font-weight: 700;
  color: #1f2622;
}

.conflict__time {
  font-size: 0.85rem;
  color: #8a938f;
  white-space: nowrap;
}

.conflict__resolved {
  display: inline-block;
  margin-top: 0.35rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: #d8ebe4;
  color: #0f6155;
  font-size: 0.8rem;
  font-weight: 600;
}

.conflict__payloads {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 0.75rem;
}

@media (max-width: 700px) {
  .conflict__payloads {
    grid-template-columns: 1fr;
  }
}

.conflict__payload {
  margin: 0;
}

.conflict__payload figcaption {
  color: #8a938f;
  font-size: 0.85rem;
  margin-bottom: 0.35rem;
}

.conflict__payload pre {
  background: #eef1f0;
  border-radius: 10px;
  padding: 0.65rem;
  overflow-x: auto;
  font-size: 0.8rem;
  margin: 0;
  color: #1f2622;
}
</style>
