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
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}))

// expo-linear-gradient недоступен в jsdom — проходной View.
jest.mock('expo-linear-gradient', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    LinearGradient: ({ children, ...props }) =>
      React.createElement(View, { testID: 'linear-gradient', ...props }, children),
  }
})

// react-native-svg недоступен в jsdom — Svg/Circle/G/Path превращаются в проходной View.
jest.mock('react-native-svg', () => {
  const React = require('react')
  const { View } = require('react-native')
  const passThrough = (testID) => {
    const Component = ({ children, ...props }) =>
      React.createElement(View, { testID, ...props }, children)
    return Component
  }
  return {
    __esModule: true,
    default: passThrough('svg'),
    Svg: passThrough('svg'),
    Circle: passThrough('svg-circle'),
    G: passThrough('svg-g'),
    Path: passThrough('svg-path'),
  }
})

// SafeAreaProvider недоступен в jsdom — отдаём нулевые инсеты и проходные компоненты.
// Отдельные тесты могут переопределить мок через jest.mock в своём файле.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react')
  const insets = { top: 0, bottom: 0, left: 0, right: 0 }
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children }) => React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 0, height: 0 }),
  }
})
