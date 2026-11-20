import { t } from '@/i18n'
import { useState } from 'react'

interface PinSetupState {
  pin: string
  confirm: string
  error: string | null
  setPin: (value: string) => void
  setConfirm: (value: string) => void
  validate: () => boolean
  reset: () => void
}

const PIN_MIN_LENGTH = 4
const PIN_MAX_LENGTH = 6
const PIN_DIGIT_RE = /^\d*$/

export function usePinSetup(): PinSetupState {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSetPin = (value: string): void => {
    if (PIN_DIGIT_RE.test(value) && value.length <= PIN_MAX_LENGTH) {
      setPin(value)
      setError(null)
    }
  }

  const handleSetConfirm = (value: string): void => {
    if (PIN_DIGIT_RE.test(value) && value.length <= PIN_MAX_LENGTH) {
      setConfirm(value)
      setError(null)
    }
  }

  const validate = (): boolean => {
    if (pin.length < PIN_MIN_LENGTH) {
      setError(t("PIN должен содержать минимум {0} цифры", [PIN_MIN_LENGTH]))
      return false
    }
    if (pin !== confirm) {
      setError(t("PIN-коды не совпадают"))
      return false
    }
    return true
  }

  const reset = (): void => {
    setPin('')
    setConfirm('')
    setError(null)
  }

  return { pin, confirm, error, setPin: handleSetPin, setConfirm: handleSetConfirm, validate, reset }
}
