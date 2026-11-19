'use strict';

document.documentElement.classList.add('js');

const items = [...document.querySelectorAll('.demo-item')];
const progress = document.querySelector('#demo-progress');
const label = document.querySelector('#demo-label');
for (const item of items) {
  item.addEventListener('click', () => {
    item.setAttribute('aria-pressed', String(item.getAttribute('aria-pressed') !== 'true'));
    const done = items.filter(row => row.getAttribute('aria-pressed') === 'true').length;
    progress.style.width = `${done / items.length * 100}%`;
    progress.setAttribute('aria-valuenow', String(done));
    label.textContent = `${done} из ${items.length} куплено`;
  });
}

const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
if (header && toggle) {
  const closeMenu = () => {
    header.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Открыть меню');
  };
  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  header.querySelectorAll('.primary-nav a').forEach(link => link.addEventListener('click', closeMenu));
  header.addEventListener('keydown', event => {
    if (event.key === 'Escape' && header.classList.contains('is-open')) {
      closeMenu();
      toggle.focus();
    }
  });
}
