import { Platform } from 'react-native'

// Семейства шрифтов
// Nunito — заголовки (h1/h2), Manrope — тело
// Системные fallback если шрифты не загружены
const HEADING_FAMILY = Platform.select({
  ios: 'Nunito',
  android: 'Nunito',
  default: 'System',
})

const BODY_FAMILY = Platform.select({
  ios: 'Manrope',
  android: 'Manrope',
  default: 'System',
})

export const typography = {
  h1: {
    fontFamily: HEADING_FAMILY,
    fontSize: 32,
    fontWeight: '900' as const,
    lineHeight: 38,
  },
  h2: {
    fontFamily: HEADING_FAMILY,
    fontSize: 30,
    fontWeight: '800' as const,
    lineHeight: 36,
  },
  cardTitle: {
    fontFamily: HEADING_FAMILY,
    fontSize: 18,
    fontWeight: '800' as const,
    lineHeight: 24,
  },
  cardTitleLg: {
    fontFamily: HEADING_FAMILY,
    fontSize: 19,
    fontWeight: '800' as const,
    lineHeight: 26,
  },
  screenTitle: {
    fontFamily: HEADING_FAMILY,
    fontSize: 30,
    fontWeight: '800' as const,
    lineHeight: 36,
  },
  sectionLabel: {
    fontFamily: BODY_FAMILY,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontFamily: BODY_FAMILY,
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  bodyMd: {
    fontFamily: BODY_FAMILY,
    fontSize: 17,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: BODY_FAMILY,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  tabLabel: {
    fontFamily: BODY_FAMILY,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  buttonLabel: {
    fontFamily: BODY_FAMILY,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  inputLabel: {
    fontFamily: BODY_FAMILY,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  timeLabel: {
    fontFamily: HEADING_FAMILY,
    fontSize: 14,
    fontWeight: '800' as const,
  },
} as const

export type TypographyKey = keyof typeof typography
