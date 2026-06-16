export interface ColorPalette {
  background: string
  surface: string
  text: string
  textSecondary: string
  accent: string
  border: string
  error: string
}

export const lightColors: ColorPalette = {
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#6a6a6a',
  accent: '#2563eb',
  border: '#e2e8f0',
  error: '#b00020',
}

export const darkColors: ColorPalette = {
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  accent: '#3b82f6',
  border: '#334155',
  error: '#ef4444',
}
