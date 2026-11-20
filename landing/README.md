# Лендинг Напоминалок (WEB-71 / WEB-72)

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

## Языки

Одна разметка `site/index.html` / `site/data.html` служит русским исходником.
`locales/en.json` переводит текстовые узлы, metadata и доступные подписи при сборке;
непереведённая русская строка останавливает сборку. JS читает переведённые подписи из HTML.
Перевод не требует JavaScript, сетевого запроса или cookies. Флажок — обычная ссылка
на другой язык: показывает флаг текущей страницы (RU — Россия, EN — Великобритания).
Изображение 21×14 без заметной рамки, доступная подпись поясняет переключение,
область нажатия остаётся 44×44; JS только сохраняет
якорь раздела. При перезагрузке язык определяется URL, принудительного редиректа нет.

По умолчанию RU расположен в `/`, EN — в `/en/`; страница данных есть на обоих языках.
Canonical, OpenGraph, hreflang и sitemap генерируются для выбранной схемы размещения.
`site/` содержит исходники: preview и публикацию запускать из результата `build.py`.

Для будущего отдельного .com подготовлен режим `--mode english`: английский в `/`,
его страница данных — `/data.html`, флажок ведёт на русский домен. Пример ниже
использует **зарезервированный example.com только как заполнитель**, не адрес продукта:

```bash
python3 landing/build.py --mode english --en-url https://example.com/ \
  --ru-url https://www.napominalky.ru/ \
  --output /tmp/napominalky-english-build \
  --apk /home/vselug/workspace/Napominalky-artifacts/mob77/napominalky-1.0.8-52.apk
```

При выборе .com нужны его реальный адрес, DNS/TLS и отдельный vhost/контейнер;
не заменять русскую площадку английской сборкой. Publisher текущего VPS рассчитан
на двуязычную `.ru`-площадку. Междоменные hreflang и переключатель на русской площадке
обновить одновременно с будущим переносом EN: собрать RU с `--mode russian`
и теми же `--ru-url` / `--en-url`. В обеих сборках x-default остаётся RU,
а robots/sitemap перечисляют только страницы своего домена. Кабинет и APK этим переводом
не локализуются: их текущие адреса сохранены.

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

WEB-72: `python3 -m unittest discover -s landing/checks -p 'test_*.py' -v`
проверяет перевод, экранирование, отказ при неполном переводе, SEO и отдельный домен.
Этот шаг включён в GitHub Actions. Браузерный сценарий теперь проверяет оба языка на
1440/1024/768/390/320 px, флажок/клавиатуру/hash/reload и навигацию без JavaScript.
Для отдельного английского preview: `LANDING_LANGUAGES=en LANDING_EN_PATH=/`
и `LANDING_CANONICAL_EN=https://example.com/` вместе с обычными настройками проверки.

Публикация и откат — [deploy/landing](../deploy/landing/README.md).
