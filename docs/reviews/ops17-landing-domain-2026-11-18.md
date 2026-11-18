# OPS-17 — хостинг лендинга www.napominalky.ru

Исполнитель: Codex, самопроверка. Дата: 2026-11-18, время МСК.
Запрос: подготовить основной домен для будущего лендинга. Разработка самого
лендинга в задачу не входит; готовые файлы пользователь ещё не предоставлял.

## Результат

- `https://www.napominalky.ru/` подключён к отдельному статическому контейнеру
  `napominalky_landing`. DNS A www/apex → `94.103.15.24` подтверждён.
- HTTP обоих имён и HTTPS `napominalky.ru` перенаправляются на HTTPS www
  с сохранением пути и query. Включено 2026-11-18 17:42 МСК.
- Отдельный сертификат Let's Encrypt для apex/www, срок до 2027-02-16.
  Общий cron `/home/vselug/.openclaw/workspace/certbot/renew.sh` дважды в сутки
  продлевает сертификаты и перечитывает nginx.
- Подготовительный ответ: 503 «Сайт готовится к запуску», `noindex, nofollow`,
  `Retry-After: 3600`, `Cache-Control: no-store`, robots запрещает обход.
  Это готовность хостинга, не опубликованный лендинг.
- Артефакт `ops17-bootstrap`, source `24e1fd35f6944551b48dde9d2a61faf1c10ea04b`;
  `/home/vselug/workspace/Napominalky-runtime/landing/releases/ops17-bootstrap`.
  Файлы и контейнер readonly, проверочный порт только `127.0.0.1:18089`.
- Кабинет/БД/API не менялись; активная версия по прежнему адресу `r57d35d7-dev26`.
  Позднее в 17:57 МСК отдельно завершён OPS-16: кабинет теперь на lk, production
  `r9e7ac28-ops16`; landing-контейнер и артефакт при этом сохранены.

## Проверки

- [CI исходного SHA](https://github.com/AlexEdkiy/Napominalky/actions/runs/44326684688):
  backend, mobile checks, web checks — success.
- Docker Compose config, nginx -t для bootstrap/полного HTTPS и действующего
  прокси прошли. Внешний конфиг записан на месте с проверкой ожидаемых байтов;
  резервная копия сохранена вне Git.
- Сборка реального тестового `index.html` + вложенного CSS в отдельный артефакт:
  HTML/CSS 200 с правильными MIME, отсутствующие файлы/страницы 404; запрет обхода
  из bootstrap не попал в готовую тестовую сборку. Тестовый контейнер удалён.
- Проверка manifest; упаковщик отклоняет скрытые служебные файлы и симлинки.
- Публичные проверки через обычный DNS: www 503 с ожидаемыми заголовками,
  release marker 200, отсутствующая страница 404, три варианта редиректа,
  валидный TLS/SAN для обоих имён. Прежний release marker кабинета сохранён.
- Временный ACME-файл доступен по HTTP с Host www/apex/lk и затем удалён.
- Проверка `certbot renew --cert-name napominalky.ru --dry-run --non-interactive
  --no-random-sleep-on-renew` прошла: simulated renewal success для обоих имён.
  Лог: `Napominalky-artifacts/ops17/certbot-renew-dry-run-final.log`.

## Публикация и откат

[Инструкция](../../deploy/landing/README.md): упаковать статическую сборку с index.html,
проверить на отдельном порту, сохранить старый `landing/target.env`, переключить
только landing Compose и reload proxy. Предыдущий артефакт сохранять для отката.
Приложение и БД в этих командах не участвуют. Ссылка «Войти» будущего лендинга —
`https://lk.napominalky.ru/` (OPS-16 завершён в тот же день).

Согласованные конфиги внешнего nginx находятся в
`/home/vselug/workspace/Napominalky-artifacts/ops17/`:

- `proxy.before.conf` — до добавления лендинга, с bootstrap lk;
- `proxy.bootstrap.conf` — bootstrap всех трёх имён;
- `proxy.www-only-https.conf` — состояние до OPS-16: HTTPS лендинга + bootstrap lk;
- `proxy.all-https.conf` — текущая конфигурация с 17:57 МСК, HTTPS кабинета и лендинга;
- `proxy.lk-only-https.conf` — резервный вариант lk HTTPS + bootstrap лендинга.

При повторном включении или откате OPS-16 не устанавливать старый
`ops16/proxy.https.conf` целиком: он ещё не содержит лендинг. Проверить актуальный
live-файл и использовать согласованные конфиги из OPS-17, чтобы сохранить www.
Ключи/окружение/пользовательские данные в Git не добавляются.
