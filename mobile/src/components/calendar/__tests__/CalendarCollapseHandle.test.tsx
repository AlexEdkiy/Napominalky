jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native')
  const Ionicons = ({ name, style }: { name: string; style?: unknown }) => (
    <View testID={`icon-${name}`} style={style} />
  )
  return { Ionicons }
})

import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'

import CalendarCollapseHandle from '../CalendarCollapseHandle'

describe('CalendarCollapseHandle', () => {
  it('тап по ручке вызывает onToggle', async () => {
    const onToggle = jest.fn()
    const { getByRole } = await render(
      <CalendarCollapseHandle collapsed={false} onToggle={onToggle} />,
    )
    fireEvent.press(getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('в развёрнутом состоянии accessibilityState.expanded=true, шеврон не повёрнут', async () => {
    const { getByRole, getByTestId } = await render(
      <CalendarCollapseHandle collapsed={false} onToggle={jest.fn()} />,
    )
    expect(getByRole('button').props.accessibilityState.expanded).toBe(true)
    const chevronStyle = getByTestId('icon-chevron-up').props.style
    expect(chevronStyle).toEqual({ transform: [{ rotate: '0deg' }] })
  })

  it('в свёрнутом состоянии accessibilityState.expanded=false, шеврон повёрнут на 180deg', async () => {
    const { getByRole, getByTestId } = await render(
      <CalendarCollapseHandle collapsed onToggle={jest.fn()} />,
    )
    expect(getByRole('button').props.accessibilityState.expanded).toBe(false)
    const chevronStyle = getByTestId('icon-chevron-up').props.style
    expect(chevronStyle).toEqual({ transform: [{ rotate: '180deg' }] })
  })
})
