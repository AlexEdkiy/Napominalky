<script setup lang="ts">
import { ref } from 'vue'

import LkIcon from '@/components/lk/LkIcon.vue'

interface Props {
  id: string
  label: string
  autocomplete: 'current-password' | 'new-password'
  error?: string | null
}

withDefaults(defineProps<Props>(), { error: null })

const model = defineModel<string>({ required: true })

const isVisible = ref(false)

function toggleVisibility(): void {
  isVisible.value = !isVisible.value
}
</script>

<template>
  <div class="auth-field">
    <label :for="id">{{ label }}</label>
    <div class="password-input">
      <input
        :id="id"
        v-model="model"
        :type="isVisible ? 'text' : 'password'"
        :autocomplete="autocomplete"
        required
      />
      <button
        type="button"
        class="password-toggle"
        :aria-label="isVisible ? 'Скрыть пароль' : 'Показать пароль'"
        @click="toggleVisibility"
      >
        <LkIcon :name="isVisible ? 'eye-off' : 'eye'" :size="18" />
      </button>
    </div>
    <span v-if="error" class="auth-field__error">{{ error }}</span>
  </div>
</template>

<style scoped>
.password-input {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input input {
  padding-right: 2.6rem;
}

.password-toggle {
  position: absolute;
  right: 0.4rem;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 9px;
  background: none;
  color: #8a938f;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.password-toggle:hover {
  background: #eef1f0;
  color: #17897a;
}

.password-toggle:focus-visible {
  outline: 2px solid #17897a;
  outline-offset: 1px;
}
</style>
