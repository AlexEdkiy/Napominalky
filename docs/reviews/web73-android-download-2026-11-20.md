# WEB-73 — APK 1.0.9 (53) на лендинге

20 ноября 2026. Ветка `web73-android-download`, Codex, самопроверка.

По просьбе пользователя обновлены ссылка и версия Android на русском/английском
лендинге: `/downloads/napominalky-1.0.9-53.apk`, APK 1.0.9, 116 МБ.
Используется готовый MOB-78, без пересборки. Размер 121137666 байт,
SHA-256 `a5019d1c2931069d95b1e70b241e127d3ef242a2945b0364a57195d405e74dbd`,
исходный мобильный коммит `5483795735b6ecbb9d111b5c431e017ff93eb5da`.

Manifest скачивания, браузерный сценарий и preflight publisher обновлены на новый
файл. 9 тестов локализации и сборка RU/EN с проверкой размера/SHA-256 APK прошли.
Кабинет/API/БД и дизайн лендинга не изменяются.

SSH devops доступен; `sudo -n true` требует интерактивной аутентификации.
Временный sudo удалён после миграции. Текущий public release при начале работы:
`landing-web72-20261120-r2`.

## Проверенный пакет на VPS

Source `2b9c717d693b5cabda7444a74813f70b1e406a27`,
[CI success](https://github.com/AlexEdkiy/Napominalky/actions/runs/44714416156).
Неизменяемый артефакт `landing-web73-20261120`: 18 файлов, nginx config/publisher
smoke, RU/EN/404/редирект `/en`, APK Range 206 прошли в отдельном readonly-контейнере.
Браузерный сценарий прошёл RU/EN на 1440/1024/768/390/320: новый href, версия и
размер APK; меню, флаги, hash/клавиатура/no-JS, отсутствие overflow и ошибок.
В проверке подписи уточнён селектор по тексту APK: общий `.download-meta` также
совпадал с подписями iPhone и регистрации. Повторный прогон успешен;
эта корректировка относится только к проверяющему скрипту, не к public-файлам артефакта.
Просмотрены блоки скачивания RU mobile / EN desktop. Физический телефон не проверялся.

На VPS пакет: `/home/devops/napominalky-deploy/web73/landing-web73-20261120`.
После передачи сверены архив/publisher, затем все 18 файлов через `verify()`;
обе страницы содержат новый путь/версию, SHA-256 APK соответствует MOB-78.
Архив SHA-256 `935f042fdd6c15a78a85976230be99786cee302d7562114f95f2eba6721ea8fb`.
Publisher SHA-256 `3202568bda83e7059ab016c0ebcba291b4281c86c1f7fffc2c6d546071fab293`.
Артефакты: `Napominalky-artifacts/web73/artifact-smoke.json`, `browser/`,
`transfer.json`, `verified-vps.json`. Самопроверка автора, не независимое ревью.

Владельцу передана команда:

```bash
sudo python3 /home/devops/napominalky-deploy/web73/publish_vps.py \
  --artifact /home/devops/napominalky-deploy/web73/landing-web73-20261120
```

Publisher сохраняет предыдущий контейнер для отката, проверяет candidate до
переключения и кабинет/API после него. На момент передачи команды public release
остаётся WEB-72 r2; WEB-73 ещё не опубликован. Следующий шаг: получить результат
запуска, проверить public release.json, RU/EN ссылки/подписи, HEAD/Range APK,
HTTPS/редиректы и неизменность релиза кабинета, затем завершить WEB-73.

## Публикация подтверждена — WEB-73 завершён

Владелец выполнил команду. Deployment JSON: `phase: active`,
`published_at: 2026-11-20T09:59:00.715599+00:00` — **20 ноября, 12:59 МСК**.
`target.env` и публичный `release.json` подтверждают `landing-web73-20261120`
и source `2b9c717d693b5cabda7444a74813f70b1e406a27`.
Предыдущий контейнер `napominalky_landing-before-landing-web73-20261120`
сохранён для отката к WEB-72 r2.

После переключения проверены SHA-256 16 публичных файлов, размер/полная SHA-256
APK в активном каталоге на VPS, HTTPS HEAD 200 и Range 206 нового APK,
RU/EN ссылки/версия, apex → www, `/en` → `/en/`, настоящий 404.
Полный APK повторно по HTTP не скачивался: целостность проверена на VPS,
публичный download проверен через HEAD/Range. Кабинет остаётся `r9e7ac28-ops18`;
новый и прежний API без токена отвечают 401.

Chromium на публичном HTTPS: RU/EN при 1440 и 390 px, новый путь APK/версия/размер,
отсутствие горизонтального переполнения и JS-ошибок. Просмотрены блоки скачивания
RU mobile и EN desktop. Физическое устройство не использовалось.
Артефакты: `web73/public-smoke.json`, `web73/active-vps.json`, `web73/browser-public/`.
Публикация завершена, дополнительных действий владельца для WEB-73 не требуется.
