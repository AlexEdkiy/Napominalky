import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAdminUsers, useAdminUser } from './useAdminUsers'
import * as adminApi from '@/api/adminApi'
import type { AdminUser } from '@/types/admin'

vi.mock('@/api/adminApi', () => ({
  fetchUsers: vi.fn(),
  fetchUser: vi.fn(),
  setUserStatus: vi.fn(),
  setUserPassword: vi.fn(),
  setUserRoles: vi.fn(),
  deleteUser: vi.fn(),
}))

const user: AdminUser = {
  uuid: 'u-1',
  name: 'Иван Иванов',
  email: 'ivan@example.com',
  is_admin: false,
  is_super_admin: false,
  is_active: true,
  sync_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
}

const paginatedResponse = {
  data: [user],
  meta: { current_page: 1, last_page: 3, per_page: 15, total: 42 },
  links: { first: null, last: null, prev: null, next: null },
}

describe('useAdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('load populates users and meta', async () => {
    vi.mocked(adminApi.fetchUsers).mockResolvedValue(paginatedResponse)

    const { users, meta, page, isLoading, load } = useAdminUsers()
    await load(1)

    expect(adminApi.fetchUsers).toHaveBeenCalledWith(1)
    expect(users.value).toHaveLength(1)
    expect(users.value[0]?.uuid).toBe('u-1')
    expect(meta.value?.total).toBe(42)
    expect(page.value).toBe(1)
    expect(isLoading.value).toBe(false)
  })

  it('nextPage increments page when not on last page', async () => {
    vi.mocked(adminApi.fetchUsers)
      .mockResolvedValueOnce(paginatedResponse)
      .mockResolvedValueOnce({ ...paginatedResponse, meta: { ...paginatedResponse.meta, current_page: 2 } })

    const { page, load, nextPage } = useAdminUsers()
    await load(1)
    await nextPage()

    expect(adminApi.fetchUsers).toHaveBeenCalledWith(2)
    expect(page.value).toBe(2)
  })

  it('nextPage does nothing when already on last page', async () => {
    const lastPageMeta = { ...paginatedResponse.meta, current_page: 3, last_page: 3 }
    const lastPageResponse = { ...paginatedResponse, meta: lastPageMeta }
    vi.mocked(adminApi.fetchUsers).mockResolvedValue(lastPageResponse)

    const { page, load, nextPage } = useAdminUsers()
    await load(3)
    await nextPage()

    expect(adminApi.fetchUsers).toHaveBeenCalledTimes(1)
    expect(page.value).toBe(3)
  })

  it('prevPage decrements page when not on first page', async () => {
    const page2Response = { ...paginatedResponse, meta: { ...paginatedResponse.meta, current_page: 2 } }
    vi.mocked(adminApi.fetchUsers)
      .mockResolvedValueOnce(page2Response)
      .mockResolvedValueOnce(paginatedResponse)

    const { page, load, prevPage } = useAdminUsers()
    await load(2)
    await prevPage()

    expect(adminApi.fetchUsers).toHaveBeenCalledWith(1)
    expect(page.value).toBe(1)
  })

  it('prevPage does nothing on first page', async () => {
    vi.mocked(adminApi.fetchUsers).mockResolvedValue(paginatedResponse)

    const { page, load, prevPage } = useAdminUsers()
    await load(1)
    await prevPage()

    expect(adminApi.fetchUsers).toHaveBeenCalledTimes(1)
    expect(page.value).toBe(1)
  })

  it('load records error message on failure', async () => {
    vi.mocked(adminApi.fetchUsers).mockRejectedValue(new Error('network error'))

    const { error, isLoading, load } = useAdminUsers()
    await load(1)

    expect(error.value).toBe('network error')
    expect(isLoading.value).toBe(false)
  })

  it('toggleStatus calls setUserStatus with uuid and updates list entry', async () => {
    vi.mocked(adminApi.fetchUsers).mockResolvedValue(paginatedResponse)
    const updatedUser: AdminUser = { ...user, is_active: false }
    vi.mocked(adminApi.setUserStatus).mockResolvedValue(updatedUser)

    const { users, load, toggleStatus } = useAdminUsers()
    await load(1)

    const result = await toggleStatus(user)

    expect(result.ok).toBe(true)
    expect(adminApi.setUserStatus).toHaveBeenCalledWith('u-1', false)
    expect(users.value[0]?.is_active).toBe(false)
  })

  it('toggleStatus returns error when API call fails', async () => {
    vi.mocked(adminApi.fetchUsers).mockResolvedValue(paginatedResponse)
    vi.mocked(adminApi.setUserStatus).mockRejectedValue(new Error('server error'))

    const { load, toggleStatus } = useAdminUsers()
    await load(1)

    const result = await toggleStatus(user)

    expect(result.ok).toBe(false)
    expect(result.error).toBe('server error')
  })
})

