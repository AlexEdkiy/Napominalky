jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }))
import React from 'react'
import { Alert, Share } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'
import ShareTextButton from '../ShareTextButton'

afterEach(() => jest.restoreAllMocks())
it('passes complete plain text once to the native chooser, without a URL', async () => {
  let finish: ((value: { action: 'sharedAction' }) => void) | undefined
  const share = jest.spyOn(Share, 'share').mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const text = 'Заметка\n\nПолный текст 🚀\n'.repeat(300)
  const view = await render(<ShareTextButton text={text} />)
  await act(async () => { fireEvent.press(view.getByLabelText('Поделиться в Telegram')) })
  await act(async () => { fireEvent.press(view.getByLabelText('Поделиться в Telegram')) })
  expect(share).toHaveBeenCalledTimes(1)
  expect(share).toHaveBeenCalledWith({ message: text }, { dialogTitle: 'Поделиться — выберите Telegram' })
  await act(async () => { finish?.({ action: Share.sharedAction }) })
})
it('dismisses quietly and reports an actual native error without changing content', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction })
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  const view = await render(<ShareTextButton text="Текст" />)
  await act(async () => { fireEvent.press(view.getByLabelText('Поделиться в Telegram')) })
  expect(alert).not.toHaveBeenCalled()
  share.mockRejectedValueOnce(new Error('No activity'))
  await act(async () => { fireEvent.press(view.getByLabelText('Поделиться в Telegram')) })
  expect(alert).toHaveBeenCalledWith('Не удалось поделиться', expect.any(String))
})
it.each([{ text: '' }, { text: 'Неполный список', disabled: true }])('blocks sharing unavailable content', async props => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })
  const view = await render(<ShareTextButton {...props} />)
  await act(async () => { fireEvent.press(view.getByLabelText('Поделиться в Telegram')) })
  expect(share).not.toHaveBeenCalled()
})
