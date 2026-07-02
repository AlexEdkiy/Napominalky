import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'

import AttributeChips from '../AttributeChips'
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

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { textPrimary: '#111', textSecondary: '#666' },
  }),
}))

const accentColor = '#d99a3e'
const accentBg = '#fbf3e4'

describe('AttributeChips — чипсы (незаданные) и токены (заданные)', () => {
  it('при пустых values показывает все 5 чипсов, токенов нет', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <AttributeChips
        values={EMPTY_ATTRIBUTE_VALUES}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={jest.fn()}
        onRemove={jest.fn()}
      />,
    )
    expect(getByLabelText('Добавить: Дедлайн')).toBeTruthy()
    expect(getByLabelText('Добавить: Напоминание')).toBeTruthy()
    expect(getByLabelText('Добавить: Ссылка')).toBeTruthy()
    expect(getByLabelText('Добавить: Комментарий')).toBeTruthy()
    expect(getByLabelText('Добавить: Тег')).toBeTruthy()
    expect(queryByLabelText(/^Дедлайн:/)).toBeNull()
  })

  it('заданный дедлайн отображается токеном, чипс дедлайна пропадает', async () => {
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, deadline: '2026-07-10' }
    const { getByLabelText, queryByLabelText } = await render(
      <AttributeChips
        values={values}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={jest.fn()}
        onRemove={jest.fn()}
      />,
    )
    expect(getByLabelText('Дедлайн: 10 июл')).toBeTruthy()
    expect(queryByLabelText('Добавить: Дедлайн')).toBeNull()
  })

  it('домен извлекается из ссылки для токена', async () => {
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, link: 'https://example.com/path' }
    const { getByLabelText } = await render(
      <AttributeChips
        values={values}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={jest.fn()}
        onRemove={jest.fn()}
      />,
    )
    expect(getByLabelText('Ссылка: example.com')).toBeTruthy()
  })

  it('комментарий отображается как «Есть заметка»', async () => {
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, comment: 'Взять свежее' }
    const { getByLabelText } = await render(
      <AttributeChips
        values={values}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={jest.fn()}
        onRemove={jest.fn()}
      />,
    )
    expect(getByLabelText('Комментарий: Есть заметка')).toBeTruthy()
  })

  it('несколько тегов отображаются через запятую в одном токене', async () => {
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, tags: ['срочно', 'дом'] }
    const { getByLabelText } = await render(
      <AttributeChips
        values={values}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={jest.fn()}
        onRemove={jest.fn()}
      />,
    )
    expect(getByLabelText('Тег: срочно, дом')).toBeTruthy()
  })

  it('тап по чипсу вызывает onOpen с именем атрибута', async () => {
    const onOpen = jest.fn()
    const { getByLabelText } = await render(
      <AttributeChips
        values={EMPTY_ATTRIBUTE_VALUES}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={onOpen}
        onRemove={jest.fn()}
      />,
    )
    fireEvent.press(getByLabelText('Добавить: Ссылка'))
    expect(onOpen).toHaveBeenCalledWith('link')
  })

  it('тап по токену вызывает onOpen (редактировать) с именем атрибута', async () => {
    const onOpen = jest.fn()
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, comment: 'Заметка' }
    const { getByLabelText } = await render(
      <AttributeChips
        values={values}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={onOpen}
        onRemove={jest.fn()}
      />,
    )
    fireEvent.press(getByLabelText('Комментарий: Есть заметка'))
    expect(onOpen).toHaveBeenCalledWith('comment')
  })

  it('«×» на токене вызывает onRemove с именем атрибута', async () => {
    const onRemove = jest.fn()
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, link: 'https://a.com' }
    const { getByLabelText } = await render(
      <AttributeChips
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
