jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'

import FeedSection from '../FeedSection'
import { lightColors } from '@/theme/colors'

const defaultProps = {
  title: 'Заметки',
  dotColor: lightColors.noteBlue,
  colors: lightColors,
}

describe('FeedSection', () => {
  it('рендерит заголовок секции', async () => {
    const { getByText } = await render(
      <FeedSection {...defaultProps}>
        <Text>Дочерний элемент</Text>
      </FeedSection>,
    )
    expect(getByText('Заметки')).toBeTruthy()
  })

  it('рендерит дочерние элементы', async () => {
    const { getByText } = await render(
      <FeedSection {...defaultProps}>
        <Text>Карточка 1</Text>
      </FeedSection>,
    )
    expect(getByText('Карточка 1')).toBeTruthy()
  })

  it('не отображает бейдж-счётчик', async () => {
    const { queryByText } = await render(
      <FeedSection {...defaultProps} count={5}>
        <Text>Содержимое</Text>
      </FeedSection>,
    )
    // count передан, но не должен рендериться как текстовый бейдж
    expect(queryByText('5')).toBeNull()
  })

  it('рендерится без пропа count', async () => {
    const { getByText } = await render(
      <FeedSection title="Списки" dotColor={lightColors.accent} colors={lightColors}>
        <Text>Список</Text>
      </FeedSection>,
    )
    expect(getByText('Списки')).toBeTruthy()
  })
})
