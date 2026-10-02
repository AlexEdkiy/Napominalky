import { shallowRef, watch } from 'vue'
import type { CSSProperties, Ref } from 'vue'

/** Клавиатура может уменьшать только visual viewport, оставляя fixed inset:0 за ней. */
export function useLkDialogViewport(enabled: Ref<boolean>): {
  viewportStyle: Ref<CSSProperties | undefined>
} {
  const viewportStyle = shallowRef<CSSProperties>()

  watch(enabled, (active, _previous, onCleanup) => {
    viewportStyle.value = undefined
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null
    if (!active || !viewport) return

    function update(): void {
      if (!viewport || viewport.height <= 0) return
      viewportStyle.value = {
        top: `${viewport.offsetTop}px`,
        height: `${viewport.height}px`,
        bottom: 'auto',
      }
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    onCleanup(() => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      viewportStyle.value = undefined
    })
  }, { immediate: true })

  return { viewportStyle }
}
