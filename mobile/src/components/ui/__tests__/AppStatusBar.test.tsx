let mockSegments: string[] = ['(tabs)']
let mockTheme = 'light'
jest.mock('expo-router', () => ({ useSegments: () => mockSegments }))
jest.mock('@/theme', () => ({ useTheme: () => ({ effectiveTheme: mockTheme }) }))
jest.mock('expo-status-bar', () => ({ StatusBar: ({ style }: { style: string }) => {
  const { Text } = require('react-native')
  return <Text>{style}</Text>
} }))
import React from 'react'
import { render } from '@testing-library/react-native'
import AppStatusBar from '../AppStatusBar'

it('uses dark system icons in a light list editor and restores light icons when returning home', async () => {
  const view = await render(<AppStatusBar />)
  expect(view.getByText('light')).toBeTruthy()
  mockSegments = ['lists', '[uuid]']
  await view.rerender(<AppStatusBar />)
  expect(view.getByText('dark')).toBeTruthy()
  mockTheme = 'dark'
  await view.rerender(<AppStatusBar />)
  expect(view.getByText('light')).toBeTruthy()
  mockTheme = 'light'
  mockSegments = ['(tabs)']
  await view.rerender(<AppStatusBar />)
  expect(view.getByText('light')).toBeTruthy()
})
