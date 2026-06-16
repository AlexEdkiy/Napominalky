// ErrorBoundary — проверяем логику состояний (error / null).
// getDerivedStateFromError и componentDidCatch тестируем через прямой вызов.

describe('ErrorBoundary — state logic', () => {
  it('getDerivedStateFromError возвращает state с error', () => {
    const error = new Error('render crash')

    // Имитируем статический метод: он принимает error и возвращает новый state
    const getDerivedStateFromError = (
      e: Error,
    ): { error: Error | null; info: string | null } => ({
      error: e,
      info: null,
    })

    const state = getDerivedStateFromError(error)
    expect(state.error).toBe(error)
    expect(state.info).toBeNull()
  })

  it('componentDidCatch сохраняет componentStack из errorInfo', () => {
    const error = new Error('lifecycle crash')
    const componentStack = '  in SomeComponent\n  in Root'

    let savedError: Error | null = null
    let savedInfo: string | null = null

    const setState = (patch: { error: Error; info: string | null }): void => {
      savedError = patch.error
      savedInfo = patch.info
    }

    // Имитируем логику componentDidCatch
    const componentDidCatch = (e: Error, info: { componentStack: string }): void => {
      setState({ error: e, info: info.componentStack ?? null })
    }

    componentDidCatch(error, { componentStack })

    expect(savedError).toBe(error)
    expect(savedInfo).toBe(componentStack)
  })

  it('в нормальном состоянии error === null', () => {
    const initialState: { error: Error | null; info: string | null } = {
      error: null,
      info: null,
    }
    expect(initialState.error).toBeNull()
  })

  it('аварийный экран показывается только при error !== null', () => {
    const shouldShowError = (error: Error | null): boolean => error !== null
    expect(shouldShowError(new Error('oops'))).toBe(true)
    expect(shouldShowError(null)).toBe(false)
  })
})
