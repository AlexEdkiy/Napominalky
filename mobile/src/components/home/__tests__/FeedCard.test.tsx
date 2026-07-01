jest.mock('@/db/client', () => ({ db: {} }))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

import FeedCard from '../FeedCard'
import { lightColors } from '@/theme/colors'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

const defaultProps = {
  uuid: 'test-uuid',
  title: 'Test Note',
  subtitle: 'подзаголовок',
  iconName: 'document-text' as const,
  iconColor: lightColors.noteBlue,
  iconBg: lightColors.noteBlueBg,
  onPress: jest.fn(),
  colors: lightColors,
}

describe('FeedCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('рендерит заголовок', async () => {
    const { getByText } = await render(<FeedCard {...defaultProps} />)
    expect(getByText('Test Note')).toBeTruthy()
  })

  it('рендерит подзаголовок', async () => {
    const { getByText } = await render(<FeedCard {...defaultProps} />)
    expect(getByText('подзаголовок')).toBeTruthy()
  })

  it('вызывает onPress с uuid при нажатии', async () => {
    const onPress = jest.fn()
    const { getByRole } = await render(<FeedCard {...defaultProps} onPress={onPress} />)
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledWith('test-uuid')
  })

  describe('labelColor (fix 2д)', () => {
    it('включает labelColor в JSON дерево когда задан', async () => {
      const { toJSON } = await render(
        <FeedCard {...defaultProps} labelColor="#ea899a" />,
      )
      const json = JSON.stringify(toJSON())
      expect(json).toContain('#ea899a')
    })

    it('не добавляет лишних цветов когда labelColor=null', async () => {
      const { toJSON } = await render(<FeedCard {...defaultProps} labelColor={null} />)
      const json = JSON.stringify(toJSON())
      expect(json).not.toContain('#ea899a')
    })

    it('не добавляет лишних цветов когда labelColor не передан', async () => {
      const { toJSON } = await render(<FeedCard {...defaultProps} />)
      const json = JSON.stringify(toJSON())
      expect(json).not.toContain('#ea899a')
    })

    it('применяет все допустимые hex-цвета', async () => {
      for (const color of ['#ea899a', '#ffebb8', '#91d177', '#afdafc'] as const) {
        const { toJSON } = await render(
          <FeedCard {...defaultProps} labelColor={color} />,
        )
        const json = JSON.stringify(toJSON())
        expect(json).toContain(color)
      }
    })
  })

  describe('onLongPress (fix 2з)', () => {
    it('вызывает onLongPress с uuid при долгом нажатии', async () => {
      const onLongPress = jest.fn()
      const { getByRole } = await render(
        <FeedCard {...defaultProps} onLongPress={onLongPress} />,
      )
      fireEvent(getByRole('button'), 'longPress')
      expect(onLongPress).toHaveBeenCalledWith('test-uuid')
    })

    it('не вызывает исключение при отсутствии onLongPress', async () => {
      const { getByRole } = await render(<FeedCard {...defaultProps} />)
      expect(() => fireEvent(getByRole('button'), 'longPress')).not.toThrow()
    })
  })

  describe('progress (кольцо прогресса задач)', () => {
    it('без progress рендерит стандартный iconSquare, а не кольцо', async () => {
      const { queryByTestId } = await render(<FeedCard {...defaultProps} />)
      expect(queryByTestId('progress-ring-svg')).toBeNull()
    })

    it('с progress рендерит кольцо вместо iconSquare', async () => {
      const { getByTestId } = await render(
        <FeedCard {...defaultProps} progress={{ done: 2, total: 4 }} />,
      )
      expect(getByTestId('progress-ring-svg')).toBeTruthy()
    })

    it('рендерит иконку типа внутри кольца', async () => {
      const { getByTestId } = await render(
        <FeedCard
          {...defaultProps}
          iconName="bag-handle"
          progress={{ done: 1, total: 3 }}
        />,
      )
      expect(getByTestId('icon-bag-handle')).toBeTruthy()
    })

    it('не падает при total=0 (пустая задача)', async () => {
      const { getByTestId } = await render(
        <FeedCard {...defaultProps} progress={{ done: 0, total: 0 }} />,
      )
      expect(getByTestId('progress-ring-svg')).toBeTruthy()
    })
  })
})
