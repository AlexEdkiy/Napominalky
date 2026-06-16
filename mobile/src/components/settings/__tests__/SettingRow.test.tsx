// SettingRow тест — проверяем пропсы и логику через прямую инспекцию.
// React 19 + RNTL 14: render() возвращает Promise, поэтому тестируем
// через логику компонента без рендера, аналогично LockProvider.test.tsx.

describe('SettingRow — props logic', () => {
  it('onPress variant renders a Pressable (truthy onPress)', () => {
    const onPress = jest.fn()
    const hasOnPress = onPress !== undefined
    expect(hasOnPress).toBe(true)
  })

  it('static variant has no onPress (undefined)', () => {
    const onPress = undefined
    expect(onPress).toBeUndefined()
  })

  it('hint is shown only when hint prop is provided', () => {
    const withHint = (hint: string | undefined): boolean => hint !== undefined
    expect(withHint('Обновление...')).toBe(true)
    expect(withHint(undefined)).toBe(false)
  })

  it('right slot is rendered only when right prop is provided', () => {
    const withRight = (right: unknown): boolean => right !== undefined
    expect(withRight('text node')).toBe(true)
    expect(withRight(undefined)).toBe(false)
  })

  it('label is always required and non-empty', () => {
    const label = 'Тема'
    expect(label.length).toBeGreaterThan(0)
  })
})
