import * as Crypto from 'expo-crypto'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

/** Ключи для хранения данных в expo-secure-store. */
const SECURE_KEY_PIN = 'app_lock_pin'

const BIOMETRIC_PROMPT = 'Подтвердите личность для входа в приложение'

interface PinRecord {
  salt: string
  hash: string
}

/** Сериализует PinRecord в строку для secure-store. */
const encodePinRecord = (record: PinRecord): string => JSON.stringify(record)

/** Десериализует PinRecord из строки secure-store. Бросает при невалидном JSON. */
const decodePinRecord = (raw: string): PinRecord => {
  const parsed: unknown = JSON.parse(raw)
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>)['salt'] !== 'string' ||
    typeof (parsed as Record<string, unknown>)['hash'] !== 'string'
  ) {
    throw new Error('Invalid PIN record format')
  }
  return parsed as PinRecord
}

/** Вычисляет SHA-256 хеш строки salt+pin. */
const hashPin = (salt: string, pin: string): Promise<string> =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + pin)

/**
 * Сохраняет PIN в secure-store в виде {salt, hash}.
 * PIN никогда не хранится в открытом виде.
 * Соль — случайный UUID v4 (expo-crypto).
 */
export const setPin = async (pin: string): Promise<void> => {
  const salt = Crypto.randomUUID()
  const hash = await hashPin(salt, pin)
  const record: PinRecord = { salt, hash }
  await SecureStore.setItemAsync(SECURE_KEY_PIN, encodePinRecord(record))
}

/**
 * Проверяет PIN против сохранённого хеша.
 * Возвращает false, если PIN не установлен или не совпадает.
 */
export const verifyPin = async (pin: string): Promise<boolean> => {
  const raw = await SecureStore.getItemAsync(SECURE_KEY_PIN)
  if (raw === null) return false

  try {
    const { salt, hash } = decodePinRecord(raw)
    const candidate = await hashPin(salt, pin)
    return candidate === hash
  } catch {
    return false
  }
}

/** Проверяет, установлен ли PIN (есть ли запись в secure-store). */
export const isPinSet = async (): Promise<boolean> => {
  const raw = await SecureStore.getItemAsync(SECURE_KEY_PIN)
  return raw !== null
}

/** Удаляет PIN из secure-store (отключение блокировки). */
export const clearPin = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SECURE_KEY_PIN)
}

/**
 * Проверяет доступность биометрии: устройство поддерживает и данные зарегистрированы.
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync()
  if (!hasHardware) return false
  return LocalAuthentication.isEnrolledAsync()
}

/**
 * Запускает биометрическую аутентификацию.
 * Возвращает true при успехе, false при отказе или ошибке.
 */
export const authenticateBiometric = async (): Promise<boolean> => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: BIOMETRIC_PROMPT,
  })
  return result.success
}
