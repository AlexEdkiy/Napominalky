<script setup lang="ts">
import { useRoute } from 'vue-router'

import LkIcon from '@/components/lk/LkIcon.vue'
import { isLkNavItemActive, LK_NAV_ITEMS } from '@/constants/lkNav'

const emit = defineEmits<{
  create: []
}>()

const route = useRoute()

// 5 пунктов вокруг центральной «+»: слева на один больше (3 + [+] + 2) —
// нечётное число делится с перевесом влево, как в мобильных таб-барах.
const splitIndex = Math.ceil(LK_NAV_ITEMS.length / 2)
const leftItems = LK_NAV_ITEMS.slice(0, splitIndex)
const rightItems = LK_NAV_ITEMS.slice(splitIndex)
</script>

<template>
  <nav class="lk-bottom-nav" aria-label="Разделы личного кабинета">
    <RouterLink
      v-for="item in leftItems"
      :key="item.routeName"
      :to="{ name: item.routeName }"
      class="lk-bottom-nav__link"
      :class="{ 'lk-bottom-nav__link--active': isLkNavItemActive(item, route.name as string) }"
    >
      <LkIcon :name="item.icon" :size="20" />
      <span class="lk-bottom-nav__label">{{ item.mobileLabel }}</span>
    </RouterLink>

    <button type="button" class="lk-bottom-nav__create" aria-label="Создать" @click="emit('create')">
      <LkIcon name="plus" :size="22" />
    </button>

    <RouterLink
      v-for="item in rightItems"
      :key="item.routeName"
      :to="{ name: item.routeName }"
      class="lk-bottom-nav__link"
      :class="{ 'lk-bottom-nav__link--active': isLkNavItemActive(item, route.name as string) }"
    >
      <LkIcon :name="item.icon" :size="20" />
      <span class="lk-bottom-nav__label">{{ item.mobileLabel }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.lk-bottom-nav {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 30;
  height: var(--lk-bottom-nav-height, calc(4rem + env(safe-area-inset-bottom, 0px)));
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0.5rem 0.5rem calc(0.5rem + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #e5e7eb;
}

/* 5 пунктов: `min-width: 0` + ellipsis на подписи — длинные подписи
   («Календарь», «Напомин.») не переполняют узкие экраны и не налезают
   друг на друга; горизонтальный паддинг ужат под 5 слотов. */
.lk-bottom-nav__link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.25rem 0.15rem;
  text-decoration: none;
  color: #8a938f;
  flex: 1;
  min-width: 0;
}

.lk-bottom-nav__link--active {
  color: #17897a;
}

.lk-bottom-nav__label {
  font-size: 0.66rem;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lk-bottom-nav__create {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  margin: -20px 0.25rem 0;
  border-radius: 50%;
  border: none;
  background: #17897a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(23, 137, 122, 0.4);
}
</style>
