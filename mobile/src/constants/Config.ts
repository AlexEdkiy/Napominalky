const DEFAULT_API_URL = 'http://localhost:8080'

const API_BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? DEFAULT_API_URL

export const Config = {
  API_BASE_URL,
  API_URL: API_BASE_URL,
  APP_NAME: process.env['EXPO_PUBLIC_APP_NAME'] ?? 'Reminders App',
} as const
