/** Register only on deployed builds/secure origins; offline support is best effort. */
export function registerOfflineFallback(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}offline-worker.js`, {
    scope: import.meta.env.BASE_URL, updateViaCache: 'none',
  }).catch(() => { /* The live connection page still works if storage is unavailable. */ })
}
