import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import AccountView from './AccountView.vue'
import { authApi } from '@/api/authApi'
import { settingsApi } from '@/api/settingsApi'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types/auth'
import { resizeImageToBlob } from '@/utils/image'

vi.mock('@/api/authApi', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    deleteAvatar: vi.fn(),
    deleteAccount: vi.fn(),
  },
}))

vi.mock('@/api/settingsApi', () => ({
  settingsApi: {
    toggleSync: vi.fn(),
  },
}))

vi.mock('@/utils/image', () => ({
  resizeImageToBlob: vi.fn(),
}))

const user: User = {
  uuid: 'u-1',
  name: 'Иван',
  email: 'ivan@example.com',
  is_admin: false,
  is_super_admin: false,
  is_active: true,
  sync_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
  avatar: null,
}

const AVATAR_URI = 'data:image/jpeg;base64,abc123'

function make422(errors: Record<string, string[]>): AxiosError {
  const error = new AxiosError('Unprocessable', 'ERR_BAD_REQUEST')
  error.response = {
    status: 422,
    data: { message: 'The given data was invalid.', errors },
  } as AxiosResponse
  error.config = {} as InternalAxiosRequestConfig
  return error
}

async function mountAccountView(currentUser: User = user): Promise<VueWrapper> {
  setActivePinia(createPinia())
  useAuthStore().setUser(currentUser)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk/account', name: 'lk-account', component: AccountView },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'lk-account' })
  const wrapper = mount(AccountView, { global: { plugins: [router] } })
  await wrapper.vm.$nextTick()
  return wrapper
}

async function pickFile(wrapper: VueWrapper, file: File): Promise<void> {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await vi.waitFor(() => expect(wrapper.find('.account__button:disabled').exists()).toBe(false))
}

