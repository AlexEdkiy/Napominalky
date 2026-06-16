import React, {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { useColorScheme } from 'react-native'

import { useSettingsStore, type Theme } from '@/stores/settingsStore'
import {
  darkColors,
  lightColors,
  type ColorPalette,
} from '@/theme/colors'

interface ThemeContextValue {
  colors: ColorPalette
  effectiveTheme: 'light' | 'dark'
  selectedTheme: Theme
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  effectiveTheme: 'light',
  selectedTheme: 'system',
})

interface ThemeProviderProps {
  children: ReactNode
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const selectedTheme = useSettingsStore((s) => s.theme)
  const systemScheme = useColorScheme()

  const effectiveTheme: 'light' | 'dark' = resolveTheme(selectedTheme, systemScheme)
  const colors = effectiveTheme === 'dark' ? darkColors : lightColors

  return (
    <ThemeContext.Provider value={{ colors, effectiveTheme, selectedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

function resolveTheme(
  selected: Theme,
  system: ReturnType<typeof useColorScheme>,
): 'light' | 'dark' {
  if (selected === 'system') {
    return system === 'dark' ? 'dark' : 'light'
  }
  return selected
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

export default ThemeProvider
