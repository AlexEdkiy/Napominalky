/**
 * Обёртка одиночного ресурса API: `{ data: T }`.
 */
export interface ApiResponse<T> {
  data: T
}

/**
 * Тело ответа Laravel при ошибке валидации (HTTP 422).
 */
export interface ValidationErrorResponse {
  message: string
  errors: Record<string, string[]>
}
