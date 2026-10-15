/** Stable partition; filtering and existing secondary ordering are preserved. */
export const favoritesFirst = <T extends { isFavorite?: boolean }>(items: readonly T[]): T[] =>
  [...items.filter((item) => item.isFavorite), ...items.filter((item) => !item.isFavorite)]
