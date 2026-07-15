import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import AccountView from './AccountView.vue'
import { authApi } from '@/api/authApi'
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

  it('keeps email read-only (no email input anywhere)', async () => {
    const wrapper = await mountAccountView()

    expect(wrapper.find('input[type="email"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('ivan@example.com')
  })

  describe('name editing', () => {
    it('opens the edit form prefilled with the current name and saves via the API', async () => {
      vi.mocked(authApi.updateProfile).mockResolvedValue({ ...user, name: 'Пётр' })
      const wrapper = await mountAccountView()

      await wrapper.find('.account__name-view button').trigger('click')
      const input = wrapper.find('.account__input')
      expect((input.element as HTMLInputElement).value).toBe('Иван')

      await input.setValue('Пётр')
      await wrapper.find('.account__name-form').trigger('submit')
      await vi.waitFor(() => expect(wrapper.find('.account__name-form').exists()).toBe(false))

      expect(authApi.updateProfile).toHaveBeenCalledWith('Пётр')
      expect(useAuthStore().user?.name).toBe('Пётр')
      expect(wrapper.find('.account__name').text()).toBe('Пётр')
    })

    it('rejects an empty name locally without calling the API', async () => {
      const wrapper = await mountAccountView()

      await wrapper.find('.account__name-view button').trigger('click')
      await wrapper.find('.account__input').setValue('   ')
      await wrapper.find('.account__name-form').trigger('submit')

      expect(wrapper.find('.account__field-error').text()).toBe('Введите имя.')
      expect(authApi.updateProfile).not.toHaveBeenCalled()
    })

    it('shows the 422 message from errors.name under the field', async () => {
      vi.mocked(authApi.updateProfile).mockRejectedValue(
        make422({ name: ['Имя слишком длинное.'] }),
      )
      const wrapper = await mountAccountView()

      await wrapper.find('.account__name-view button').trigger('click')
      await wrapper.find('.account__input').setValue('Пётр')
      await wrapper.find('.account__name-form').trigger('submit')
      await vi.waitFor(() =>
        expect(wrapper.find('.account__field-error').exists()).toBe(true),
      )

      expect(wrapper.find('.account__field-error').text()).toBe('Имя слишком длинное.')
      expect(wrapper.find('.account__name-form').exists()).toBe(true)
    })

    it('cancel restores the read-only view without saving', async () => {
      const wrapper = await mountAccountView()

      await wrapper.find('.account__name-view button').trigger('click')
      await wrapper.find('.account__input').setValue('Другой')
      const buttons = wrapper.findAll('.account__name-form button')
      await buttons[1]!.trigger('click')

      expect(wrapper.find('.account__name-form').exists()).toBe(false)
      expect(authApi.updateProfile).not.toHaveBeenCalled()
      expect(wrapper.find('.account__name').text()).toBe('Иван')
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
