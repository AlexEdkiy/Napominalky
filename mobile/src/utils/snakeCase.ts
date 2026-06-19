/**
 * Converts a camelCase string to snake_case.
 * Examples: "isPinned" → "is_pinned", "shoppingListUuid" → "shopping_list_uuid"
 */
export const toSnakeCase = (key: string): string =>
  key.replace(/([A-Z])/g, (char) => `_${char.toLowerCase()}`)

/**
 * Recursively converts all keys of a plain object from camelCase to snake_case.
 * Preserves values as-is (including 0/1 integer booleans stored by SQLite).
 * Used to normalise outgoing sync payload before writing to sync_outbox.
 */
export const toSnakeCaseKeys = (
  obj: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value
  }
  return result
}
