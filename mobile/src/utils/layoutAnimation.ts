/**
 * Безопасный запуск LayoutAnimation для плавного сворачивания/разворачивания
 * сетки календаря до недели. На Android экспериментальный флаг включается
 * один раз при импорте модуля. Все вызовы обёрнуты в try/catch — в средах
 * без нативного модуля (Jest/jsdom) это не должно приводить к падению теста.
 */
import { LayoutAnimation, Platform, UIManager } from 'react-native'

const enableAndroidExperimentalLayoutAnimation = (): void => {
  if (Platform.OS !== 'android') return
  try {
    UIManager.setLayoutAnimationEnabledExperimental?.(true)
  } catch {
    // native module недоступен (например, в тестах) — игнорируем
  }
}

enableAndroidExperimentalLayoutAnimation()

/** Запускает ease-in-ease-out анимацию для следующего изменения layout. */
export const animateLayoutChange = (): void => {
  try {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
  } catch {
    // native module недоступен (например, в тестах) — игнорируем
  }
}
