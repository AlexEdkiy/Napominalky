/**
 * Тесты AttributeTokens («облегчённая форма»): только токены ЗАПОЛНЕННЫХ
 * атрибутов; пустых чипов-кнопок «Добавить: …» больше нет (замена AttributeChips).
 */
import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'

import AttributeTokens from '../AttributeTokens'
import { EMPTY_ATTRIBUTE_VALUES, type ItemAttributeValues } from '@/utils/itemAttributes'

jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native')
  const Ionicons = ({ name }: { name: string }) => (
    <View testID={`icon-${name}`}>
      <Text>{name}</Text>
    </View>
  )
  return { Ionicons }
})

const accentColor = '#d99a3e'
const accentBg = '#fbf3e4'

describe('AttributeTokens — только заполненные атрибуты, без пустых чипов', () => {
  it('при пустых values не рендерит НИЧЕГО (ни токенов, ни чипов-кнопок)', async () => {
    const { queryByLabelText, toJSON } = await render(
      <AttributeTokens
        values={EMPTY_ATTRIBUTE_VALUES}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={jest.fn()}
        onRemove={jest.fn()}
      />,
    )
    expect(queryByLabelText('Добавить: Дедлайн')).toBeNull()
    expect(queryByLabelText('Добавить: Напоминание')).toBeNull()
    expect(queryByLabelText('Добавить: Ссылка')).toBeNull()
    expect(queryByLabelText('Добавить: Тег')).toBeNull()
    expect(toJSON()).toBeNull()
  })

  it('заданный дедлайн отображается токеном; чипов незаданных атрибутов нет', async () => {
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, deadline: '2026-07-10' }
    const { getByLabelText, queryByLabelText } = await render(
      <AttributeTokens
        values={values}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={jest.fn()}
        onRemove={jest.fn()}
      />,
    )
    expect(getByLabelText('Дедлайн: 10 июл')).toBeTruthy()
    expect(queryByLabelText('Добавить: Дедлайн')).toBeNull()
    expect(queryByLabelText('Добавить: Ссылка')).toBeNull()
  })

  it('домен извлекается из ссылки для токена', async () => {
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, link: 'https://example.com/path' }
    const { getByLabelText } = await render(
      <AttributeTokens
        values={values}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={jest.fn()}
        onRemove={jest.fn()}
      />,
    )
    expect(getByLabelText('Ссылка: example.com')).toBeTruthy()
  })

  it('несколько тегов отображаются через запятую в одном токене', async () => {
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, tags: ['срочно', 'дом'] }
    const { getByLabelText } = await render(
      <AttributeTokens
        values={values}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={jest.fn()}
        onRemove={jest.fn()}
      />,
    )
    expect(getByLabelText('Тег: срочно, дом')).toBeTruthy()
  })

  it('тап по токену вызывает onOpen (открыть шторку «Допатрибуты»)', async () => {
    const onOpen = jest.fn()
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, link: 'https://example.com' }
    const { getByLabelText } = await render(
      <AttributeTokens
        values={values}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={onOpen}
        onRemove={jest.fn()}
      />,
    )
    fireEvent.press(getByLabelText('Ссылка: example.com'))
    expect(onOpen).toHaveBeenCalledWith('link')
  })

  it('«×» на токене вызывает onRemove с именем атрибута', async () => {
    const onRemove = jest.fn()
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, link: 'https://a.com' }
    const { getByLabelText } = await render(
      <AttributeTokens
        values={values}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={jest.fn()}
        onRemove={onRemove}
      />,
    )
    fireEvent.press(getByLabelText('Удалить ссылка'))
    expect(onRemove).toHaveBeenCalledWith('link')
  })
})
