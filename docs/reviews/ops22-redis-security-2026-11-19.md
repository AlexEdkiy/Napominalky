# OPS-22: обновление Redis Напоминалок

Дата: 2026-11-19 (Москва). Ветка: `ops22-redis-security`.
Исполнитель: Codex; проверка — самопроверка. Основание: прямое поручение пользователя.

## Результат

Рабочий `reminders_redis` обновлён с 7.4.8 до **7.4.12-alpine**.
Образ: `redis:7.4.12-alpine@sha256:7f7d30b7fdd09467bac58198a1f166dd69789d348d4fe859cccb20e0cf287fbe`.
Официальные [release notes](https://raw.githubusercontent.com/redis/redis/7.4.12/00-RELEASENOTES)
описывают исправления безопасности последующих patch-версий ветки 7.4.

Сохранены named volume `project_redis_data`, адрес `172.19.0.3`, сетевые aliases,
healthcheck, политика перезапуска и конфигурация persistence. Публикаций портов нет.
Три исходных ключа в db0 (включая списки очереди) совпали по SHA-256 сериализации
DUMP до и после переключения. Имена и содержимое ключей в Git не включены.
Переключение заняло 3,4 секунды по таймеру инструмента; это не измерение доступности
каждого пользовательского запроса. Production release приложения — `r9e7ac28-ops16`.

## Подготовка и проверки

- Сохранены исходный Docker inspect, настройки и RDB; для двух RDB рассчитаны SHA-256.
- Копия RDB загружена Redis 7.4.12 в отдельном контейнере с network=none, UID 999,
  без capabilities, read-only rootfs и отдельным writable data-каталогом.
- PHP из действующего production-образа подключён к изолированному Redis через его
  network namespace. Проба использует настоящий Laravel, отдельные ключи и очередь:
  cache put/get/delete, Lua lock acquire/release, session write/read/destroy,
  queue push/pop/delete. Задания не исполняются; отправка уведомлений не проверяется.
- На копии проверен SAVE при CLIENT PAUSE WRITE; затем перед переключением
  приостановлены записи, сняты fingerprints, выполнен SAVE и graceful stop.
- Новый контейнер поднят с прежним томом и адресом. Redis 7.4.12 отвечает PONG,
  Docker health — healthy, persistence проверен. Та же Laravel-проба на рабочем
  release прошла, тестовые ключи удалены.
- Штатный production smoke прошёл: API health, отсутствие авторизации, валидация
  пустого login, оба SPA, release marker, assets и заголовки кеширования/безопасности.
- Все 41 HTTP/TLS/asset-проверки существующих сайтов прошли.
- Cron `schedule:run` присутствует, `schedule:list` показывает ожидаемую hourly-задачу.
  Queue worker не работал до обновления; его запуск не входит в этот этап.
- Состояние и время запуска остальных исходных контейнеров не изменились.
  Insure Platform остаётся отключённым. Временный кандидат удалён после проверки.

## Закрепление и артефакты

Digest записан в `backend/docker-compose.yml` и `backend/docker-compose.prod.yml`.
У действующего DB/Redis Compose источник находится в старой основной копии:
`/home/vselug/workspace/Napominalky/backend/docker-compose.yml`; там также изменена
только строка Redis image, итоговая Compose-конфигурация проверена. Compose down/up
не выполнялись. Изменения основной копии не являются выпуском приложения.

Инструменты: `deploy/releases/upgrade_redis.py`, `redis_probe.php`.
Приватные доказательства: `/home/vselug/workspace/Napominalky-runtime/redis-security-20261119/`.
Каталог 0700, файлы 0600; там сохранены `dump.preflight.rdb`, `dump.cutover.rdb`,
`backup-sha256.json`, candidate/Laravel results, before/after inventories,
`state.json`, `verification.json`, `smoke-final.txt` и Docker specifications.

Старый `reminders_redis-before-ops22` остановлен, restart=no, без сетей.
Он ссылается на текущий том: запуск одновременно с рабочим Redis запрещён.
При аварийном возврате бинарника использовать актуальный том; старый RDB поверх
живых данных не восстанавливать. Production downgrade не выполнялся и отдельно
не проверялся; 7.4.8 возвращает прежние риски безопасности.

## Ограничения и следующий шаг

ACL/default user и аутентификация Redis сохраняют прежнюю конфигурацию.
Следующий этап — минимальные ACL с учётом Laravel Lua/queues/sessions и сегментация
сетей. Обновление Redis не закрывает расследование инцидента Insure и не доказывает
отсутствия компрометации хоста; границы прежней проверки описаны в
[SEC-2/OPS-21](sec2-redis-incident-2026-11-19.md).
