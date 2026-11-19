# OPS-18 — перенос на российский VPS

2026-11-19. Ветка `ops18-network`. Codex, самопроверка.
Это продолжение [диагностики сети](ops18-network-reachability-2026-11-18.md).

## Подготовка и проверки

SSH `devops@195.206.252.160:22` и временный passwordless sudo были подтверждены.
Пользователь разрешил перенос на этот сервер. Правило
`/etc/sudoers.d/90-napominalky-deploy` удалено после развёртывания, см. итог ниже.
Существующие сайт 3dsotky.ru, панель ISPmanager, mtproto и UDP relay сохраняются.

Автоматическая проверка отклонила передачу прежнего пакета: исторический PHP
image содержит `.env` и логи. Он НЕ передавался. `extract_php_base.py` физически
исключил четыре последних слоя приложения и их историю из Docker archive.
Сохранены 16 базовых слоёв; PHP 8.5.6 и список расширений совпадают с production.
Новый image: `sha256:b544765a589a3088996a4cb26b7ca6b502401a972a0afee191f45db31f0586a4`.

`repack_runtime.py` подготовил `r9e7ac28-ops18` из рабочего `r9e7ac28-ops16`.
Source SHA остаётся `9e7ac28bcb382898ae458837363b51240a1eb17a`.
Изменены только manifest и два release.json; все остальные 9998 файлов идентичны.
Не включены невыпущенные изменения main/MOB-74; миграции схемы не запускаются.
Nginx приложения — 1.30.7, PostgreSQL — 17.10, Redis — 7.4.12; digest закреплены.

`Napominalky-artifacts/ops18/transfer-clean-20261119/` содержит очищенные образы,
артефакты приложения/лендинга и deployment tools. Четыре SHA-256 после передачи
совпали; Docker сохранил все image IDs и amd64. Старые transfer-каталоги запрещены
к повторной передаче. Рабочие секреты/данные передаются отдельным закрытым снимком.

На целевом сервере: `/srv/napominalky/releases/r9e7ac28-ops18`.
Проверены все файлы manifest. Изолированные Pest: **465 passed, 2142 assertions**,
67.25 секунды; лог `/srv/napominalky/stage-ops18/backend-tests.log`.
Первый smoke выявил отсутствие loopback-публикации при единственной internal-сети.
Добавлена отдельная frontend-сеть, как в production; API/web smoke для `/` и
`/napominalki/` прошёл. Тесты не использовали production данные.

Production: отдельные `napominalky_backend` (internal) и `napominalky_frontend`.
DB/Redis без опубликованных портов, API/web/landing только 127.0.0.1:18000/18082/18089.
У роли БД `reminders` нет superuser/createdb/createrole/replication/bypassrls;
пароли БД/Redis новые. Redis default off, app allowlist прежний, operator/health отдельно.

## HTTPS и маршруты

На новом сервере выпущены собственные сертификаты lk, apex/www и jemsoft/www,
срок до 2027-02-17; закрытые ключи старого сервера не переносились.
Все три certbot renewal dry-run успешны; deploy hook проверяет/reload nginx.
ACME работает до и после DNS через local-first fallback между серверами;
в источнике добавлена защита от обратного цикла. Отсутствующий token даёт 404
на обоих IP; локальные challenge старого certbot сохраняют приоритет.

Новый `/etc/nginx/conf.d/napominalky.conf` добавлен отдельно от конфигов панели.
Полная прежняя конфигурация сохранена в закрытом `host-nginx-before.tgz`.
Проверки `curl --resolve` с проверкой TLS: кабинет пока 503 maintenance,
apex 301, jemsoft landing 200, mafin-recovery 200, Insure 410, 3dsotky.ru 200.
Лендинг Напоминалок остаётся `ops17-bootstrap`: ожидаемый 503 до публикации контента.

