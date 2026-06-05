// Глобальные моки нативных Expo-модулей для unit-тестов.
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000000'),
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
