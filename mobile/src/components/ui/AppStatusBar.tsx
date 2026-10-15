import { useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useTheme } from '@/theme'

/** One owner for the status bar: inactive tabs must not override the editor. */
export default function AppStatusBar(): React.JSX.Element {
  const segments: readonly string[] = useSegments()
  const { effectiveTheme } = useTheme()
  const darkHeader = segments.includes('(tabs)') || segments[0] === 'search'
    || segments[0] === 'create' || (segments[0] === 'lists' && segments[1] === 'new')
  return <StatusBar style={darkHeader || effectiveTheme === 'dark' ? 'light' : 'dark'} />
}
