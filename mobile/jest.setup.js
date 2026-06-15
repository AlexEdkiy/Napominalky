// Глобальные моки нативных Expo-модулей для unit-тестов.
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000000'),
  digestStringAsync: jest.fn(async (_alg, data) => `hash:${data}`),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}))

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}))

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
  authenticateAsync: jest.fn(async () => ({ success: false, error: 'user_cancel' })),
}))

// Нативный expo-notifications недоступен в jsdom — мокаем планировщик.
// scheduleNotificationAsync по умолчанию возвращает фиксированный id, тесты
// могут переопределить поведение через mock-функции при необходимости.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'notif-mock'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}))
