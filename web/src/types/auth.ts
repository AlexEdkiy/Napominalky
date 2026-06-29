/**
 * Пользователь — зеркало UserResource (snake_case).
 * GET /auth/me возвращает is_super_admin и is_active начиная с фичи суперадмина.
 */
export interface User {
  uuid: string
  name: string | null
  email: string
  is_admin: boolean
  is_super_admin: boolean
  is_active: boolean
  sync_enabled: boolean
  created_at: string
}

/**
 * Полезная нагрузка успешной аутентификации (register/login).
 */
export interface AuthResponse {
  token: string
  token_type: string
  user: User
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export interface LoginPayload {
  email: string
  password: string
  device_name?: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  email: string
  token: string
  password: string
  password_confirmation: string
}
