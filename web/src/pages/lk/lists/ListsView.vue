<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import ListCard from '@/components/lists/ListCard.vue'
import { useShoppingLists } from '@/composables/useShoppingLists'

const router = useRouter()
const { lists, isLoading, error, load, create, remove } = useShoppingLists()

const newTitle = ref('')

async function handleCreate(): Promise<void> {
  const title = newTitle.value.trim()
  if (!title) {
    return
  }
  const list = await create({ title })
  if (list) {
    newTitle.value = ''
  }
}

function handleOpen(uuid: string): void {
  void router.push({ name: 'lk-list-detail', params: { uuid } })
}

async function handleRemove(uuid: string): Promise<void> {
  await remove(uuid)
}

onMounted(() => load())
</script>

<template>
  <main class="lists">
    <header class="lists__header">
      <h1>Списки покупок</h1>
    </header>

    <form class="lists__create" @submit.prevent="handleCreate">
      <div class="field">
        <label for="list-title">Название списка</label>
        <input id="list-title" v-model="newTitle" type="text" placeholder="Например, Продукты" />
      </div>
      <button type="submit">Создать список</button>
    </form>

    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="isLoading">Загрузка…</p>
    <p v-else-if="lists.length === 0" class="empty">Списков пока нет.</p>

    <section v-else class="lists__list">
      <ListCard
        v-for="list in lists"
        :key="list.uuid"
        :list="list"
        @open="handleOpen"
        @remove="handleRemove"
      />
    </section>
  </main>
</template>

<style scoped>
.lists {
  max-width: 720px;
  margin: 0 auto;
}

.lists__create {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  margin: 1rem 0;
}

.field {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.error {
  color: #c0392b;
}

.empty {
  color: #777;
}
</style>
