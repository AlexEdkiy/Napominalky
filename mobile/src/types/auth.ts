export interface User {
  uuid: string
  avatar?: string | null
  name: string | null
  email: string
  is_admin: boolean
  sync_enabled: boolean
  created_at: string
}

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
