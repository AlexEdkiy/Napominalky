/** Public landing page only: never attach a private entity URL or account token. */
export const telegramShareWebsite = 'https://jemsoft.ru/napominalki/'

/** Telegram Desktop truncates external URIs to 8192 characters. Fall back to
 * copying the full message instead of opening a silently truncated draft.
 * The message bound is deliberately conservative for clients using UTF-16. */
export function telegramShareUrl(text: string): string | null {
  if (!text.trim() || telegramShareWebsite.length + 1 + text.length > 4096) return null
  try {
    const url = `tg://msg_url?url=${encodeURIComponent(telegramShareWebsite)}&text=${encodeURIComponent(text)}`
    return url.length <= 8192 ? url : null
  } catch {
    // A malformed surrogate must not prevent manual copying of the original.
    return null
  }
}
