import type { User } from '@/types/auth'

/**
 * Инициал для аватара пользователя: первая буква имени, иначе — email.
 */
export function getUserInitial(user: User | null): string {
  const source = user?.name?.trim() || user?.email
  if (!source) {
    return '?'
  }
  return source.charAt(0).toUpperCase()
}

/**
 * Отображаемое имя пользователя: имя, иначе — email, иначе пустая строка.
 */
export function getUserDisplayName(user: User | null): string {
  return user?.name?.trim() || user?.email || ''
}
