import { useEffect, useState } from 'react'
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'

/**
 * Считаем устройство онлайн, если есть подключение и доступ в интернет не
 * опровергнут явно. isInternetReachable может быть null (ещё не проверено) —
 * в этом случае не блокируем синхронизацию.
 */
const isStateOnline = (state: NetInfoState): boolean =>
  state.isConnected === true && state.isInternetReachable !== false

/**
 * Подписывается на изменения статуса сети. Колбэк получает текущее значение
 * online при подписке и при каждом изменении. Возвращает функцию отписки.
 */
export const subscribeNetStatus = (
  cb: (online: boolean) => void,
): (() => void) => NetInfo.addEventListener((state) => cb(isStateOnline(state)))

/** Разовая проверка статуса сети. */
export const getIsOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch()
  return isStateOnline(state)
}

/** Реактивный статус сети для компонентов. */
export const useNetStatus = (): { isOnline: boolean } => {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => subscribeNetStatus(setIsOnline), [])

  return { isOnline }
}
