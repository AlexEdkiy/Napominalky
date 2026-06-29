import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { AxiosError } from 'axios'

import ResetPasswordView from './ResetPasswordView.vue'
import { authApi } from '@/api/authApi'

vi.mock('@/api/authApi', () => ({
  authApi: {
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    deleteAccount: vi.fn(),
  },
}))

function createTestRouter(query: Record<string, string> = {}) {
  const queryStr = Object.keys(query).length > 0
    ? '?' + new URLSearchParams(query).toString()
    : ''
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/reset-password', name: 'reset-password', component: ResetPasswordView },
      { path: '/forgot-password', name: 'forgot-password', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  })
  router.push(`/reset-password${queryStr}`)
  return router
}

function makeAxios422(errors: Record<string, string[]>) {
  const error = new AxiosError('Unprocessable Entity')
  error.response = {
    data: { message: 'The given data was invalid.', errors },
    status: 422,
    statusText: 'Unprocessable Entity',
    headers: {},
    config: {} as never,
  }
  return error
}

describe('ResetPasswordView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an error when token query param is missing', async () => {
    const router = createTestRouter({ email: 'user@example.com' })
    await router.isReady()
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('недействительна или устарела')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('reads email from `amp;email` when the link was copied with &amp; encoding', async () => {
    const router = createTestRouter({ token: 'tok123', 'amp;email': 'user@example.com' })
    await router.isReady()
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })

    // email пришёл под ключом `amp;email` — форма должна отображаться, а не «ссылка устарела».
    expect(wrapper.text()).not.toContain('недействительна или устарела')
    expect(wrapper.find('form').exists()).toBe(true)
    expect((wrapper.find('#email').element as HTMLInputElement).value).toBe('user@example.com')
  })

  it('shows an error when email query param is missing', async () => {
    const router = createTestRouter({ token: 'tok123' })
    await router.isReady()
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('недействительна или устарела')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('shows an error when both token and email are missing', async () => {
    const router = createTestRouter()
    await router.isReady()
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('недействительна или устарела')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('renders the form when token and email are present', async () => {
    const router = createTestRouter({ token: 'tok123', email: 'user@example.com' })
    await router.isReady()
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })

    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('input#password').exists()).toBe(true)
    expect(wrapper.find('input#password_confirmation').exists()).toBe(true)
  })

  it('calls authApi.resetPassword with correct payload on valid submit', async () => {
    const message = 'Пароль обновлён. Войдите с новым паролем.'
    vi.mocked(authApi.resetPassword).mockResolvedValue({ message })

    const router = createTestRouter({ token: 'tok123', email: 'user@example.com' })
    await router.isReady()
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })

    await wrapper.find('input#password').setValue('newPass123')
    await wrapper.find('input#password_confirmation').setValue('newPass123')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(authApi.resetPassword).toHaveBeenCalledTimes(1))
    expect(authApi.resetPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: 'tok123',
      password: 'newPass123',
      password_confirmation: 'newPass123',
    })
  })

  it('shows success message after successful submit', async () => {
    const message = 'Пароль обновлён. Войдите с новым паролем.'
    vi.mocked(authApi.resetPassword).mockResolvedValue({ message })

    const router = createTestRouter({ token: 'tok123', email: 'user@example.com' })
    await router.isReady()
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })

    await wrapper.find('input#password').setValue('newPass123')
    await wrapper.find('input#password_confirmation').setValue('newPass123')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain(message))
  })

  it('shows invalid token error message when 422 contains token error', async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue(
      makeAxios422({ token: ['This password reset token is invalid.'] }),
    )

    const router = createTestRouter({ token: 'bad-token', email: 'user@example.com' })
    await router.isReady()
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })

    await wrapper.find('input#password').setValue('newPass123')
    await wrapper.find('input#password_confirmation').setValue('newPass123')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('Ссылка недействительна или устарела'),
    )
  })

  it('shows field errors when 422 returns password errors', async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue(
      makeAxios422({ password: ['Пароль слишком простой.'] }),
    )

    const router = createTestRouter({ token: 'tok123', email: 'user@example.com' })
    await router.isReady()
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })

    await wrapper.find('input#password').setValue('newPass123')
    await wrapper.find('input#password_confirmation').setValue('newPass123')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Пароль слишком простой.'))
  })

  it('does not call API when passwords do not match', async () => {
    const router = createTestRouter({ token: 'tok123', email: 'user@example.com' })
    await router.isReady()
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })

    await wrapper.find('input#password').setValue('newPass123')
    await wrapper.find('input#password_confirmation').setValue('differentPass123')
    await wrapper.find('form').trigger('submit')

    expect(authApi.resetPassword).not.toHaveBeenCalled()
  })
})
