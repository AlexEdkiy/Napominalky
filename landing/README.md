# Лендинг Напоминалок (WEB-71)

Статическая реализация предоставленного `web/design/Напоминалки — лендинг.html`.
Исходный файл в основной рабочей копии не изменяется; его SHA-256 — в
`design-source.json`. `site/` содержит HTML, небольшой JS интерактивного примера,
адаптивные стили, исходную иллюстрацию и локальные Roboto WOFF2 с лицензией.
Редактор, React и упаковщик из макета не нужны для опубликованной страницы.

Канонический адрес — https://www.napominalky.ru/, apex перенаправляется на www.
Вход/регистрация ведут на lk.napominalky.ru. Гость и офлайн относятся к Android;
кнопка скачивания выдаёт прежний проверенный APK MOB-77 1.0.8 (52), без пересборки.
Сведения о нём закреплены в `android-release.json`; сам APK не хранится в Git.
Демо не обращается к API, не сохраняет записи и не отправляет их в Telegram.

## Сборка

Запускать из чистой рабочей копии проверенного SHA:

```bash
python3 landing/build.py \
  --output /home/vselug/workspace/Napominalky-artifacts/web71/site-build \
  --apk /home/vselug/workspace/Napominalky-artifacts/mob77/napominalky-1.0.8-52.apk
python3 deploy/landing/prepare.py --ref HEAD \
  --root /home/vselug/workspace/Napominalky-artifacts/web71/releases \
  --release-id landing-web71-20261119 \
  --content /home/vselug/workspace/Napominalky-artifacts/web71/site-build
```

Выходной каталог должен быть новым. Сборщик сверяет размер/SHA-256 APK.
Упаковщик создаёт manifest с хешами и неизменяемые файлы; сайт не содержит секретов.

## Проверка

Для локальной проверки нужен статический HTTP-сервер. `checks/browser.cjs`
проверяет 1440/390/320/768 px, меню, клавиатуру/мышь, прогресс списка, ссылки,
изображение, отсутствие внешних запросов и переполнения, HEAD APK и настоящий 404.
Настройки: `LANDING_URL`, `CHECK_OUTPUT`, `PLAYWRIGHT_MODULE`, `CHROMIUM_BINARY`.
Скриншоты требуют визуальной самопроверки; эмуляция не равна физическому устройству.

Публикация и откат — [deploy/landing](../deploy/landing/README.md).
