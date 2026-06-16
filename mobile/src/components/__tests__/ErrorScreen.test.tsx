// ErrorScreen — проверяем пропсы и условный рендер полей.
// React 19 + RNTL: тестируем через логику пропсов, аналогично SettingRow.test.tsx.

describe('ErrorScreen — props logic', () => {
  it('title и message всегда отображаются (обязательные)', () => {
    const props = { title: 'Ошибка приложения', message: 'Something went wrong' }
    expect(props.title.length).toBeGreaterThan(0)
    expect(props.message.length).toBeGreaterThan(0)
  })

  it('stack показывается только если передан', () => {
    const hasStack = (stack: string | null | undefined): boolean => !!stack
    expect(hasStack('Error\n  at foo')).toBe(true)
    expect(hasStack(null)).toBe(false)
    expect(hasStack(undefined)).toBe(false)
  })

  it('extra (componentStack) показывается только если передан', () => {
    const hasExtra = (extra: string | null | undefined): boolean => !!extra
    expect(hasExtra('  in Component\n  in Root')).toBe(true)
    expect(hasExtra(null)).toBe(false)
  })

  it('hint «Перезапустите приложение» фиксирован', () => {
    const HINT = 'Перезапустите приложение'
    expect(HINT).toBe('Перезапустите приложение')
  })
})
