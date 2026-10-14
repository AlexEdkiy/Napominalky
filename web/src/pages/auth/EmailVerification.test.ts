import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/stores/authStore'
import RegisterView from './RegisterView.vue'
import VerifyEmailView from './VerifyEmailView.vue'
import LoginView from './LoginView.vue'
vi.mock('@/api/authApi', () => ({ authApi: { register: vi.fn(), login: vi.fn(), resendVerification: vi.fn(), verifyEmail: vi.fn() } }))

async function screen(path: string, component: typeof RegisterView) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/verify-email', name: 'verify-email', component: VerifyEmailView },
    { path: '/lk', name: 'lk-dashboard', component: { template: '<div />' } },
    { path: '/forgot-password', name: 'forgot-password', component: { template: '<div />' } },
  ] })
  await router.push(path)
  return { wrapper: mount(component, { global: { plugins: [createPinia(), router] } }), router }
}
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setActivePinia(createPinia()) })

it('registration waits for verification without persisting a token or redirecting', async () => {
  vi.mocked(authApi.register).mockResolvedValue({ verification_required: true, email: 'new@example.com', email_sent: true, message: 'Письмо отправлено.' })
  const { wrapper, router } = await screen('/register', RegisterView)
  await wrapper.get('#email').setValue('new@example.com')
  await wrapper.get('#password').setValue('password123')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(wrapper.text()).toContain('Подтвердите почту')
  expect(useAuthStore().token).toBeNull()
  expect(localStorage.getItem('auth_token')).toBeNull()
  expect(router.currentRoute.value.path).toBe('/register')
  vi.mocked(authApi.resendVerification).mockResolvedValue({ message: 'Повторно отправлено.' })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(authApi.resendVerification).toHaveBeenCalledWith({ email: 'new@example.com', password: 'password123' })
  expect(wrapper.text()).toContain('Повторно отправлено.')
})

it('a pending login offers mail resend while keeping the session empty', async () => {
  vi.mocked(authApi.login).mockRejectedValue({ isAxiosError: true, response: { status: 403, data: { code: 'email_verification_required', message: 'Подтвердите почту.' } } })
  const { wrapper } = await screen('/login', LoginView)
  await wrapper.get('#email').setValue('new@example.com')
  await wrapper.get('#password').setValue('password123')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(wrapper.text()).toContain('Отправить письмо повторно')
  expect(useAuthStore().token).toBeNull()
})

it('does not verify on opening the link and confirms only on explicit click', async () => {
  vi.mocked(authApi.verifyEmail).mockResolvedValue({ message: 'Почта подтверждена.' })
  const { wrapper } = await screen('/verify-email?verification=signed-path', VerifyEmailView)
  expect(authApi.verifyEmail).not.toHaveBeenCalled()
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(authApi.verifyEmail).toHaveBeenCalledWith('signed-path')
  expect(wrapper.text()).toContain('Почта подтверждена.')
  expect(wrapper.find('button').exists()).toBe(false)
  expect(useAuthStore().token).toBeNull()
})

it('explains an expired link in Russian and permits retry after network failure', async () => {
  vi.mocked(authApi.verifyEmail).mockRejectedValueOnce({ isAxiosError: true, response: { status: 403, data: { message: 'Ссылка истекла. Запросите новое письмо.' } } }).mockResolvedValueOnce({ message: 'Почта подтверждена.' })
  const { wrapper } = await screen('/verify-email?verification=signed-path', VerifyEmailView)
  await wrapper.get('button').trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('Ссылка истекла.')
  await wrapper.get('button').trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('Почта подтверждена.')
})
