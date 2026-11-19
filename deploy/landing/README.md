# Статический хостинг лендинга

После OPS-18 production — **195.206.252.160**, SSH `devops`, host nginx →
`127.0.0.1:18089` → readonly-контейнер `napominalky_landing` в сети
`napominalky_frontend`. Артефакты: `/srv/napominalky/landing/releases/`.
Канонический адрес https://www.napominalky.ru/, apex → www; кабинет отдельно на lk.
Новый сертификат Let's Encrypt для apex/www — до 2027-02-17, certbot.timer,
webroot `/var/www/napominalky-acme`, deploy hook проверяет и перечитывает host nginx.
Предыдущая площадка и история: [OPS-17](../../docs/reviews/ops17-landing-domain-2026-11-18.md),
[перенос и ограничения](../../docs/reviews/ops18-target-migration-2026-11-19.md).
Не запускать прежние контейнеры или Compose из старой среды.

## Артефакт

Исходники WEB-71 находятся в `landing/site/`; сборка — [landing/README.md](../../landing/README.md).
`prepare.py --ref <SHA> --root <вне-Git> --release-id <ID> --content <сборка>`
создаёт `public/`, nginx.conf, release.json и manifest с хешами. `--verify <артефакт>`
сверяет содержимое. Без --content получается прежняя заглушка 503/noindex.
В исходники/сборку не включать .env, .git, node_modules или пользовательские данные.

## Публикация на текущем VPS

Передать проверенный артефакт и `publish_vps.py` в отдельную папку внутри
`/home/devops/napominalky-deploy/`. Проверить SHA-256 переданных файлов.
Публикация разрешена пользователем в задаче WEB-71; повторное согласие на тот же
выпуск не требуется. Временный полный sudo после миграции удалён: административную
команду выполняет владелец в своей SSH-сессии либо согласованный исполнитель.

```bash
sudo python3 /home/devops/napominalky-deploy/web71/publish_vps.py \
  --artifact /home/devops/napominalky-deploy/web71/landing-web71-20261119
```

Скрипт проверяет manifest, копирует артефакт в root-owned releases, запускает
отдельный тестовый контейнер на 127.0.0.1:18090, проверяет конфигурацию, HTML,
ресурсы, 404 и частичное скачивание APK. Затем заменяет только landing-контейнер
на порту 18089, сохраняет предыдущий и выполняет smoke приложения/API.
При ошибке переключения возвращает прежний контейнер. Host nginx имеет постоянный
loopback upstream: менять/reload его, API, БД, Redis и scheduler не требуется.
Итог — `/srv/napominalky/landing/deployments/<ID>.json` и `target.env`.
После запуска проверить публичный release.json, HTTPS/редирект, ресурсы и кабинет.

## Ручной откат

Только если public smoke выявил проблему после успешного переключения: проверить
ID текущего и сохранённого контейнеров по deployment JSON, остановить текущий
landing и сохранить его под другим именем, переименовать `previous_container`
обратно в `napominalky_landing`, вернуть ему `restart=unless-stopped` и запустить.
Проверить прежний release.json и обновить target.env. Не менять данные приложения.
Предыдущая заглушка `ops17-bootstrap` возвращает 503 намеренно; для неё это норма.
