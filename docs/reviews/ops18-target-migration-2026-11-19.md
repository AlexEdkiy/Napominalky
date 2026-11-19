# OPS-18 — перенос на российский VPS

2026-11-19. Ветка `ops18-network`. Codex, самопроверка.
Это продолжение [диагностики сети](ops18-network-reachability-2026-11-18.md).

## Подготовка и проверки

SSH `devops@195.206.252.160:22` и временный passwordless sudo подтверждены.
Пользователь разрешил перенос на этот сервер. Правило
`/etc/sudoers.d/90-napominalky-deploy` необходимо удалить после развёртывания.
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

На момент этого checkpoint целевая БД подготовлена пустой; финальный снимок,
переключение записей и DNS ещё не выполнялись. OPS-18 остаётся in_progress.
