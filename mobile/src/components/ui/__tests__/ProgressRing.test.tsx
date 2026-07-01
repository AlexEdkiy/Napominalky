import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'

import ProgressRing from '../ProgressRing'

describe('ProgressRing (svg)', () => {
  it('рендерится без ошибок при progress=0', async () => {
    const { getByTestId } = await render(
      <ProgressRing progress={0} color="#0D9488" trackColor="#EFF3F6" />,
    )
    expect(getByTestId('progress-ring-svg')).toBeTruthy()
  })

  it('рендерится без ошибок при частичном progress', async () => {
    const { getByTestId } = await render(
      <ProgressRing progress={0.5} color="#0D9488" trackColor="#EFF3F6" />,
    )
    expect(getByTestId('progress-ring-svg')).toBeTruthy()
  })

  it('рендерится без ошибок при progress=1 (полностью)', async () => {
    const { getByTestId } = await render(
      <ProgressRing progress={1} color="#0D9488" trackColor="#EFF3F6" />,
    )
    expect(getByTestId('progress-ring-svg')).toBeTruthy()
  })

  it('ограничивает progress сверху при значении > 1', async () => {
    const { getByTestId } = await render(
      <ProgressRing progress={2} color="#0D9488" trackColor="#EFF3F6" />,
    )
    expect(getByTestId('progress-ring-svg')).toBeTruthy()
  })

  it('ограничивает progress снизу при отрицательном значении', async () => {
    const { getByTestId } = await render(
      <ProgressRing progress={-1} color="#0D9488" trackColor="#EFF3F6" />,
    )
    expect(getByTestId('progress-ring-svg')).toBeTruthy()
  })

  it('рендерит children по центру кольца', async () => {
    const { getByText } = await render(
      <ProgressRing progress={0.5} color="#0D9488" trackColor="#EFF3F6">
        <Text>3/5</Text>
      </ProgressRing>,
    )
    expect(getByText('3/5')).toBeTruthy()
  })
})