describe('AccountView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // jsdom не реализует Blob-URL; глобальный URL не подменяем целиком,
    // чтобы не сломать vue-router (он использует new URL()).
    URL.createObjectURL = vi.fn().mockReturnValue('blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  it('shows the initial circle when the user has no avatar', async () => {
    const wrapper = await mountAccountView()

    expect(wrapper.find('.account__avatar--photo').exists()).toBe(false)
    expect(wrapper.find('.account__avatar').text()).toBe('И')
    expect(wrapper.text()).not.toContain('Удалить фото')
  })

  it('shows the avatar photo and the delete button when the user has one', async () => {
    const wrapper = await mountAccountView({ ...user, avatar: AVATAR_URI })

    const photo = wrapper.find('.account__avatar--photo')
    expect(photo.exists()).toBe(true)
    expect(photo.attributes('src')).toBe(AVATAR_URI)
    expect(wrapper.text()).toContain('Удалить фото')
  })

  it('shows email as plain text in view mode (no email input)', async () => {
    const wrapper = await mountAccountView()

    expect(wrapper.find('input[type="email"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('ivan@example.com')
  })

  describe('profile editing (name + email)', () => {
    async function openEditForm(wrapper: VueWrapper): Promise<void> {
      await wrapper.find('.account__name-view button').trigger('click')
    }

    it('opens the form prefilled with the current name and email and saves both via the API', async () => {
      vi.mocked(authApi.updateProfile).mockResolvedValue({
        ...user,
        name: 'Пётр',
        email: 'petr@example.com',
      })
      const wrapper = await mountAccountView()

      await openEditForm(wrapper)
      const nameInput = wrapper.find('input[type="text"]')
      const emailInput = wrapper.find('input[type="email"]')
      expect((nameInput.element as HTMLInputElement).value).toBe('Иван')
      expect((emailInput.element as HTMLInputElement).value).toBe('ivan@example.com')

      await nameInput.setValue('Пётр')
      await emailInput.setValue('petr@example.com')
      await wrapper.find('.account__profile-form').trigger('submit')
      await vi.waitFor(() => expect(wrapper.find('.account__profile-form').exists()).toBe(false))

      expect(authApi.updateProfile).toHaveBeenCalledWith('Пётр', 'petr@example.com')
      expect(useAuthStore().user?.name).toBe('Пётр')
      expect(useAuthStore().user?.email).toBe('petr@example.com')
      expect(wrapper.find('.account__name').text()).toBe('Пётр')
      expect(wrapper.text()).toContain('petr@example.com')
    })

    it('rejects an empty name locally without calling the API', async () => {
      const wrapper = await mountAccountView()

      await openEditForm(wrapper)
      await wrapper.find('input[type="text"]').setValue('   ')
      await wrapper.find('.account__profile-form').trigger('submit')

      expect(wrapper.find('.account__field-error').text()).toBe('Введите имя.')
      expect(authApi.updateProfile).not.toHaveBeenCalled()
    })

    it('rejects an invalid email locally without calling the API', async () => {
      const wrapper = await mountAccountView()

      await openEditForm(wrapper)
      await wrapper.find('input[type="email"]').setValue('not-an-email')
      await wrapper.find('.account__profile-form').trigger('submit')

      expect(wrapper.find('.account__field-error').text()).toBe('Введите корректный e-mail.')
      expect(authApi.updateProfile).not.toHaveBeenCalled()
    })

    it('shows the 422 message from errors.name under the name field', async () => {
      vi.mocked(authApi.updateProfile).mockRejectedValue(
        make422({ name: ['Имя слишком длинное.'] }),
      )
      const wrapper = await mountAccountView()

      await openEditForm(wrapper)
      await wrapper.find('input[type="text"]').setValue('Пётр')
      await wrapper.find('.account__profile-form').trigger('submit')
      await vi.waitFor(() =>
        expect(wrapper.find('.account__field-error').exists()).toBe(true),
      )

      expect(wrapper.find('.account__field-error').text()).toBe('Имя слишком длинное.')
      expect(wrapper.find('.account__profile-form').exists()).toBe(true)
    })

    it('shows the 422 message from errors.email (e.g. taken) under the email field', async () => {
      vi.mocked(authApi.updateProfile).mockRejectedValue(
        make422({ email: ['Такой e-mail уже занят.'] }),
      )
      const wrapper = await mountAccountView()

      await openEditForm(wrapper)
      await wrapper.find('input[type="email"]').setValue('taken@example.com')
      await wrapper.find('.account__profile-form').trigger('submit')
      await vi.waitFor(() =>
        expect(wrapper.find('.account__field-error').exists()).toBe(true),
      )

      expect(wrapper.find('.account__field-error').text()).toBe('Такой e-mail уже занят.')
      expect(wrapper.find('.account__profile-form').exists()).toBe(true)
      expect(useAuthStore().user?.email).toBe('ivan@example.com')
    })

    it('cancel restores the read-only view without saving', async () => {
      const wrapper = await mountAccountView()

      await openEditForm(wrapper)
      await wrapper.find('input[type="text"]').setValue('Другой')
      await wrapper.find('input[type="email"]').setValue('other@example.com')
      const buttons = wrapper.findAll('.account__form-actions button')
      await buttons[1]!.trigger('click')

      expect(wrapper.find('.account__profile-form').exists()).toBe(false)
      expect(authApi.updateProfile).not.toHaveBeenCalled()
      expect(wrapper.find('.account__name').text()).toBe('Иван')
      expect(wrapper.text()).toContain('ivan@example.com')
    })
  })

  describe('sync toggle', () => {
    it('turns sync off via the API and updates the store and the badge', async () => {
      vi.mocked(settingsApi.toggleSync).mockResolvedValue({ ...user, sync_enabled: false })
      const wrapper = await mountAccountView()
      const toggle = wrapper.find('#account-sync-toggle')
      expect((toggle.element as HTMLInputElement).checked).toBe(true)
      expect(wrapper.find('.account__badge').text()).toBe('включена')

      await toggle.setValue(false)
      await vi.waitFor(() =>
        expect(wrapper.find('.account__badge').text()).toBe('выключена'),
      )

      expect(settingsApi.toggleSync).toHaveBeenCalledWith(false)
      expect(useAuthStore().user?.sync_enabled).toBe(false)
      expect((toggle.element as HTMLInputElement).checked).toBe(false)
    })

    it('disables the toggle while the request is in flight', async () => {
      let resolveToggle: ((value: User) => void) | undefined
      vi.mocked(settingsApi.toggleSync).mockReturnValue(
        new Promise((resolve) => {
          resolveToggle = resolve
        }),
      )
      const wrapper = await mountAccountView()
      const toggle = wrapper.find('#account-sync-toggle')

      await toggle.setValue(false)
      await vi.waitFor(() =>
        expect(toggle.attributes('disabled')).toBeDefined(),
      )

      resolveToggle?.({ ...user, sync_enabled: false })
      await vi.waitFor(() => expect(toggle.attributes('disabled')).toBeUndefined())
    })

    it('shows the error and rolls the checkbox back when the request fails', async () => {
      vi.mocked(settingsApi.toggleSync).mockRejectedValue(
        new Error('Не удалось изменить настройку синхронизации'),
      )
      const wrapper = await mountAccountView()
      const toggle = wrapper.find('#account-sync-toggle')

      await toggle.setValue(false)
      await vi.waitFor(() =>
        expect(wrapper.find('.account__sync-error').exists()).toBe(true),
      )

      expect(useAuthStore().user?.sync_enabled).toBe(true)
      expect((toggle.element as HTMLInputElement).checked).toBe(true)
      expect(wrapper.find('.account__badge').text()).toBe('включена')
    })
  })

  describe('avatar upload', () => {
    it('resizes the picked file, uploads the blob and renders the fresh avatar', async () => {
      const resized = new Blob(['small-jpeg'], { type: 'image/jpeg' })
      vi.mocked(resizeImageToBlob).mockResolvedValue(resized)
      vi.mocked(authApi.uploadAvatar).mockResolvedValue({ ...user, avatar: AVATAR_URI })
      const wrapper = await mountAccountView()
      const file = new File(['raw'], 'photo.png', { type: 'image/png' })

      await pickFile(wrapper, file)

      expect(resizeImageToBlob).toHaveBeenCalledWith(file)
      expect(authApi.uploadAvatar).toHaveBeenCalledWith(resized)
      expect(useAuthStore().user?.avatar).toBe(AVATAR_URI)
      expect(wrapper.find('.account__avatar--photo').attributes('src')).toBe(AVATAR_URI)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('shows a resized preview while the upload is in flight', async () => {
      vi.mocked(resizeImageToBlob).mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }))
      let resolveUpload: ((value: User) => void) | undefined
      vi.mocked(authApi.uploadAvatar).mockReturnValue(
        new Promise((resolve) => {
          resolveUpload = resolve
        }),
      )
      const wrapper = await mountAccountView()
      const input = wrapper.find('input[type="file"]')
      const file = new File(['raw'], 'photo.png', { type: 'image/png' })
      Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
      await input.trigger('change')

      await vi.waitFor(() =>
        expect(wrapper.find('.account__avatar--photo').attributes('src')).toBe('blob:preview'),
      )
      expect(wrapper.text()).toContain('Загрузка…')

      resolveUpload?.({ ...user, avatar: AVATAR_URI })
      await vi.waitFor(() =>
        expect(wrapper.find('.account__avatar--photo').attributes('src')).toBe(AVATAR_URI),
      )
    })

    it('shows the resize error (e.g. not an image) and skips the upload', async () => {
      vi.mocked(resizeImageToBlob).mockRejectedValue(
        new Error('Выберите файл-изображение (JPEG, PNG или WebP).'),
      )
      const wrapper = await mountAccountView()
      const file = new File(['raw'], 'doc.pdf', { type: 'application/pdf' })

      await pickFile(wrapper, file)

      expect(wrapper.find('[role="alert"]').text()).toContain('файл-изображение')
      expect(authApi.uploadAvatar).not.toHaveBeenCalled()
      expect(wrapper.find('.account__avatar--photo').exists()).toBe(false)
    })

    it('shows the 422 message from errors.avatar when the server rejects the upload', async () => {
      vi.mocked(resizeImageToBlob).mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }))
      vi.mocked(authApi.uploadAvatar).mockRejectedValue(
        make422({ avatar: ['Файл не должен превышать 512 КБ.'] }),
      )
      const wrapper = await mountAccountView()
      const file = new File(['raw'], 'photo.png', { type: 'image/png' })

      await pickFile(wrapper, file)

      expect(wrapper.find('[role="alert"]').text()).toBe('Файл не должен превышать 512 КБ.')
      expect(useAuthStore().user?.avatar).toBeNull()
    })
  })

  describe('avatar delete', () => {
    it('deletes the avatar and falls back to the initial circle', async () => {
      vi.mocked(authApi.deleteAvatar).mockResolvedValue({ ...user, avatar: null })
      const wrapper = await mountAccountView({ ...user, avatar: AVATAR_URI })

      const buttons = wrapper.findAll('.account__photo-actions button')
      await buttons[1]!.trigger('click')
      await vi.waitFor(() =>
        expect(wrapper.find('.account__avatar--photo').exists()).toBe(false),
      )

      expect(authApi.deleteAvatar).toHaveBeenCalled()
      expect(useAuthStore().user?.avatar).toBeNull()
      expect(wrapper.find('.account__avatar').text()).toBe('И')
      expect(wrapper.text()).not.toContain('Удалить фото')
    })

    it('shows an error and keeps the avatar when the delete request fails', async () => {
      vi.mocked(authApi.deleteAvatar).mockRejectedValue(new Error('500'))
      const wrapper = await mountAccountView({ ...user, avatar: AVATAR_URI })

      const buttons = wrapper.findAll('.account__photo-actions button')
      await buttons[1]!.trigger('click')
      await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))

      expect(wrapper.find('[role="alert"]').text()).toContain('Не удалось удалить фото')
      expect(wrapper.find('.account__avatar--photo').exists()).toBe(true)
    })
  })
})
