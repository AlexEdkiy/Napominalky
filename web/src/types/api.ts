/**
 * Обёртка одиночного ресурса API: `{ data: T }`.
 */
export interface ApiResponse<T> {
  data: T
}

/**
 * Метаданные пагинации Laravel (snake_case).
 */
export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

/**
 * Ссылки пагинации Laravel.
 */
export interface PaginationLinks {
  first: string | null
  last: string | null
  prev: string | null
  next: string | null
}

/**
 * Обёртка коллекции ресурсов с пагинацией.
 */
export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
  links: PaginationLinks
}

/**
 * Тело ответа Laravel при ошибке валидации (HTTP 422).
 */
export interface ValidationErrorResponse {
  message: string
  errors: Record<string, string[]>
}
