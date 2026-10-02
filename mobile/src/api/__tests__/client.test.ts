import { AxiosError, AxiosHeaders } from 'axios'
import { apiClient } from '../client'
import { useAuthStore } from '@/stores/authStore'

it('a late 401 for an old session cannot log out the current account', async () => {
  useAuthStore.setState({ token: 'current-token' })
  await expect(apiClient.get('fixture', { headers: { Authorization: 'Bearer old-token' }, adapter: async (config) => {
    expect(config.headers.Authorization).toBe('Bearer old-token')
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, { status: 401, data: {}, statusText: 'Unauthorized', headers: new AxiosHeaders(), config })
  } })).rejects.toThrow('Unauthorized')
  expect(useAuthStore.getState().token).toBe('current-token')
})
it('401 for the current token invalidates the session immediately', async () => {
  useAuthStore.setState({ token: 'current-token' })
  await expect(apiClient.get('fixture', { adapter: async (config) => {
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, { status: 401, data: {}, statusText: 'Unauthorized', headers: new AxiosHeaders(), config })
  } })).rejects.toThrow('Unauthorized')
  expect(useAuthStore.getState().token).toBeNull()
})
