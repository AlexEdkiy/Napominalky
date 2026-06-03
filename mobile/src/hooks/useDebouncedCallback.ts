import { useEffect, useMemo, useRef } from 'react'

/**
 * Возвращает функцию, откладывающую вызов `callback` на `delay` мс.
 * Таймер сбрасывается при каждом вызове; очищается при размонтировании.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
): (...args: Args) => void {
  const callbackRef = useRef(callback)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  return useMemo(
    () =>
      (...args: Args): void => {
        if (timerRef.current !== null) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => callbackRef.current(...args), delay)
      },
    [delay],
  )
}
