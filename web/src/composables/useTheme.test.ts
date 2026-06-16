import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSettingsStore } from '@/stores/settingsStore'

// useTheme вызывает window.matchMedia — мокируем до импорта модуля
const mockMatches = vi.fn(() => false)
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn(() => ({
    matches: mockMatches(),
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  })),
})

// Импортируем после мока
const { useTheme } = await import('./useTheme')

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
    vi.clearAllMocks()
  })

  it('applyTheme sets theme-light class and data-theme=light for light theme', () => {
    const settings = useSettingsStore()
    settings.setTheme('light')

    const { applyTheme } = useTheme()
    applyTheme()

    expect(document.documentElement.classList.contains('theme-light')).toBe(true)
    expect(document.documentElement.classList.contains('theme-dark')).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('applyTheme sets theme-dark class and data-theme=dark for dark theme', () => {
    const settings = useSettingsStore()
    settings.setTheme('dark')

    const { applyTheme } = useTheme()
    applyTheme()

    expect(document.documentElement.classList.contains('theme-dark')).toBe(true)
    expect(document.documentElement.classList.contains('theme-light')).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('applyTheme uses prefers-color-scheme for system theme when dark preferred', () => {
    mockMatches.mockReturnValue(true)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      })),
    })

    const settings = useSettingsStore()
    settings.setTheme('system')

    const { applyTheme } = useTheme()
    applyTheme()

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('effectiveScheme returns correct value for explicit themes', () => {
    const settings = useSettingsStore()
    settings.setTheme('dark')

    const { effectiveScheme } = useTheme()
    expect(effectiveScheme.value).toBe('dark')
  })

  it('applyTheme attaches media listener for system theme', () => {
    const settings = useSettingsStore()
    settings.setTheme('system')

    const { applyTheme } = useTheme()
    applyTheme()

    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('applyTheme does not attach media listener for explicit themes', () => {
    const settings = useSettingsStore()
    settings.setTheme('light')

    const { applyTheme } = useTheme()
    applyTheme()

    expect(mockAddEventListener).not.toHaveBeenCalled()
  })
})
