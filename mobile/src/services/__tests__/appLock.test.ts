import * as Crypto from 'expo-crypto'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

import {
  authenticateBiometric,
  clearPin,
  isBiometricAvailable,
  isPinSet,
  setPin,
  verifyPin,
} from '../appLock'

// Typed mock helpers
const mockGetItem = SecureStore.getItemAsync as jest.Mock
const mockSetItem = SecureStore.setItemAsync as jest.Mock
const mockDeleteItem = SecureStore.deleteItemAsync as jest.Mock
const mockDigest = Crypto.digestStringAsync as jest.Mock
const mockRandomUUID = Crypto.randomUUID as jest.Mock
const mockHasHardware = LocalAuthentication.hasHardwareAsync as jest.Mock
const mockIsEnrolled = LocalAuthentication.isEnrolledAsync as jest.Mock
const mockAuthenticate = LocalAuthentication.authenticateAsync as jest.Mock

/** In-memory store для сквозного тестирования setPin → verifyPin. */
const makeInMemoryStore = (): { store: Map<string, string> } => {
  const store = new Map<string, string>()
  mockGetItem.mockImplementation(async (key: string) => store.get(key) ?? null)
  mockSetItem.mockImplementation(async (key: string, value: string) => {
    store.set(key, value)
  })
  mockDeleteItem.mockImplementation(async (key: string) => {
    store.delete(key)
  })
  return { store }
}

/** Детерминированный digest: возвращает `sha256:${data}`. */
const useDeterministicDigest = (): void => {
  mockDigest.mockImplementation(async (_alg: string, data: string) => `sha256:${data}`)
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── setPin ────────────────────────────────────────────────────────────────

describe('setPin', () => {
  it('вызывает digestStringAsync с SHA256 и конкатенацией salt+pin', async () => {
    makeInMemoryStore()
    mockRandomUUID.mockReturnValue('test-salt-uuid')
    useDeterministicDigest()

    await setPin('1234')

    expect(mockDigest).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      'test-salt-uuid1234',
    )
  })

  it('соль берётся из randomUUID', async () => {
    makeInMemoryStore()
    mockRandomUUID.mockReturnValue('my-unique-salt')
    useDeterministicDigest()

    await setPin('5678')

    expect(mockRandomUUID).toHaveBeenCalledTimes(1)
    expect(mockDigest).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      'my-unique-salt5678',
    )
  })

  it('сохраняет запись в secure-store под ключом app_lock_pin', async () => {
    makeInMemoryStore()
    mockRandomUUID.mockReturnValue('salt-abc')
    useDeterministicDigest()

    await setPin('0000')

    expect(mockSetItem).toHaveBeenCalledWith(
      'app_lock_pin',
      expect.any(String),
    )
  })

  it('сохранённая строка содержит salt и hash в JSON', async () => {
    makeInMemoryStore()
    mockRandomUUID.mockReturnValue('salt-xyz')
    useDeterministicDigest()

    await setPin('9999')

    const saved: string = mockSetItem.mock.calls[0]?.[1] as string
    const parsed: unknown = JSON.parse(saved)
    expect(parsed).toMatchObject({
      salt: 'salt-xyz',
      hash: 'sha256:salt-xyz9999',
    })
  })

  it('PIN в открытом виде НЕ хранится как поле JSON (только соль и хеш)', async () => {
    makeInMemoryStore()
    mockRandomUUID.mockReturnValue('salt-sec')
    useDeterministicDigest()

    const pin = 'secret1234'
    await setPin(pin)

    const saved: string = mockSetItem.mock.calls[0]?.[1] as string
    const parsed = JSON.parse(saved) as Record<string, unknown>
    // Запись содержит ровно два поля: salt и hash — PIN как отдельного поля нет
    expect(Object.keys(parsed).sort()).toEqual(['hash', 'salt'])
    expect(parsed['salt']).not.toBe(pin)
    expect(parsed['hash']).not.toBe(pin)
  })
})

// ─── verifyPin ─────────────────────────────────────────────────────────────

describe('verifyPin', () => {
  it('верный PIN возвращает true (сквозной тест setPin → verifyPin)', async () => {
    makeInMemoryStore()
    mockRandomUUID.mockReturnValue('common-salt')
    useDeterministicDigest()

    await setPin('4242')
    const result = await verifyPin('4242')

    expect(result).toBe(true)
  })

  it('неверный PIN возвращает false', async () => {
    makeInMemoryStore()
    mockRandomUUID.mockReturnValue('common-salt')
    useDeterministicDigest()

    await setPin('4242')
    const result = await verifyPin('9999')

    expect(result).toBe(false)
  })

  it('нет записи в secure-store (getItemAsync → null) → false', async () => {
    mockGetItem.mockResolvedValue(null)

    const result = await verifyPin('1234')

    expect(result).toBe(false)
  })

  it('повреждённый JSON → false и не бросает', async () => {
    mockGetItem.mockResolvedValue('{ invalid json ~~~')

    await expect(verifyPin('1234')).resolves.toBe(false)
  })

  it('валидный JSON без нужных полей → false и не бросает', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ foo: 'bar' }))

    await expect(verifyPin('1234')).resolves.toBe(false)
  })
})

// ─── isPinSet ──────────────────────────────────────────────────────────────

describe('isPinSet', () => {
  it('есть запись в secure-store → true', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ salt: 's', hash: 'h' }))

    expect(await isPinSet()).toBe(true)
  })

  it('getItemAsync возвращает null → false', async () => {
    mockGetItem.mockResolvedValue(null)

    expect(await isPinSet()).toBe(false)
  })
})

// ─── clearPin ──────────────────────────────────────────────────────────────

describe('clearPin', () => {
  it('вызывает deleteItemAsync с ключом app_lock_pin', async () => {
    mockDeleteItem.mockResolvedValue(undefined)

    await clearPin()

    expect(mockDeleteItem).toHaveBeenCalledWith('app_lock_pin')
    expect(mockDeleteItem).toHaveBeenCalledTimes(1)
  })
})

// ─── isBiometricAvailable ──────────────────────────────────────────────────

describe('isBiometricAvailable', () => {
  it('hasHardware=true, enrolled=true → true', async () => {
    mockHasHardware.mockResolvedValue(true)
    mockIsEnrolled.mockResolvedValue(true)

    expect(await isBiometricAvailable()).toBe(true)
  })

  it('hasHardware=false → false (enrolled не проверяется)', async () => {
    mockHasHardware.mockResolvedValue(false)
    mockIsEnrolled.mockResolvedValue(true)

    expect(await isBiometricAvailable()).toBe(false)
    expect(mockIsEnrolled).not.toHaveBeenCalled()
  })

  it('hasHardware=true, enrolled=false → false', async () => {
    mockHasHardware.mockResolvedValue(true)
    mockIsEnrolled.mockResolvedValue(false)

    expect(await isBiometricAvailable()).toBe(false)
  })
})

// ─── authenticateBiometric ─────────────────────────────────────────────────

describe('authenticateBiometric', () => {
  it('authenticateAsync с success:true → true', async () => {
    mockAuthenticate.mockResolvedValue({ success: true })

    expect(await authenticateBiometric()).toBe(true)
  })

  it('authenticateAsync с success:false → false', async () => {
    mockAuthenticate.mockResolvedValue({ success: false, error: 'user_cancel' })

    expect(await authenticateBiometric()).toBe(false)
  })

  it('передаёт promptMessage в authenticateAsync', async () => {
    mockAuthenticate.mockResolvedValue({ success: true })

    await authenticateBiometric()

    expect(mockAuthenticate).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: expect.any(String) }),
    )
  })
})