Host nginx панели — **1.30.6-276**, vendor candidate — **1.30.6-285** с общим
changelog без подтверждения security backport. Он не заменён несовместимым пакетом.
Для новых virtual hosts HTTP/2 отключён. Это не означает устранения всех проблем
host nginx: поставщик должен подтвердить backport либо дать совместимый пакет
с исправлениями [официального nginx 1.30.7](https://nginx.org/en/security_advisories.html).
Контейнеры web/landing уже используют 1.30.7.

## Последовательность финального переключения

1. `migration_source_snapshot.py` сохраняет crontab/restart policies, останавливает
   только `reminders_serve`/`reminders_app`, отключает scheduler Напоминалок и
   переводит новые соединения старой БД в read-only. При ошибке writers остаются
   остановлены для разбора; состояние — `phase.json` закрытого снимка.
2. Согласованный `pg_dump`, все таблицы/sequence fingerprints, пользовательские
   uploads/file sessions, APP_KEY и RDB сохраняются вне Git. Старые пароли БД/Redis,
   application logs и кеши не входят в перенос. Схема приложения не меняется.
3. `migration_target.py restore` восстанавливает данные в пустое хранилище.
   `verify_migration_data.py` сравнивает строки всех 17 таблиц, sequences, файлы,
   APP_KEY, три постоянных Redis-ключа и ограниченность роли БД до открытия записи.
4. Запустить immutable API/web и smoke. `ops18_source_cutover.py` направляет только
   прежние пути Напоминалок на новый сервер с TLS verification. Остальные jemsoft
   пути на новом VPS проксируются на прежний origin; отключённый Insure остаётся 410.
5. Открыть запись на новом VPS, включить единственный scheduler. После этого нельзя
   возвращать старую БД: rollback кода использует текущие новые данные, перенос назад
   требует отдельной остановки записи и обратного согласованного снимка.
6. После проверок пользователь меняет A-записи lk/@/www napominalky.ru и @/www
   jemsoft.ru на 195.206.252.160. Это необходимо и для старых APK.
   Проверить публичный DNS, TLS и доступ из российских сетей, удалить временный sudo.

## Выполненное переключение

**2026-11-19 15:07:33 UTC** на новом сервере открыта запись. Активен
`r9e7ac28-ops18`; исходный код приложения не изменён. Снимок успешно восстановлен,
до запуска API совпали содержимое/количество строк всех **17 таблиц**, значения
sequences, **5 файлов** uploads/file sessions, APP_KEY и **3 постоянных Redis-ключа**.
Роль БД проверена: все пять административных флагов false. Миграции схемы не запускались.

Закрытые резервные копии:

- Источник: `Napominalky-artifacts/ops18/final-snapshot-20261119/`, включая прежний
  crontab/restart policies и phase.json. Снимок остаётся историческим, не актуальной БД.
- Новый VPS: `/srv/napominalky/backups/ops18-final-snapshot-20261119/`, root-only;
  после переноса из временной папки все SHA-256 повторно совпали.
- Исходный proxy: `ops18/source-edge-before-cutover.conf` (закрытый файл вне Git).
  Не возвращать его целиком после новых записей: он направляет на прежние данные.

Старые API/app/web/landing остановлены и restart=no; старая БД read-only.
Новый scheduler `/etc/cron.d/napominalky` работает; прежняя строка удалена из
crontab vselug, certbot cron сохранён. Старый и новый IP возвращают новый marker
и 401 от API без токена как для lk, так и для `/napominalki/`.
Тестовые контейнеры/сети после проверки удалены; production и mtproto сохранены.

Публичные проверки через `--resolve` подтвердили TLS, оба API и сохранение других
сайтов. Chromium: 1440/390 px на lk и 390 px на прежнем адресе; 18 гостевых переходов
на вход, auth/me 401, пустой login 422, offline/recovery, форма сброса пароля,
отсутствие horizontal overflow/JS errors/посторонних origin. Мобильные скриншоты
просмотрены. Это эмуляция viewport, не физический телефон; реальным аккаунтом
не входили и письма не отправляли.

[Внешняя HTTPS-проверка нового IP](https://api.globalping.io/v1/measurements/2kpcmaR6j3tLakjLA00021X82):
Timeweb AS9123, Selectel AS49505/AS50340 (РФ) и Hetzner AS24940 (Германия) получили
**200**, `tls.authorized=true` и marker `r9e7ac28-ops18`. Проверка использовала
целевой IP и Host/SNI lk; она не подменяет проверку публичного DNS после его смены.

[CI инструментов 36997df](https://github.com/AlexEdkiy/Napominalky/actions/runs/44551714746)
успешен. Артефакты локально: `ops18/post-cutover-https.json`, `public-browser.json`,
скриншоты, `new-https-{request,created,result}.json`. На VPS —
`/srv/napominalky/ops18-{data-verification,cutover-state}.json` и staging test log.

Пользователю передана смена пяти A-записей на 195.206.252.160:
lk/@/www зоны napominalky.ru и @/www зоны jemsoft.ru, TTL 600. Последняя DNS-проверка
ещё возвращала 94.103.15.24 для всех пяти, AAAA отсутствуют. **OPS-18 in_progress**:
остались DNS и проверка обычного адреса из РФ/подключения пользователя.
Подтверждение исправленного host nginx панели отдельно не получено.

**15:16:59 UTC:** временное правило полного passwordless sudo удалено.
До удаления проверены nginx/sudoers, активность nginx/docker/cron/certbot.timer,
всех production-контейнеров и mtproto, health PostgreSQL/Redis. После удаления
повторный SSH работает, `sudo -n -k true` требует пароль. Постоянные SSH-ключи
и остальные sudoers не менялись. Нельзя считать полный sudo доступным для
следующего выпуска: потребуется отдельный административный способ исполнения.
Контроль DNS после завершения по-прежнему показал старый IP для всех пяти имён;
доступ через обычный DNS из домашней сети ещё не восстановлен этим переключением.
