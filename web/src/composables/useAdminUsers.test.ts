import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAdminUsers, useAdminUser } from './useAdminUsers'
import * as adminApi from '@/api/adminApi'
import type { AdminUser } from '@/types/admin'

vi.mock('@/api/adminApi', () => ({
  fetchUsers: vi.fn(),
  fetchUser: vi.fn(),
}))

const user: AdminUser = {
  uuid: 'u-1',
  name: 'Иван Иванов',
  email: 'ivan@example.com',
  is_admin: false,
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
})

describe('useAdminUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('load fetches user by id and populates reactive state', async () => {
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
})
