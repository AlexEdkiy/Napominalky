// No auth data or writes: recover the original navigation only after the API responds.
const button = document.querySelector('.connection-page__retry');
const hint = document.querySelector('.connection-page__hint');
let checking = false;
async function retry() {
  if (checking) return;
  checking = true;
  button.setAttribute('aria-disabled', 'true');
  button.textContent = 'Проверяем соединение…';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(new URL('api/v1/auth/me', document.baseURI), {
      headers: { Accept: 'application/json' }, cache: 'no-store', credentials: 'omit', signal: controller.signal,
    });
    if (![200, 401].includes(response.status) || !response.headers.get('content-type')?.includes('application/json')) throw new Error('API unavailable');
    if (location.pathname.endsWith('/offline.html')) location.replace(new URL('lk', document.baseURI));
    else location.reload();
  } catch {
    hint.textContent = 'Связь пока не восстановлена. Попробуйте ещё раз.';
  } finally {
    clearTimeout(timer);
    checking = false;
    button.removeAttribute('aria-disabled');
    button.textContent = 'Попробовать снова';
  }
}
button.addEventListener('click', retry);
window.addEventListener('online', retry);
