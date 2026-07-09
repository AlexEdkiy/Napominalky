import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import LoginView from './LoginView.vue'
import { authApi } from '@/api/authApi'
import type { User } from '@/types/auth'

vi.mock('@/api/authApi', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    deleteAccount: vi.fn(),
  },
}))

const LAST_EMAIL_STORAGE_KEY = 'lk_last_email'

const user: User = {
  uuid: 'u-1',
  name: 'Иван',
  email: 'user@example.com',
  is_admin: false,
  is_super_admin: false,
  is_active: true,
  sync_enabled: true,
  created_at: '2026-07-01T00:00:00Z',
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView },
      { path: '/lk', name: 'lk-dashboard', component: { template: '<div />' } },
      { path: '/forgot-password', name: 'forgot-password', component: { template: '<div />' } },
      { path: '/register', name: 'register', component: { template: '<div />' } },
    ],
  })
}

async function mountLoginView() {
  const router = createTestRouter()
  await router.push({ name: 'login' })
  const wrapper = mount(LoginView, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    window.localStorage.clear()
  })

  it('prefills the email field from a previously remembered value', async () => {
    window.localStorage.setItem(LAST_EMAIL_STORAGE_KEY, 'saved@example.com')

    const { wrapper } = await mountLoginView()

    expect((wrapper.find('#email').element as HTMLInputElement).value).toBe('saved@example.com')
  })

  it('leaves the email field empty when nothing was remembered', async () => {
    const { wrapper } = await mountLoginView()

    expect((wrapper.find('#email').element as HTMLInputElement).value).toBe('')
  })

  it('toggles the password field type and aria-label when the eye button is clicked', async () => {
    const { wrapper } = await mountLoginView()

    const passwordInput = wrapper.find('#password')
    const toggle = wrapper.find('.password-toggle')
    expect(passwordInput.attributes('type')).toBe('password')
    expect(toggle.attributes('aria-label')).toBe('Показать пароль')

    await toggle.trigger('click')

    expect(passwordInput.attributes('type')).toBe('text')
    expect(toggle.attributes('aria-label')).toBe('Скрыть пароль')

    await toggle.trigger('click')

    expect(passwordInput.attributes('type')).toBe('password')
    expect(toggle.attributes('aria-label')).toBe('Показать пароль')
  })

  it('saves the email to localStorage on successful login when "remember me" is checked', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ token: 'tok', token_type: 'Bearer', user })

    const { wrapper } = await mountLoginView()

    await wrapper.find('#email').setValue('new@example.com')
    await wrapper.find('#password').setValue('secret123')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(authApi.login).toHaveBeenCalledTimes(1))
    await vi.waitFor(() =>
      expect(window.localStorage.getItem(LAST_EMAIL_STORAGE_KEY)).toBe('new@example.com'),
    )
  })

  it('clears the remembered email on successful login when "remember me" is unchecked', async () => {
    window.localStorage.setItem(LAST_EMAIL_STORAGE_KEY, 'old@example.com')
    vi.mocked(authApi.login).mockResolvedValue({ token: 'tok', token_type: 'Bearer', user })

    const { wrapper } = await mountLoginView()

    await wrapper.find('.remember-me input').setValue(false)
    await wrapper.find('#email').setValue('new@example.com')
    await wrapper.find('#password').setValue('secret123')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(authApi.login).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(window.localStorage.getItem(LAST_EMAIL_STORAGE_KEY)).toBeNull())
  })

  it('never persists the password to localStorage', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ token: 'tok', token_type: 'Bearer', user })

    const { wrapper } = await mountLoginView()

    await wrapper.find('#email').setValue('new@example.com')
    await wrapper.find('#password').setValue('super-secret')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(authApi.login).toHaveBeenCalledTimes(1))
    const stored = JSON.stringify(window.localStorage)
    expect(stored).not.toContain('super-secret')
  })

  it('shows an error message on invalid credentials without touching remembered email', async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: {} },
    })

    const { wrapper } = await mountLoginView()

    await wrapper.find('#email').setValue('wrong@example.com')
    await wrapper.find('#password').setValue('badpass')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Неверный email или пароль.'))
    expect(window.localStorage.getItem(LAST_EMAIL_STORAGE_KEY)).toBeNull()
  })
})
