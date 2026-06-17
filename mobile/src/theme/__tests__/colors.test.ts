import { lightColors, darkColors } from '../colors'

describe('lightColors', () => {
  it('has all required keys', () => {
    const keys: Array<keyof typeof lightColors> = [
      'background', 'surface', 'text', 'border', 'error',
      'accent', 'textSecondary',
    ]
    keys.forEach((key) => {
      expect(lightColors[key]).toBeDefined()
      expect(typeof lightColors[key]).toBe('string')
    })
  })

  it('has correct accent color', () => {
    expect(lightColors.accent).toBe('#0D9488')
    expect(lightColors.surface).toBe('#FFFFFF')
  })
})

describe('darkColors', () => {
  it('has all required keys', () => {
    const keys: Array<keyof typeof darkColors> = [
      'background', 'surface', 'text', 'border', 'error',
      'accent', 'textSecondary',
    ]
    keys.forEach((key) => {
      expect(darkColors[key]).toBeDefined()
      expect(typeof darkColors[key]).toBe('string')
    })
  })

  it('background is dark', () => {
    expect(darkColors.background).toBe('#0F1923')
    expect(darkColors.accent).toBe('#0D9488')
  })
})
