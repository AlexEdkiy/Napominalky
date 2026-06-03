export interface User {
  id: number
  uuid: string
  name: string | null
  email: string
  sync_enabled: boolean
  is_admin: boolean
  created_at: string
}

export interface AuthTokenResponse {
  token: string
  token_type: string
  user: User
}
