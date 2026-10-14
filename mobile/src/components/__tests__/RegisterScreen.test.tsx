jest.mock('expo-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => {
  const { Text } = require('react-native'); return <Text>{children}</Text>
} }))
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }))
jest.mock('@/theme', () => ({ useTheme: () => ({ colors: { screenBg: '#fff', textPrimary: '#000', danger: '#f00', accent: '#087' } }) }))
const mockRegister = { mutate: jest.fn(), data: undefined as unknown, error: null as unknown, isPending: false, isError: false }
const mockLogin = { mutate: jest.fn(), error: null, isError: false, isPending: false }
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ register: mockRegister, login: mockLogin }) }))
jest.mock('@/api/authApi', () => ({ authApi: { resendVerification: jest.fn() } }))
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { authApi } from '@/api/authApi'
import RegisterScreen from '../../../app/(auth)/register'

const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } })}><RegisterScreen /></QueryClientProvider>)
beforeEach(() => { jest.clearAllMocks(); mockRegister.data = undefined; mockRegister.error = null; mockRegister.isError = false })

it('independently shows both password fields without losing input', async () => {
  const screen = await mount()
  await fireEvent.changeText(screen.getByLabelText('Пароль'), 'password123')
  await fireEvent.changeText(screen.getByLabelText('Повтор пароля'), 'password123')
  await fireEvent.press(screen.getAllByLabelText('Показать пароль')[0]!)
  expect(screen.getByLabelText('Пароль').props.secureTextEntry).toBe(false)
  expect(screen.getByLabelText('Повтор пароля').props.secureTextEntry).toBe(true)
  await fireEvent.press(screen.getByLabelText('Показать пароль'))
  expect(screen.getByLabelText('Повтор пароля').props.secureTextEntry).toBe(false)
  expect(screen.getByLabelText('Повтор пароля').props.value).toBe('password123')
})

it('rejects short and mismatching passwords locally in Russian', async () => {
  const screen = await mount()
  await fireEvent.changeText(screen.getByLabelText('Пароль'), 'short')
  await fireEvent.changeText(screen.getByLabelText('Повтор пароля'), 'other')
  await fireEvent.press(screen.getByText('Создать аккаунт'))
  expect(screen.getByText('Пароль должен содержать не менее 8 символов.')).toBeTruthy()
  expect(screen.getByText('Пароли не совпадают. Повторите пароль.')).toBeTruthy()
  expect(mockRegister.mutate).not.toHaveBeenCalled()
  await fireEvent.changeText(screen.getByLabelText('Пароль'), 'password123')
  await fireEvent.changeText(screen.getByLabelText('Повтор пароля'), 'password123')
  await fireEvent.press(screen.getByText('Создать аккаунт'))
  expect(mockRegister.mutate).toHaveBeenCalledWith(expect.objectContaining({ password: 'password123', password_confirmation: 'password123' }))
})

it('shows pending registration and supports mail retry without automatic login', async () => {
  mockRegister.data = { verification_required: true, email: 'new@example.com', email_sent: false, message: 'Письмо не отправлено.' }
  ;(authApi.resendVerification as jest.Mock).mockRejectedValueOnce({ isAxiosError: true, response: { status: 503, data: { message: 'Не удалось отправить письмо.' } } }).mockResolvedValueOnce({ message: 'Письмо отправлено.' })
  const screen = await mount()
  expect(screen.getByText('Подтвердите почту')).toBeTruthy()
  expect(mockLogin.mutate).not.toHaveBeenCalled()
  await fireEvent.press(screen.getByText('Отправить письмо повторно'))
  await waitFor(() => expect(screen.getByText('Не удалось отправить письмо.')).toBeTruthy())
  await fireEvent.press(screen.getByText('Отправить письмо повторно'))
  await waitFor(() => expect(screen.getByText('Письмо отправлено.')).toBeTruthy())
  await fireEvent.press(screen.getByText('Я подтвердил почту — войти'))
  expect(mockLogin.mutate).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }))
})
