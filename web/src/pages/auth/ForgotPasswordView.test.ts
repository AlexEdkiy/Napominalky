import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

import ForgotPasswordView from './ForgotPasswordView.vue'
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

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordView },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  })
}

describe('ForgotPasswordView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the email field and submit button', async () => {
    const router = createTestRouter()
    await router.push('/forgot-password')
    const wrapper = mount(ForgotPasswordView, { global: { plugins: [router] } })

    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('calls authApi.forgotPassword with the entered email on submit', async () => {
    const message = 'Если такой адрес зарегистрирован, мы отправили ссылку для сброса пароля.'
    vi.mocked(authApi.forgotPassword).mockResolvedValue({ message })

    const router = createTestRouter()
    await router.push('/forgot-password')
    const wrapper = mount(ForgotPasswordView, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(authApi.forgotPassword).toHaveBeenCalledTimes(1))

    expect(authApi.forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' })
  })

  it('shows the success message from the API response after submit', async () => {
    const message = 'Если такой адрес зарегистрирован, мы отправили ссылку для сброса пароля.'
    vi.mocked(authApi.forgotPassword).mockResolvedValue({ message })

    const router = createTestRouter()
    await router.push('/forgot-password')
    const wrapper = mount(ForgotPasswordView, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain(message))
  })

  it('shows a network error message when the API call fails', async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValue(new Error('Network Error'))

    const router = createTestRouter()
    await router.push('/forgot-password')
    const wrapper = mount(ForgotPasswordView, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Не удалось отправить запрос'))
  })
})
