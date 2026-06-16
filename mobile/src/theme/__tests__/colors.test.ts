import { lightColors, darkColors } from '../colors'

describe('lightColors', () => {
  it('has all required keys', () => {
    const keys: Array<keyof typeof lightColors> = [
      'background', 'surface', 'text', 'textSecondary', 'accent', 'border', 'error',
    ]
    keys.forEach((key) => {
      expect(lightColors[key]).toBeDefined()
      expect(typeof lightColors[key]).toBe('string')
    })
  })

  it('background is light', () => {
    expect(lightColors.background).toBe('#f8fafc')
    expect(lightColors.surface).toBe('#ffffff')
  })
})

describe('darkColors', () => {
  it('has all required keys', () => {
    const keys: Array<keyof typeof darkColors> = [
      'background', 'surface', 'text', 'textSecondary', 'accent', 'border', 'error',
    ]
    keys.forEach((key) => {
      expect(darkColors[key]).toBeDefined()
      expect(typeof darkColors[key]).toBe('string')
    })
  })

  it('background is dark', () => {
    expect(darkColors.background).toBe('#0f172a')
  })
})
