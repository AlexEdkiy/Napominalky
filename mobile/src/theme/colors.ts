export interface ColorPalette {
  // Фоны
  screenBg: string
  appBg: string
  surface: string
  background: string

  // Акцент бирюзовый
  accent: string
  accentDark: string
  accentSoftBg: string
  accentOnSoft: string

  // Коралл
  coral: string
  coralSoftBg: string
  danger: string
  dangerSoftBg: string

  // Доп. акценты
  purple: string
  purpleBg: string
  amber: string
  amberBg: string
  noteBlue: string
  noteBlueBg: string

  // Текст
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textBody: string
  textFaint: string

  // Граница
  borderSubtle: string
  borderInput: string

  // Алиасы для обратной совместимости
  text: string
  textSecondaryAlias: string
  border: string
  error: string
}

export const lightColors: ColorPalette = {
  screenBg: '#F6F8FA',
  appBg: '#ECEEF3',
  surface: '#FFFFFF',
  background: '#F6F8FA',

  accent: '#0D9488',
  accentDark: '#0B7A6F',
  accentSoftBg: '#DDF1ED',
  accentOnSoft: '#3F9389',

  coral: '#E26A4D',
  coralSoftBg: '#FCE7E1',
  danger: '#D9583C',
  dangerSoftBg: '#FCE9E5',

  purple: '#7C6CF0',
  purpleBg: '#E9E7FB',
  amber: '#D9962A',
  amberBg: '#FBEFD6',
  noteBlue: '#4067a8',
  noteBlueBg: '#dde6f3',

  textPrimary: '#1B2733',
  textSecondary: '#76828F',
  textTertiary: '#9AA6B2',
  textBody: '#3D4A57',
  textFaint: '#C3CCD6',

  borderSubtle: '#EFF3F6',
  borderInput: '#E6ECF1',

  text: '#1B2733',
  textSecondaryAlias: '#76828F',
  border: '#EFF3F6',
  error: '#D9583C',
}

export const darkColors: ColorPalette = {
  screenBg: '#0F1923',
  appBg: '#141E28',
  surface: '#1C2A38',
  background: '#0F1923',

  accent: '#0D9488',
  accentDark: '#0B7A6F',
  accentSoftBg: '#0D2E2B',
  accentOnSoft: '#3F9389',

  coral: '#E26A4D',
  coralSoftBg: '#2E1A14',
  danger: '#D9583C',
  dangerSoftBg: '#2E1711',

  purple: '#7C6CF0',
  purpleBg: '#1E1A3C',
  amber: '#D9962A',
  amberBg: '#2E2310',
  noteBlue: '#6E8FD0',
  noteBlueBg: '#1A2740',

  textPrimary: '#E8EFF5',
  textSecondary: '#8A9BB0',
  textTertiary: '#596B7A',
  textBody: '#B8C8D8',
  textFaint: '#2E3F50',

  borderSubtle: '#1E2E3E',
  borderInput: '#253546',

  text: '#E8EFF5',
  textSecondaryAlias: '#8A9BB0',
  border: '#1E2E3E',
  error: '#D9583C',
}
