// Тесты UI-fidelity для ProgressRing (прогресс-кольцо с %)
jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { render } from '@testing-library/react-native'

import ProgressRing from '../ProgressRing'

describe('ProgressRing — соответствие макету', () => {
  it('отображает процент завершения', async () => {
    const { getByText } = await render(
      <ProgressRing value={2} total={4} color="#0EA5A0" size={52} />,
    )
    expect(getByText('50%')).toBeTruthy()
  })

  it('отображает 0% при пустом списке', async () => {
    const { getByText } = await render(
      <ProgressRing value={0} total={0} color="#0EA5A0" size={52} />,
    )
    expect(getByText('0%')).toBeTruthy()
  })

  it('отображает 100% когда все элементы выполнены', async () => {
    const { getByText } = await render(
      <ProgressRing value={5} total={5} color="#F59E0B" size={52} />,
    )
    expect(getByText('100%')).toBeTruthy()
  })

  it('имеет accessibilityRole progressbar и testID progress-ring', async () => {
    const { getByTestId } = await render(
      <ProgressRing value={1} total={3} color="#0EA5A0" size={52} />,
    )
    const el = getByTestId('progress-ring')
    expect(el.props.accessibilityRole).toBe('progressbar')
  })

  it('accessibilityValue содержит корректные min/max/now', async () => {
    const { getByTestId } = await render(
      <ProgressRing value={2} total={5} color="#0EA5A0" size={52} />,
    )
    const el = getByTestId('progress-ring')
    expect(el.props.accessibilityValue).toEqual({ min: 0, max: 5, now: 2 })
  })
})