describe('useAdminUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('load fetches user by uuid and populates reactive state', async () => {
    const detailUser: AdminUser = {
      ...user,
      notes_count: 5,
      reminders_count: 3,
      lists_count: 1,
    }
    vi.mocked(adminApi.fetchUser).mockResolvedValue(detailUser)

    const { user: fetchedUser, isLoading, load } = useAdminUser('u-1')
    await load()

    expect(adminApi.fetchUser).toHaveBeenCalledWith('u-1')
    expect(fetchedUser.value?.uuid).toBe('u-1')
    expect(fetchedUser.value?.notes_count).toBe(5)
    expect(isLoading.value).toBe(false)
  })

  it('load records error message on failure', async () => {
    vi.mocked(adminApi.fetchUser).mockRejectedValue(new Error('forbidden'))

    const { error, isLoading, load } = useAdminUser('u-1')
    await load()

    expect(error.value).toBe('forbidden')
    expect(isLoading.value).toBe(false)
  })

  it('toggleStatus calls setUserStatus with composable uuid and updates user state', async () => {
    const activeUser: AdminUser = { ...user, is_active: true }
    vi.mocked(adminApi.fetchUser).mockResolvedValue(activeUser)
    const blockedUser: AdminUser = { ...user, is_active: false }
    vi.mocked(adminApi.setUserStatus).mockResolvedValue(blockedUser)

    const { user: storeUser, load, toggleStatus } = useAdminUser('u-1')
    await load()

    const result = await toggleStatus()

    expect(result.ok).toBe(true)
    expect(adminApi.setUserStatus).toHaveBeenCalledWith('u-1', false)
    expect(storeUser.value?.is_active).toBe(false)
  })

  it('changePassword returns ok on success', async () => {
    vi.mocked(adminApi.fetchUser).mockResolvedValue(user)
    vi.mocked(adminApi.setUserPassword).mockResolvedValue(undefined)

    const { load, changePassword } = useAdminUser('u-1')
    await load()

    const result = await changePassword('newpass1', 'newpass1')

    expect(result.ok).toBe(true)
    expect(adminApi.setUserPassword).toHaveBeenCalledWith('u-1', 'newpass1', 'newpass1')
  })

  it('updateRoles calls setUserRoles with uuid and updates user', async () => {
    vi.mocked(adminApi.fetchUser).mockResolvedValue(user)
    const adminUser: AdminUser = { ...user, is_admin: true, is_super_admin: false }
    vi.mocked(adminApi.setUserRoles).mockResolvedValue(adminUser)

    const { user: storeUser, load, updateRoles } = useAdminUser('u-1')
    await load()

    const result = await updateRoles(true, false)

    expect(result.ok).toBe(true)
    expect(adminApi.setUserRoles).toHaveBeenCalledWith('u-1', true, false)
    expect(storeUser.value?.is_admin).toBe(true)
  })

  it('removeUser calls deleteUser with uuid', async () => {
    vi.mocked(adminApi.fetchUser).mockResolvedValue(user)
    vi.mocked(adminApi.deleteUser).mockResolvedValue(undefined)

    const { load, removeUser } = useAdminUser('u-1')
    await load()

    const result = await removeUser()

    expect(result.ok).toBe(true)
    expect(adminApi.deleteUser).toHaveBeenCalledWith('u-1')
  })

  it('toggleStatus propagates API error message', async () => {
    vi.mocked(adminApi.fetchUser).mockResolvedValue(user)
    vi.mocked(adminApi.setUserStatus).mockRejectedValue(new Error('guard failed'))

    const { load, toggleStatus } = useAdminUser('u-1')
    await load()

    const result = await toggleStatus()

    expect(result.ok).toBe(false)
    expect(result.error).toBe('guard failed')
  })

  it('changePassword propagates API error message', async () => {
    vi.mocked(adminApi.fetchUser).mockResolvedValue(user)
    vi.mocked(adminApi.setUserPassword).mockRejectedValue(new Error('validation failed'))

    const { load, changePassword } = useAdminUser('u-1')
    await load()

    const result = await changePassword('short', 'short')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('validation failed')
  })

  it('updateRoles propagates API error message', async () => {
    vi.mocked(adminApi.fetchUser).mockResolvedValue(user)
    vi.mocked(adminApi.setUserRoles).mockRejectedValue(new Error('last superadmin'))

    const { load, updateRoles } = useAdminUser('u-1')
    await load()

    const result = await updateRoles(false, false)

    expect(result.ok).toBe(false)
    expect(result.error).toBe('last superadmin')
  })

  it('removeUser propagates API error message', async () => {
    vi.mocked(adminApi.fetchUser).mockResolvedValue(user)
    vi.mocked(adminApi.deleteUser).mockRejectedValue(new Error('cannot delete self'))

    const { load, removeUser } = useAdminUser('u-1')
    await load()

    const result = await removeUser()

    expect(result.ok).toBe(false)
    expect(result.error).toBe('cannot delete self')
  })
})
