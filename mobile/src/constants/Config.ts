export const Config = {
  API_URL: process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:8080',
  APP_NAME: process.env['EXPO_PUBLIC_APP_NAME'] ?? 'Reminders App',
} as const
