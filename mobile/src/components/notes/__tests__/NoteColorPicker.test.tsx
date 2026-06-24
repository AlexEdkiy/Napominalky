jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

import NoteColorPicker from '../NoteColorPicker'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  const MaterialIcons = ({ name }: { name: string }) => (
    <View testID={`mi-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons, MaterialIcons }
})

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#fff',
      borderInput: '#ddd',
      textTertiary: '#999',
    },
  }),
}))

describe('NoteColorPicker', () => {
  it('рендерит 5 цветовых свотчей (4 hex + null)', async () => {
    const { getAllByRole } = await render(
      <NoteColorPicker value={null} onChange={jest.fn()} />,
    )
    expect(getAllByRole('radio')).toHaveLength(5)
  })

  it('свотч #ea899a присутствует', async () => {
    const { getByLabelText } = await render(
      <NoteColorPicker value={null} onChange={jest.fn()} />,
    )
    expect(getByLabelText('#ea899a')).toBeTruthy()
  })

  it('свотч #ffebb8 присутствует', async () => {
    const { getByLabelText } = await render(
      <NoteColorPicker value={null} onChange={jest.fn()} />,
    )
    expect(getByLabelText('#ffebb8')).toBeTruthy()
  })

  it('свотч #91d177 присутствует', async () => {
    const { getByLabelText } = await render(
      <NoteColorPicker value={null} onChange={jest.fn()} />,
    )
    expect(getByLabelText('#91d177')).toBeTruthy()
  })

  it('свотч #afdafc присутствует', async () => {
    const { getByLabelText } = await render(
      <NoteColorPicker value={null} onChange={jest.fn()} />,
    )
    expect(getByLabelText('#afdafc')).toBeTruthy()
  })

  it('свотч «без цвета» присутствует', async () => {
    const { getByLabelText } = await render(
      <NoteColorPicker value={null} onChange={jest.fn()} />,
    )
    expect(getByLabelText('без цвета')).toBeTruthy()
  })

  it('вызывает onChange с выбранным цветом при нажатии', async () => {
    const onChange = jest.fn()
    const { getByLabelText } = await render(
      <NoteColorPicker value={null} onChange={onChange} />,
    )
    fireEvent.press(getByLabelText('#ea899a'))
    expect(onChange).toHaveBeenCalledWith('#ea899a')
  })

  it('вызывает onChange с null при нажатии «без цвета»', async () => {
    const onChange = jest.fn()
    const { getByLabelText } = await render(
      <NoteColorPicker value={'#ea899a'} onChange={onChange} />,
    )
    fireEvent.press(getByLabelText('без цвета'))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('выбранный цвет имеет selected=true', async () => {
    const { getByLabelText } = await render(
      <NoteColorPicker value={'#91d177'} onChange={jest.fn()} />,
    )
    const swatch = getByLabelText('#91d177')
    expect(swatch.props.accessibilityState?.selected).toBe(true)
  })

  it('невыбранный цвет имеет selected=false', async () => {
    const { getByLabelText } = await render(
      <NoteColorPicker value={'#91d177'} onChange={jest.fn()} />,
    )
    const swatch = getByLabelText('#ea899a')
    expect(swatch.props.accessibilityState?.selected).toBe(false)
  })

  it('показывает checkmark на активном цветном свотче', async () => {
    const { getByTestId } = await render(
      <NoteColorPicker value={'#ea899a'} onChange={jest.fn()} />,
    )
    expect(getByTestId('icon-checkmark')).toBeTruthy()
  })
})
