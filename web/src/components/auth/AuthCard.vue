<script setup lang="ts">
import LkIcon from '@/components/lk/LkIcon.vue'

interface Props {
  title: string
}

defineProps<Props>()
</script>

<template>
  <div class="auth-shell">
    <div class="auth-card">
      <aside class="auth-card__panel">
        <div class="auth-brand auth-brand--light">
          <span class="auth-brand__icon"><LkIcon name="bell" :size="20" /></span>
          <span class="auth-brand__text">
            <span class="auth-brand__title">Напоминалки</span>
            <span class="auth-brand__subtitle">Личный кабинет</span>
          </span>
        </div>
        <p class="auth-card__slogan">
          Напоминания, задачи и списки покупок — всё под рукой в одном личном кабинете.
        </p>
      </aside>

      <main class="auth-card__body">
        <div class="auth-brand auth-brand--compact">
          <span class="auth-brand__icon"><LkIcon name="bell" :size="20" /></span>
          <span class="auth-brand__title">Напоминалки</span>
        </div>

        <h1 class="auth-card__title">{{ title }}</h1>

        <slot />

        <div class="auth-card__footer">
          <slot name="footer" />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  background: #eef1f0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.auth-card {
  display: flex;
  width: 100%;
  max-width: 860px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.auth-card__panel {
  width: 340px;
  flex-shrink: 0;
  background: linear-gradient(160deg, #0f6155, #0b3f37);
  color: #fff;
  padding: 2.5rem 2.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.auth-brand__icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  background: #e9a63c;
  color: #fff;
}

.auth-brand__text {
  display: flex;
  flex-direction: column;
}

.auth-brand__title {
  font-size: 19px;
  font-weight: 900;
  white-space: nowrap;
}

.auth-brand__subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
}

.auth-brand--compact {
  display: none;
  margin-bottom: 1.5rem;
  color: #1f2622;
}

.auth-card__slogan {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.75);
}

.auth-card__body {
  flex: 1;
  min-width: 0;
  padding: 2.5rem 2.5rem 2rem;
}

.auth-card__title {
  margin: 0 0 1.25rem;
  font-size: 24px;
  font-weight: 800;
  color: #1f2622;
}

.auth-card__footer {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 14px;
  color: #8a938f;
}

@media (max-width: 860px) {
  .auth-card {
    max-width: 440px;
  }

  .auth-card__panel {
    display: none;
  }

  .auth-brand--compact {
    display: flex;
  }
}

@media (max-width: 480px) {
  .auth-shell {
    padding: 2rem 0.75rem;
    align-items: flex-start;
  }

  .auth-card__body {
    padding: 1.75rem 1.4rem 1.5rem;
  }
}
</style>

<style>
/* Общие примитивы форм аутентификации (используются в слотах страниц auth/). */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-hint {
  margin: -0.75rem 0 1.25rem;
  font-size: 14px;
  color: #8a938f;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.auth-field label {
  font-size: 13px;
  font-weight: 700;
  color: #1f2622;
}

.auth-field input {
  width: 100%;
  height: 46px;
  padding: 0 0.9rem;
  border: 1px solid #e3e6e5;
  border-radius: 12px;
  background: #fbfcfb;
  color: #1f2622;
  font-size: 15px;
  font-family: inherit;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.auth-field input:focus {
  outline: none;
  border-color: #17897a;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(23, 137, 122, 0.14);
}

.auth-field input[readonly] {
  background: #f2f4f3;
  color: #8a938f;
}

.auth-field__error {
  font-size: 13px;
  color: #c0392b;
}

.auth-error {
  margin: 0;
  font-size: 14px;
  color: #c0392b;
}

.auth-alert {
  margin: 0;
  padding: 0.7rem 0.9rem;
  border: 1px solid #f2d4cf;
  border-radius: 12px;
  background: #fdf1ef;
  color: #c0392b;
  font-size: 14px;
}

.auth-alert p {
  margin: 0 0 0.35rem;
}

.auth-alert p:last-child {
  margin-bottom: 0;
}

.auth-status {
  margin: 0;
  padding: 0.8rem 0.95rem;
  border: 1px solid #cfe8e2;
  border-radius: 12px;
  background: #ecf6f3;
  color: #0f6155;
  font-size: 14px;
}

.auth-status p {
  margin: 0 0 0.35rem;
}

.auth-status p:last-child {
  margin-bottom: 0;
}

.auth-submit {
  height: 46px;
  margin-top: 0.25rem;
  border: none;
  border-radius: 12px;
  background: #17897a;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(23, 137, 122, 0.25);
  transition: background 0.15s ease;
}

.auth-submit:hover:not(:disabled) {
  background: #146f63;
}

.auth-submit:disabled {
  opacity: 0.6;
  cursor: default;
  box-shadow: none;
}

.auth-link {
  color: #17897a;
  font-weight: 600;
  text-decoration: none;
}

.auth-link:hover {
  text-decoration: underline;
}

.auth-card__footer p {
  margin: 0.4rem 0 0;
}
</style>
