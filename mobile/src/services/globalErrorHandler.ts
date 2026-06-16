/**
 * Глобальный перехватчик необработанных ошибок React Native.
 * Оборачивает ErrorUtils.getGlobalHandler / setGlobalHandler, чтобы
 * поймать ошибки из async-функций и useEffect, не перехваченные
 * React Error Boundary.
 */

/** Сигнатура стандартного RN-обработчика ошибок. */
type RNErrorHandler = (error: Error, isFatal?: boolean) => void

/** Минимальный контракт глобального ErrorUtils в React Native. */
interface ErrorUtilsInterface {
  getGlobalHandler(): RNErrorHandler
  setGlobalHandler(callback: RNErrorHandler): void
}

declare const ErrorUtils: ErrorUtilsInterface

/**
 * Устанавливает глобальный обработчик необработанных ошибок.
 * Вызывает `onError` с ошибкой, затем передаёт управление
 * предыдущему обработчику (чтобы не нарушить дефолтное поведение RN).
 *
 * @param onError - коллбэк вызываемый при поимке ошибки
 * @returns функция-деинсталлятор (для cleanup в useEffect)
 */
export function installGlobalErrorHandler(
  onError: (error: Error, isFatal: boolean) => void,
): () => void {
  const previousHandler = ErrorUtils.getGlobalHandler()

  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    onError(error, isFatal ?? false)
    previousHandler(error, isFatal)
  })

  return () => {
    ErrorUtils.setGlobalHandler(previousHandler)
  }
}
