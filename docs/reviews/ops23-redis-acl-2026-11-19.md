# OPS-23: аутентификация и ограниченные ACL Redis

Дата: 2026-11-19 (Москва). Ветка: `ops23-redis-acl`.
Исполнитель: Codex; самопроверка. Основание: поручение пользователя «ограничивай».

## Что действует

Redis 7.4.12, `reminders_redis`, named volume `project_redis_data`, IP `172.19.0.3`.
Порт наружу не опубликован. Пользователи:

| Пользователь | Доступ |
|---|---|
| default | Выключен, команды и ключи запрещены |
| app | Отдельный случайный пароль; явный список команд Laravel; только `reminders-app-database-*`; без pub/sub |
| health | Отдельный пароль, только PING, без доступа к данным |
| operator | Администрирование; отдельный пароль доступен только из приватного host runtime |

Пароли сгенерированы из 32 случайных байтов каждый. ACL содержит SHA-256 паролей,
конфигурация примонтирована read-only из `production/redis-acl/`. Открытый пароль
приложения хранится в существующих private .env production/dev; секретов в Git нет.
Production .env остаётся 0600; dev .env изменён с 0644 на 0640, group 82 для PHP-FPM.
Владелец dev .env сохранён. Проверка от UID/GID 82 прошла.

Правила определены в `deploy/releases/redis_acl.py`, список `COMMANDS`.
Разрешены нужные операции со строками, списками, sorted sets, TTL, транзакциями,
соединением и Lua для Laravel queues/locks. Команды внутри Lua также проверяются ACL.
Запрещены CONFIG, REPLICAOF/SLAVEOF, MODULE, ACL, FLUSHALL/FLUSHDB, RESTORE,
MIGRATE, DEBUG, SHUTDOWN, SAVE/BGSAVE, MONITOR, KEYS/SCAN, FUNCTION, SCRIPT FLUSH,
pub/sub и ключи вне префикса. Принцип настройки сверён с
[официальной документацией ACL](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/).
Опасные команды проверялись через
[ACL DRYRUN](https://redis.io/docs/latest/commands/acl-dryrun/), без исполнения.

## Выполнение и проверки

1. Сохранены исходные Docker specifications, .env, Compose, RDB и fingerprints ключей.
2. Копия RDB поднята с новой ACL без сети, с отдельным data-каталогом, UID 999,
   read-only rootfs и без capabilities. PHP использовал реальный production-образ
   и неизменяемый backend release, отдельные tmpfs и тестовую БД SQLite в памяти.
3. Laravel-проба: cache put/get/add, счётчики, транзакция putMany/mget, rate limiter,
   Lua lock, session write/read/destroy, queue push/pop/delete, delayed migration,
   release/retry. Использованы только случайные тестовые ключи/очередь; jobs не исполнялись.
4. Перезапуск кандидата сохранил ACL; пробы после рестарта успешны.
5. В рабочем Redis временно добавлены именованные пользователи при прежнем default.
   .env обновлены на месте с сохранением inode bind mount; production PHP перезапущен,
   dev PHP-FPM получил USR2. Оба клиента прошли пробу под app до переключения Redis.
6. Записи кратко приостановлены, сделан SAVE, Redis заменён с тем же томом/IP/aliases
   и постоянным read-only ACL mount. Default выключен. Этап Redis занял 1,58 секунды;
   это не измерение полного пользовательского перерыва с учётом PHP reload.
7. Три исходных ключа совпали по SHA-256 DUMP. Данные не очищались; RDB сохранены
   до подготовки и при переключении, SHA-256 записаны отдельно.
8. Оба PHP-клиента повторно прошли интеграционные пробы, дополнительно проверен UID 82.
   Redis healthy, исходный data volume сохранён, ACL mount read-only.
9. 21 отрицательная проверка ACL DRYRUN; реальные NOAUTH/WRONGPASS, запрет чтения
   чужих ключей/CONFIG и попыток через Lua. Health не может читать ключи.
10. Production smoke и все 41 HTTP/TLS/asset-проверки прошли. В проверенном ACL LOG
    только намеренные отказы отрицательных проб. Соседние контейнеры сохранили
    состояние/время запуска; временный кандидат удалён, копия данных оставлена.

Production release приложения остаётся `r9e7ac28-ops16`.
Insure Platform остаётся отключённым. Compose down не выполнялся.

## Закрепление и восстановление

Изменены оба repository Compose-файла и активный источник
`/home/vselug/workspace/Napominalky/backend/docker-compose.yml`.
`REDIS_ACL_DIR` обязателен; healthcheck использует отдельный ping-only пароль из файла.
Рабочая конфигурация проверена Docker Compose без вывода секретов.

Доказательства: `/home/vselug/workspace/Napominalky-runtime/redis-acl-20261119/`
(каталог 0700, обычные файлы 0600): `credentials.private.json`, env backups,
RDB/контрольные суммы, inventories, candidate restart и Laravel results,
`verification.json`, `production-smoke.txt`, `http-tls.txt`, private Docker snapshots.
ACL не входит в RDB: конфигурацию и секреты необходимо сохранять отдельно.

`reminders_redis-before-ops23` остановлен, restart=no, сети отключены. Старые
контейнеры используют тот же текущий том; их параллельный запуск запрещён.
Откат инструментом не потребовался и на production не проверялся. Его аварийный
путь восстанавливает текущие данные и app-пользователя в прежнем контейнере,
но оставляет legacy default доступным: такой откат требует повторного включения
защищённой ACL. Старые RDB поверх живых данных не восстанавливать.

## Эксплуатационные ограничения

- `cache:clear` и часть `optimize:clear` используют FLUSHDB и теперь получают отказ.
  Для приложения — адресное удаление ключей. Полная очистка требует operator
  и отдельной оценки затрагиваемых данных.
- Horizon/queue worker не запускались; проверены операции очереди, а не отправка
  реальных уведомлений. Перед включением Horizon проверить его дополнительные команды.
- Разрешённый SELECT не изолирует логические DB: защита app основана на префиксе ключей.
  Lua остаётся необходимым для Laravel; ACL не устраняет все риски ошибок Redis/DoS.
- ACL не заменяет сегментацию сетей и расследование инцидента Insure. Следующий этап:
  сетевые границы, минимальные DB-роли и оценка затронутых секретов.
