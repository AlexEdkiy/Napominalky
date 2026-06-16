// globalErrorHandler — тестируем installGlobalErrorHandler через мок ErrorUtils.

interface MockErrorUtils {
  getGlobalHandler: jest.Mock
  setGlobalHandler: jest.Mock
}

declare const ErrorUtils: MockErrorUtils

// Мокируем глобальный ErrorUtils — в тестовой среде его нет
const mockPreviousHandler = jest.fn()
const mockSetGlobalHandler = jest.fn()
const mockGetGlobalHandler = jest.fn(() => mockPreviousHandler)

// Устанавливаем ErrorUtils в global до импорта модуля
;(global as Record<string, unknown>)['ErrorUtils'] = {
  getGlobalHandler: mockGetGlobalHandler,
  setGlobalHandler: mockSetGlobalHandler,
}

import { installGlobalErrorHandler } from '../globalErrorHandler'

describe('installGlobalErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetGlobalHandler.mockReturnValue(mockPreviousHandler)
  })

  it('вызывает setGlobalHandler с новым обработчиком', () => {
    const onError = jest.fn()
    installGlobalErrorHandler(onError)
    expect(mockSetGlobalHandler).toHaveBeenCalledTimes(1)
    expect(typeof mockSetGlobalHandler.mock.calls[0]?.[0]).toBe('function')
  })

  it('новый обработчик вызывает onError с ошибкой', () => {
    const onError = jest.fn()
    installGlobalErrorHandler(onError)

    const installedHandler: (error: Error, isFatal?: boolean) => void =
      mockSetGlobalHandler.mock.calls[0]?.[0]

    const error = new Error('uncaught')
    installedHandler(error, true)

    expect(onError).toHaveBeenCalledWith(error, true)
  })

  it('новый обработчик передаёт управление предыдущему', () => {
    const onError = jest.fn()
    installGlobalErrorHandler(onError)

    const installedHandler: (error: Error, isFatal?: boolean) => void =
      mockSetGlobalHandler.mock.calls[0]?.[0]

    const error = new Error('uncaught')
    installedHandler(error, false)

    expect(mockPreviousHandler).toHaveBeenCalledWith(error, false)
  })

  it('isFatal defaults to false when undefined', () => {
    const onError = jest.fn()
    installGlobalErrorHandler(onError)

    const installedHandler: (error: Error, isFatal?: boolean) => void =
      mockSetGlobalHandler.mock.calls[0]?.[0]

    const error = new Error('crash')
    installedHandler(error, undefined)

    expect(onError).toHaveBeenCalledWith(error, false)
  })

  it('возвращает деинсталлятор, восстанавливающий предыдущий handler', () => {
    const onError = jest.fn()
    const uninstall = installGlobalErrorHandler(onError)

    jest.clearAllMocks()
    mockGetGlobalHandler.mockReturnValue(mockPreviousHandler)

    uninstall()
    expect(mockSetGlobalHandler).toHaveBeenCalledWith(mockPreviousHandler)
  })
})
