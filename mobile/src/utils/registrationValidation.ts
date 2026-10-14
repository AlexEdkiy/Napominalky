export function validateRegistrationPassword(password: string, confirmation: string): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  if (Array.from(password).length < 8) errors.password = ['Пароль должен содержать не менее 8 символов.']
  if (!password) errors.password = ['Введите пароль.']
  if (password !== confirmation) errors.password_confirmation = ['Пароли не совпадают. Повторите пароль.']
  return errors
}
