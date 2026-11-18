# OPS-17: статический хостинг лендинга

Публичный адрес: `https://www.napominalky.ru/`. Домен `napominalky.ru`
перенаправляется на www с сохранением пути и query. Кабинет — отдельный
`https://lk.napominalky.ru/`; контейнеры, артефакты и API не смешиваются.

DNS: A `@` и A `www` → `94.103.15.24`. Сертификат Let's Encrypt отдельный,
cert-name `napominalky.ru`, SAN `napominalky.ru` и `www.napominalky.ru`.
Webroot `/var/www/certbot`; общий существующий certbot cron продлевает сертификаты
и reload nginx. HTTPS-шаблон: `../www.napominalky.ru.nginx.conf`.
Не включать HTTPS до появления DNS и выпуска корректного сертификата.

Runtime: `/home/vselug/workspace/Napominalky-runtime/landing/`; releases вне Git.
Контейнер `napominalky_landing`, readonly nginx, loopback `127.0.0.1:18089`;
наружу маршрутизирует существующий `nginx-proxy`. Пин образа относится к текущему
серверу: для переноса хостинга потребуется экспорт/доставка этого образа.

## Подготовка и публикация

`prepare.py` без `--content` создаёт подготовительный артефакт: корень отвечает 503,
`X-Robots-Tag: noindex, nofollow`, `Retry-After`, robots запрещает обход. Это готовность
хостинга, не опубликованный лендинг. `/release.json` подтверждает версию.

Для публикации нужны готовые статические файлы с `index.html` в корне. Собирать
исходники отдельно; в каталог публикации не класть `.env`, `.git` и node_modules.
Подготовить правильные title/description/canonical на www, robots/sitemap, а ссылки
входа/регистрации направить на lk. Скрипт не добавляет блокирующий robots в готовую
сборку и не включает в неё свой подготовительный robots.

```bash
python3 deploy/landing/prepare.py --ref HEAD \
  --root /home/vselug/workspace/Napominalky-runtime/landing/releases \
  --release-id landing-YYYYMMDD-N --content /absolute/path/to/built-site
python3 deploy/landing/prepare.py --verify \
  /home/vselug/workspace/Napominalky-runtime/landing/releases/landing-YYYYMMDD-N
```

Сначала запустить тестовый nginx на отдельном loopback-порту с двумя readonly
mounts артефакта, проверить HTML/CSS/JS, ссылки, реальные 404 и мобильный экран.
До переключения сохранить runtime `target.env` и предыдущий артефакт.
После проверки в `landing/target.env` указать только:

```dotenv
LANDING_RELEASE_ID=landing-YYYYMMDD-N
LANDING_RELEASE_DIR=/home/vselug/workspace/Napominalky-runtime/landing/releases/landing-YYYYMMDD-N
```

```bash
docker compose --env-file /home/vselug/workspace/Napominalky-runtime/landing/target.env \
  -f deploy/landing/compose.yml up -d
docker exec nginx-proxy nginx -t
docker exec nginx-proxy nginx -s reload
```

Проверить публичный `/release.json`, HTML, ресурсы, HTTPS, редирект без www и
доступность личного кабинета. Reload необходим после пересоздания контейнера:
nginx должен заново разрешить его Docker-адрес. При ошибке вернуть прежний
`target.env`, выполнить те же команды и проверки. Данные приложения и БД не трогать.

При изменении внешнего nginx сохранять исходный файл, проверять отсутствие чужих
правок, писать содержимое на месте (bind mount отдельного файла), проверять `nginx -t`
и только затем reload. При ошибке вернуть исходное содержимое и перечитать nginx.

## Статус

Хостинг включён 2026-11-18 17:42 МСК, `release-ops17` / `24e1fd3`, артефакт
`ops17-bootstrap`. HTTPS www доступен; HTTP и HTTPS без www перенаправляются на www.
Сертификат содержит оба имени, действителен до 2027-02-16. До загрузки готового
лендинга корень возвращает ожидаемый 503 без индексации. Публичные проверки
и пробное продление сертификата (`certbot renew --dry-run`) прошли.
[Отчёт OPS-17](../../docs/reviews/ops17-landing-domain-2026-11-18.md).
