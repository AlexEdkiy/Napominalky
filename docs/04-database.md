# 4. PostgreSQL

## Основные положения

Данный документ описывает стандарты написания SQL-кода и работы с PostgreSQL 17+ в проектах на Laravel 12+. Правила распространяются на все запросы, схемы, миграции и взаимодействие с базой данных.

### Стиль оформления

**Плохо:**

```sql
SELECT u.id, u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE u.active = true AND o.total > 100 ORDER BY o.total DESC;
```

**Хорошо:**

```sql
SELECT
    u.id,
    u.name,
    o.total
FROM users AS u
JOIN orders AS o
    ON u.id = o.user_id
WHERE
    u.is_active = true
    AND o.total > 100
ORDER BY o.total DESC;
```

---

## Соглашения о наименовании

### Общие правила

- Используйте `snake_case` для всех идентификаторов.
- Используйте только строчные буквы.
- Используйте английские слова, отражающие суть.
- Избегайте аббревиатур, за исключением общепринятых (`id`, `url`, `ip`).
- Избегайте зарезервированных слов SQL в качестве идентификаторов.
- Не используйте префиксы типа `tbl_`, `vw_`, `sp_`.

### Таблицы

- Имена таблиц — во множественном числе, `snake_case`: `users`, `order_items`, `product_categories`.
- Сводные (pivot) таблицы — два существительных в алфавитном порядке, в единственном числе: `order_product`, `role_user`, `tag_post`.
- Не используйте кавычки вокруг имён таблиц.

| Плохо             | Хорошо          |
|-------------------|-----------------|
| `tbl_users`       | `users`         |
| `UserOrders`      | `user_orders`   |
| `order_product_pivot` | `order_product` |

### Столбцы

- Имена столбцов — в единственном числе, `snake_case`.
- Первичный ключ: `id` (тип `BIGSERIAL` или `UUID`).
- Внешние ключи: `{singular_table}_id`, например `user_id`, `order_id`.
- Булевые столбцы: `is_active`, `has_verified_email`, `can_publish`.
- Временные метки: `created_at`, `updated_at`, `deleted_at`.

| Плохо           | Хорошо           |
|-----------------|------------------|
| `userId`        | `user_id`        |
| `active`        | `is_active`      |
| `datetime`      | `created_at`     |
| `cat_id`        | `category_id`    |

### Псевдонимы (Aliases)

- Псевдонимы таблиц — первая буква имени таблицы, или значимое сокращение при конфликтах.
- Всегда используйте ключевое слово `AS`.
- Псевдонимы столбцов — только при необходимости, в `snake_case`.

```sql
SELECT
    u.id,
    u.name,
    COUNT(o.id) AS orders_count
FROM users AS u
LEFT JOIN orders AS o
    ON o.user_id = u.id
GROUP BY u.id, u.name;
```

### Функции и процедуры

- Имена функций — `snake_case`, глагол + существительное: `calculate_total`, `get_user_permissions`.
- Имена процедур — аналогично: `process_payment`, `sync_inventory`.
- Триггерные функции — суффикс `_trigger`: `update_timestamp_trigger`.

### Индексы

Формат: `{table}_{columns}_{type}`

| Тип           | Пример                          |
|---------------|---------------------------------|
| Уникальный    | `users_email_unique`            |
| Обычный       | `orders_user_id_index`          |
| Составной     | `orders_status_created_at_index` |
| Частичный     | `users_email_active_index`      |
| GIN           | `posts_body_gin`                |
| GiST          | `events_period_gist`            |

### Универсальные суффиксы

| Суффикс     | Значение                             |
|-------------|--------------------------------------|
| `_id`       | Уникальный идентификатор             |
| `_at`       | Дата и время события                 |
| `_date`     | Дата события                         |
| `_count`    | Количество                           |
| `_total`    | Итоговая сумма                       |
| `_name`     | Имя или название                     |
| `_type`     | Тип или категория                    |
| `_status`   | Статус                               |
| `_is_`      | Булев флаг (префикс)                 |
| `_has_`     | Булев флаг наличия (префикс)         |

---

## Синтаксис запросов

### Зарезервированные слова

- Пишите зарезервированные слова SQL ЗАГЛАВНЫМИ БУКВАМИ: `SELECT`, `FROM`, `WHERE`, `JOIN`, `ON`, `AND`, `OR`, `NOT`, `IN`, `IS`, `NULL`, `BETWEEN`, `CASE`, `WHEN`, `THEN`, `ELSE`, `END`, `GROUP BY`, `ORDER BY`, `HAVING`, `LIMIT`, `OFFSET`, `UNION`, `EXCEPT`, `INTERSECT`.
- Имена объектов (таблицы, столбцы, псевдонимы) пишите строчными буквами.

### Пробелы и выравнивание

Используйте пробелы для повышения читаемости:

- Вокруг операторов сравнения: `=`, `<>`, `>`, `<`, `>=`, `<=`.
- После запятых.
- Вокруг ключевых слов.

**Плохо:**

```sql
SELECT id,name,email FROM users WHERE id=1 AND is_active=true;
```

**Хорошо:**

```sql
SELECT id, name, email
FROM users
WHERE id = 1
    AND is_active = true;
```

### Переносы строк

Каждое из следующих ключевых слов начинается с новой строки:

- `SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`
- `JOIN`, `LEFT JOIN`, `RIGHT JOIN`, `FULL JOIN`, `CROSS JOIN`
- `UNION`, `EXCEPT`, `INTERSECT`
- `ON` при многострочном условии

```sql
SELECT
    u.id,
    u.name,
    p.title
FROM users AS u
JOIN posts AS p
    ON p.user_id = u.id
WHERE
    u.is_active = true
    AND p.published_at IS NOT NULL
ORDER BY p.published_at DESC
LIMIT 20
OFFSET 0;
```

### Отступы

- Используйте 4 пробела для отступов.
- Перечисление столбцов после `SELECT` — с отступом в 4 пробела.
- Условия `WHERE` — с отступом в 4 пробела, логические операторы (`AND`, `OR`) — в начале строки.
- Условие `ON` — с отступом в 4 пробела относительно `JOIN`.

### JOIN

- Всегда явно указывайте тип JOIN.
- Избегайте неявных соединений через `WHERE`.
- Условие `ON` — отдельной строкой с отступом.
- При нескольких условиях соединения — каждое на отдельной строке.

**Плохо:**

```sql
SELECT * FROM users, orders WHERE users.id = orders.user_id;
```

**Хорошо:**

```sql
SELECT
    u.id,
    u.name,
    o.total
FROM users AS u
INNER JOIN orders AS o
    ON o.user_id = u.id
    AND o.status = 'completed';
```

### Подзапросы

- Подзапросы заключайте в скобки и давайте им псевдонимы.
- Предпочитайте CTE (`WITH`) сложным вложенным подзапросам.
- Выравнивайте подзапросы согласно общим правилам отступов.

**Плохо:**

```sql
SELECT * FROM (SELECT id, name FROM users WHERE is_active = true) t WHERE t.name LIKE 'A%';
```

**Хорошо:**

```sql
WITH active_users AS (
    SELECT id, name
    FROM users
    WHERE is_active = true
)
SELECT *
FROM active_users
WHERE name LIKE 'A%';
```

### Дополнительные правила

- Используйте `IS NULL` и `IS NOT NULL` вместо `= NULL`.
- Используйте `BETWEEN` для диапазонов: `created_at BETWEEN '2024-01-01' AND '2024-12-31'`.
- Используйте `IN` вместо множества условий `OR`.
- Избегайте `SELECT *` в production-коде — перечисляйте столбцы явно.
- Всегда используйте параметризованные запросы для значений из пользовательского ввода.
- Завершайте запросы точкой с запятой.

---

## Синтаксис CREATE TABLE

### Типы данных

Используйте PostgreSQL-native типы:

| Назначение               | Тип PostgreSQL                   |
|--------------------------|----------------------------------|
| Первичный ключ (auto)    | `BIGSERIAL` / `SERIAL`           |
| Первичный ключ (UUID)    | `UUID`                           |
| Целое число              | `SMALLINT`, `INTEGER`, `BIGINT`  |
| Дробное число            | `NUMERIC(p,s)`, `REAL`, `DOUBLE PRECISION` |
| Строка переменной длины  | `VARCHAR(n)`, `TEXT`             |
| Дата                     | `DATE`                           |
| Дата и время             | `TIMESTAMPTZ` (с часовым поясом) |
| Булево значение          | `BOOLEAN`                        |
| JSON                     | `JSONB` (предпочтительно), `JSON`|
| Массив                   | `INTEGER[]`, `TEXT[]`            |
| IP-адрес                 | `INET`, `CIDR`                   |
| UUID                     | `UUID`                           |
| Полнотекстовый поиск     | `TSVECTOR`                       |
| Диапазон                 | `TSTZRANGE`, `DATERANGE`, `INT4RANGE` |

Избегайте MySQL-совместимого синтаксиса: `INT(5)`, `TINYINT(1)`, `DATETIME`. Вместо `DATETIME` используйте `TIMESTAMPTZ`.

### Значения по умолчанию

```sql
is_active   BOOLEAN     NOT NULL DEFAULT true,
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
metadata    JSONB       NOT NULL DEFAULT '{}',
tags        TEXT[]      NOT NULL DEFAULT '{}',
```

### Ограничения

- Именуйте ограничения явно по формату `{table}_{column(s)}_{type}`.
- Ограничения уровня таблицы пишите после определения столбцов.
- `NOT NULL` — рядом с типом данных.

```sql
CONSTRAINT users_email_unique UNIQUE (email),
CONSTRAINT orders_total_check CHECK (total >= 0),
CONSTRAINT order_items_pkey PRIMARY KEY (id),
```

### Внешние ключи

```sql
CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id)
    REFERENCES orders (id)
    ON DELETE CASCADE,
```

### Полный пример CREATE TABLE

```sql
CREATE TABLE order_items (
    id          BIGSERIAL       NOT NULL,
    order_id    BIGINT          NOT NULL,
    product_id  BIGINT          NOT NULL,
    quantity    INTEGER         NOT NULL DEFAULT 1,
    unit_price  NUMERIC(10, 2)  NOT NULL,
    discount    NUMERIC(5, 2)   NOT NULL DEFAULT 0.00,
    metadata    JSONB           NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT order_items_pkey
        PRIMARY KEY (id),
    CONSTRAINT order_items_order_id_fkey
        FOREIGN KEY (order_id)
        REFERENCES orders (id)
        ON DELETE CASCADE,
    CONSTRAINT order_items_product_id_fkey
        FOREIGN KEY (product_id)
        REFERENCES products (id)
        ON DELETE RESTRICT,
    CONSTRAINT order_items_quantity_check
        CHECK (quantity > 0),
    CONSTRAINT order_items_unit_price_check
        CHECK (unit_price >= 0),
    CONSTRAINT order_items_discount_check
        CHECK (discount BETWEEN 0 AND 100)
);
```

---

## Типы данных PostgreSQL

### UUID

Используйте `UUID` в качестве первичного ключа, когда:

- Требуется глобальная уникальность (распределённые системы, интеграции с внешними сервисами).
- Идентификаторы не должны быть предсказуемыми (безопасность).
- Планируется горизонтальное масштабирование или шардинг.

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tokens (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id    BIGINT      NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT tokens_pkey PRIMARY KEY (id)
);
```

Используйте `BIGSERIAL` для внутренних таблиц с высокой нагрузкой на запись — это быстрее UUID.

### JSONB

`JSONB` хранит JSON в бинарном формате с поддержкой индексирования. Используйте `JSONB` вместо `JSON` почти всегда.

Когда использовать:
- Хранение гибких атрибутов, схема которых заранее неизвестна.
- Данные конфигурации и настройки.
- Логи событий с переменной структурой.
- Хранение данных внешних API.

Когда не использовать:
- Атрибуты требуют частых запросов и фильтрации — лучше нормализовать.
- Данные строго структурированы и не меняются.

```sql
CREATE TABLE products (
    id         BIGSERIAL NOT NULL,
    name       VARCHAR(255) NOT NULL,
    attributes JSONB     NOT NULL DEFAULT '{}',

    CONSTRAINT products_pkey PRIMARY KEY (id)
);

-- Запрос по JSONB-полю
SELECT name, attributes->>'color' AS color
FROM products
WHERE attributes @> '{"size": "XL"}';
```

### Массивы

Используйте массивы для хранения однородных коллекций значений небольшого размера.

```sql
CREATE TABLE articles (
    id   BIGSERIAL    NOT NULL,
    tags TEXT[]       NOT NULL DEFAULT '{}',
    meta INTEGER[]    NOT NULL DEFAULT '{}',

    CONSTRAINT articles_pkey PRIMARY KEY (id)
);

-- Поиск по элементу массива
SELECT id, tags
FROM articles
WHERE 'postgresql' = ANY(tags);

-- Поиск по вхождению подмассива
SELECT id
FROM articles
WHERE tags @> ARRAY['postgresql', 'performance'];
```

### hstore

Расширение `hstore` хранит пары ключ-значение. В большинстве случаев предпочтительнее `JSONB`.

```sql
CREATE EXTENSION IF NOT EXISTS hstore;

CREATE TABLE settings (
    id     BIGSERIAL NOT NULL,
    config hstore    NOT NULL DEFAULT '',

    CONSTRAINT settings_pkey PRIMARY KEY (id)
);
```

### inet / cidr

Специализированные типы для IP-адресов с поддержкой операторов сравнения и функций.

```sql
CREATE TABLE access_logs (
    id         BIGSERIAL NOT NULL,
    ip_address INET      NOT NULL,
    network    CIDR,

    CONSTRAINT access_logs_pkey PRIMARY KEY (id)
);

-- Поиск адресов в подсети
SELECT ip_address
FROM access_logs
WHERE ip_address << '192.168.1.0/24'::CIDR;
```

### Диапазоны (Range Types)

```sql
CREATE TABLE events (
    id        BIGSERIAL   NOT NULL,
    title     VARCHAR(255) NOT NULL,
    period    TSTZRANGE   NOT NULL,

    CONSTRAINT events_pkey PRIMARY KEY (id),
    CONSTRAINT events_period_excl
        EXCLUDE USING GIST (period WITH &&)
);

-- Поиск событий в периоде
SELECT title
FROM events
WHERE period && '[2024-06-01, 2024-06-30]'::TSTZRANGE;
```

Доступные типы диапазонов: `INT4RANGE`, `INT8RANGE`, `NUMRANGE`, `TSRANGE`, `TSTZRANGE`, `DATERANGE`.

### tsvector

Используется для хранения предобработанных данных полнотекстового поиска.

```sql
CREATE TABLE documents (
    id       BIGSERIAL NOT NULL,
    title    TEXT      NOT NULL,
    body     TEXT      NOT NULL,
    ts_body  TSVECTOR  GENERATED ALWAYS AS (to_tsvector('russian', body)) STORED,

    CONSTRAINT documents_pkey PRIMARY KEY (id)
);
```

---

## Индексы

### B-tree (по умолчанию)

Подходит для операторов `=`, `<`, `>`, `<=`, `>=`, `BETWEEN`, `IN`, `IS NULL`, `LIKE 'prefix%'`.

```sql
-- Обычный индекс
CREATE INDEX users_email_index ON users (email);

-- Уникальный индекс
CREATE UNIQUE INDEX users_email_unique ON users (email);

-- Составной индекс (порядок столбцов важен)
CREATE INDEX orders_user_id_created_at_index ON orders (user_id, created_at DESC);
```

### GIN (Generalized Inverted Index)

Оптимален для `JSONB`, `ARRAY`, полнотекстового поиска (`TSVECTOR`). Медленнее при записи, быстрее при поиске.

```sql
-- Для JSONB
CREATE INDEX products_attributes_gin ON products USING GIN (attributes);

-- Для массивов
CREATE INDEX articles_tags_gin ON articles USING GIN (tags);

-- Для полнотекстового поиска
CREATE INDEX documents_ts_body_gin ON documents USING GIN (ts_body);
```

### GiST (Generalized Search Tree)

Оптимален для геометрических данных, диапазонов, полнотекстового поиска. Поддерживает ограничение `EXCLUDE`.

```sql
-- Для диапазонов
CREATE INDEX events_period_gist ON events USING GIST (period);

-- Для tsvector (альтернатива GIN)
CREATE INDEX documents_ts_body_gist ON documents USING GIST (ts_body);
```

### BRIN (Block Range Index)

Компактный индекс для очень больших таблиц с естественной физической сортировкой данных (логи, временные ряды). Занимает минимум места, но менее точен.

```sql
-- Для таблицы с миллиардами строк, упорядоченных по времени
CREATE INDEX access_logs_created_at_brin ON access_logs USING BRIN (created_at);
```

### Частичные индексы (Partial Indexes)

Индексируют только подмножество строк. Меньший размер, выше производительность.

```sql
-- Индекс только по активным пользователям
CREATE INDEX users_email_active_index
    ON users (email)
    WHERE is_active = true;

-- Индекс по необработанным заказам
CREATE INDEX orders_created_at_pending_index
    ON orders (created_at)
    WHERE status = 'pending';
```

### Индексы по выражениям (Expression Indexes)

```sql
-- Индекс по нижнему регистру для case-insensitive поиска
CREATE INDEX users_lower_email_index
    ON users (LOWER(email));

-- Использование:
SELECT * FROM users WHERE LOWER(email) = LOWER('User@Example.com');
```

### INCLUDE (покрывающие индексы)

Добавляют дополнительные столбцы в индекс без включения их в поиск. Позволяют выполнять Index-Only Scan.

```sql
CREATE INDEX orders_user_id_include_status
    ON orders (user_id)
    INCLUDE (status, total, created_at);
```

---

## Полнотекстовый поиск

PostgreSQL предоставляет встроенный полнотекстовый поиск без дополнительных расширений.

### Базовый поиск

```sql
-- Простой поиск
SELECT id, title
FROM articles
WHERE to_tsvector('russian', body) @@ to_tsquery('russian', 'PostgreSQL & производительность');
```

### Хранимый tsvector с GIN-индексом

```sql
CREATE TABLE articles (
    id        BIGSERIAL    NOT NULL,
    title     VARCHAR(255) NOT NULL,
    body      TEXT         NOT NULL,
    ts_search TSVECTOR     GENERATED ALWAYS AS (
        setweight(to_tsvector('russian', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('russian', COALESCE(body, '')), 'B')
    ) STORED,

    CONSTRAINT articles_pkey PRIMARY KEY (id)
);

CREATE INDEX articles_ts_search_gin ON articles USING GIN (ts_search);
```

### Ранжирование результатов

```sql
SELECT
    id,
    title,
    ts_rank(ts_search, query) AS rank
FROM articles,
     to_tsquery('russian', 'PostgreSQL & индекс') AS query
WHERE ts_search @@ query
ORDER BY rank DESC
LIMIT 10;
```

### tsquery операторы

| Оператор | Значение                          | Пример                        |
|----------|-----------------------------------|-------------------------------|
| `&`      | И (оба слова)                     | `'кот & пёс'`                 |
| `\|`     | ИЛИ (любое слово)                 | `'кот \| кошка'`              |
| `!`      | НЕ (исключение)                   | `'кот & !персидский'`         |
| `<->`    | Фраза (слова рядом)               | `'быстрый <-> запрос'`        |

---

## JSONB

### Операторы JSONB

| Оператор | Описание                                 | Пример                                    |
|----------|------------------------------------------|-------------------------------------------|
| `->`     | Получить значение как JSON               | `attributes->'color'`                     |
| `->>`    | Получить значение как TEXT               | `attributes->>'color'`                    |
| `#>`     | Получить по пути как JSON                | `attributes#>'{address,city}'`            |
| `#>>`    | Получить по пути как TEXT                | `attributes#>>'{address,city}'`           |
| `@>`     | Содержит (levél)                         | `attributes @> '{"active": true}'`        |
| `<@`     | Содержится в                             | `'{"a":1}' <@ attributes`                |
| `?`      | Ключ существует                          | `attributes ? 'color'`                    |
| `?|`     | Любой из ключей существует               | `attributes ?| ARRAY['color', 'size']`    |
| `?&`     | Все ключи существуют                     | `attributes ?& ARRAY['color', 'size']`    |
| `\|\|`   | Конкатенация                             | `attributes \|\| '{"new_key":"val"}'`     |
| `-`      | Удалить ключ                             | `attributes - 'temp_key'`                 |

### Примеры запросов

```sql
-- Выборка по значению JSONB-поля
SELECT id, name
FROM products
WHERE attributes->>'color' = 'red';

-- Проверка существования ключа
SELECT id
FROM products
WHERE attributes ? 'discount';

-- Глубокий поиск (containment)
SELECT id
FROM products
WHERE attributes @> '{"specs": {"ram": "16GB"}}';

-- Агрегация по JSONB-полю
SELECT
    attributes->>'category' AS category,
    COUNT(*) AS count
FROM products
GROUP BY attributes->>'category';
```

### Обновление JSONB

```sql
-- Добавить или обновить ключ
UPDATE products
SET attributes = attributes || '{"featured": true}'
WHERE id = 1;

-- Удалить ключ
UPDATE products
SET attributes = attributes - 'temp_field'
WHERE attributes ? 'temp_field';

-- Обновить вложенное значение
UPDATE products
SET attributes = jsonb_set(attributes, '{specs, ram}', '"32GB"')
WHERE id = 1;
```

### JSONB vs нормализованные таблицы

Используйте **JSONB**, когда:
- Схема данных нестабильна и часто меняется.
- Количество атрибутов сильно варьируется между строками (разреженные данные).
- Атрибуты используются для хранения, а не для сложных запросов.
- Данные поступают из внешних API в JSON-формате.

Используйте **нормализованные таблицы**, когда:
- Данные активно используются в `JOIN`, агрегациях, фильтрации.
- Требуются ограничения целостности на уровне БД.
- Атрибуты одинаковы для всех строк.
- Производительность запросов критична.

---

## Партиционирование

Партиционирование разбивает большую таблицу на физически отдельные части с единым логическим интерфейсом.

### Range партиционирование

Оптимально для данных с временной сортировкой (логи, транзакции).

```sql
CREATE TABLE orders (
    id         BIGSERIAL    NOT NULL,
    user_id    BIGINT       NOT NULL,
    total      NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_q1
    PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2
    PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Индексы создаются на партициях автоматически, если созданы на родительской таблице
CREATE INDEX orders_user_id_index ON orders (user_id);
```

### List партиционирование

Оптимально для данных с ограниченным набором категорий.

```sql
CREATE TABLE products (
    id       BIGSERIAL    NOT NULL,
    name     VARCHAR(255) NOT NULL,
    region   VARCHAR(50)  NOT NULL,
    status   VARCHAR(20)  NOT NULL
) PARTITION BY LIST (region);

CREATE TABLE products_eu
    PARTITION OF products
    FOR VALUES IN ('DE', 'FR', 'IT', 'ES');

CREATE TABLE products_us
    PARTITION OF products
    FOR VALUES IN ('US', 'CA', 'MX');

CREATE TABLE products_other
    PARTITION OF products
    DEFAULT;
```

### Hash партиционирование

Оптимально для равномерного распределения нагрузки без естественной сортировки.

```sql
CREATE TABLE user_events (
    id      BIGSERIAL NOT NULL,
    user_id BIGINT    NOT NULL,
    event   JSONB     NOT NULL
) PARTITION BY HASH (user_id);

CREATE TABLE user_events_0
    PARTITION OF user_events
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE user_events_1
    PARTITION OF user_events
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);

CREATE TABLE user_events_2
    PARTITION OF user_events
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);

CREATE TABLE user_events_3
    PARTITION OF user_events
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

---

## Common Table Expressions (CTE)

`WITH`-выражения улучшают читаемость сложных запросов и позволяют повторно использовать подзапросы.

### Базовый CTE

```sql
WITH
    active_users AS (
        SELECT id, name, email
        FROM users
        WHERE is_active = true
    ),
    recent_orders AS (
        SELECT user_id, COUNT(*) AS orders_count, SUM(total) AS orders_total
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY user_id
    )
SELECT
    u.id,
    u.name,
    COALESCE(ro.orders_count, 0) AS orders_count,
    COALESCE(ro.orders_total, 0) AS orders_total
FROM active_users AS u
LEFT JOIN recent_orders AS ro
    ON ro.user_id = u.id
ORDER BY orders_total DESC;
```

### Рекурсивный CTE

Используется для обхода иерархических структур (категории, меню, оргструктура).

```sql
WITH RECURSIVE category_tree AS (
    -- Базовый случай: корневые категории
    SELECT
        id,
        name,
        parent_id,
        0 AS depth,
        ARRAY[id] AS path
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Рекурсивный случай
    SELECT
        c.id,
        c.name,
        c.parent_id,
        ct.depth + 1,
        ct.path || c.id
    FROM categories AS c
    JOIN category_tree AS ct
        ON ct.id = c.parent_id
)
SELECT
    id,
    name,
    depth,
    path
FROM category_tree
ORDER BY path;
```

### CTE с модификацией данных (Writable CTE)

```sql
WITH inserted_order AS (
    INSERT INTO orders (user_id, total, status)
    VALUES (1, 1500.00, 'pending')
    RETURNING id, user_id, total
)
INSERT INTO order_audit_log (order_id, user_id, action, amount)
SELECT id, user_id, 'created', total
FROM inserted_order;
```

---

## Оконные функции (Window Functions)

Оконные функции выполняют вычисления по набору строк, связанных с текущей строкой, без группировки результата.

### ROW_NUMBER и RANK

```sql
SELECT
    id,
    user_id,
    total,
    created_at,
    ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY created_at DESC
    ) AS rn,
    RANK() OVER (
        ORDER BY total DESC
    ) AS rank_by_total,
    DENSE_RANK() OVER (
        ORDER BY total DESC
    ) AS dense_rank_by_total
FROM orders;
```

### LAG и LEAD

Доступ к значениям предыдущей и следующей строк.

```sql
SELECT
    id,
    created_at,
    total,
    LAG(total) OVER (
        PARTITION BY user_id
        ORDER BY created_at
    ) AS previous_order_total,
    LEAD(total) OVER (
        PARTITION BY user_id
        ORDER BY created_at
    ) AS next_order_total,
    total - LAG(total) OVER (
        PARTITION BY user_id
        ORDER BY created_at
    ) AS diff_from_previous
FROM orders;
```

### Агрегатные оконные функции

```sql
SELECT
    id,
    user_id,
    total,
    SUM(total) OVER (
        PARTITION BY user_id
        ORDER BY created_at
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_total,
    AVG(total) OVER (
        PARTITION BY user_id
    ) AS avg_user_order
FROM orders;
```

### NTILE и PERCENT_RANK

```sql
SELECT
    id,
    total,
    NTILE(4) OVER (ORDER BY total) AS quartile,
    ROUND(PERCENT_RANK() OVER (ORDER BY total)::NUMERIC, 4) AS percentile
FROM orders;
```

---

## Транзакции и изоляция

### MVCC (Multiversion Concurrency Control)

PostgreSQL использует MVCC: каждая транзакция видит снимок данных на момент её начала. Читающие транзакции не блокируют пишущие и наоборот.

### Уровни изоляции

```sql
-- Read Committed (по умолчанию)
-- Видит только зафиксированные данные. Защищает от грязного чтения.
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- ...
COMMIT;

-- Repeatable Read
-- Видит снимок на момент начала транзакции. Защищает от фантомного чтения.
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- ...
COMMIT;

-- Serializable
-- Полная изоляция. Транзакции выполняются как бы последовательно.
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- ...
COMMIT;
```

| Уровень            | Грязное чтение | Неповторяемое чтение | Фантомное чтение |
|--------------------|---------------|---------------------|-----------------|
| Read Committed     | Нет           | Возможно            | Возможно        |
| Repeatable Read    | Нет           | Нет                 | Нет             |
| Serializable       | Нет           | Нет                 | Нет             |

### Явные блокировки

```sql
-- Блокировка строк для обновления
BEGIN;
SELECT * FROM orders WHERE id = 1 FOR UPDATE;
UPDATE orders SET status = 'processing' WHERE id = 1;
COMMIT;

-- Блокировка без ожидания
SELECT * FROM orders WHERE id = 1 FOR UPDATE NOWAIT;

-- Пропустить заблокированные строки
SELECT * FROM orders WHERE status = 'pending' FOR UPDATE SKIP LOCKED;
```

### Advisory Locks (пользовательские блокировки)

Механизм приложения-уровня для координации между сессиями.

```sql
-- Сессионная блокировка (удерживается до конца сессии)
SELECT pg_advisory_lock(12345);
-- ... критическая секция ...
SELECT pg_advisory_unlock(12345);

-- Транзакционная блокировка (автоматически снимается при COMMIT/ROLLBACK)
BEGIN;
SELECT pg_advisory_xact_lock(12345);
-- ... критическая секция ...
COMMIT;

-- Попытка блокировки без ожидания
SELECT pg_try_advisory_lock(12345);
```

### Savepoints

```sql
BEGIN;

INSERT INTO orders (user_id, total) VALUES (1, 100.00);
SAVEPOINT after_order;

INSERT INTO order_items (order_id, product_id, quantity) VALUES (1, 5, 2);
-- Если ошибка:
ROLLBACK TO SAVEPOINT after_order;

COMMIT;
```

---

## Laravel Migrations

### Создание таблицы с PostgreSQL-специфичными типами

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->integer('stock')->default(0);
            $table->boolean('is_active')->default(true);
            $table->json('attributes')->default('{}'); // JSONB в PostgreSQL
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
```

### Добавление JSONB-столбца с GIN-индексом

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->jsonb('metadata')->default('{}')->after('attributes');
        });

        // GIN-индекс через DB::statement — Blueprint его не поддерживает
        DB::statement('CREATE INDEX products_metadata_gin ON products USING GIN (metadata)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS products_metadata_gin');

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('metadata');
        });
    }
};
```

### Создание частичного индекса

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Частичный индекс — только через DB::statement
        DB::statement(
            'CREATE INDEX orders_created_at_pending_index
             ON orders (created_at)
             WHERE status = \'pending\''
        );

        // Уникальный частичный индекс (уникальный email только у активных пользователей)
        DB::statement(
            'CREATE UNIQUE INDEX users_email_active_unique
             ON users (email)
             WHERE is_active = true'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS orders_created_at_pending_index');
        DB::statement('DROP INDEX IF EXISTS users_email_active_unique');
    }
};
```

### PostgreSQL-специфичный DDL через DB::statement

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Создание ENUM-типа
        DB::statement("CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled')");

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('total', 10, 2);
            $table->timestamps();
        });

        // Добавление столбца с ENUM-типом
        DB::statement('ALTER TABLE orders ADD COLUMN status order_status NOT NULL DEFAULT \'pending\'');

        // Создание индекса по выражению
        DB::statement('CREATE INDEX orders_lower_status_index ON orders (LOWER(status::TEXT))');

        // Создание покрывающего индекса с INCLUDE
        DB::statement(
            'CREATE INDEX orders_user_id_include_index
             ON orders (user_id)
             INCLUDE (status, total, created_at)'
        );

        // Партиционированная таблица
        DB::statement('
            CREATE TABLE events (
                id         BIGSERIAL    NOT NULL,
                user_id    BIGINT       NOT NULL,
                payload    JSONB        NOT NULL DEFAULT \'{}\'::JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            ) PARTITION BY RANGE (created_at)
        ');

        DB::statement('
            CREATE TABLE events_2024
            PARTITION OF events
            FOR VALUES FROM (\'2024-01-01\') TO (\'2025-01-01\')
        ');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS orders_user_id_include_index');
        DB::statement('DROP INDEX IF EXISTS orders_lower_status_index');
        Schema::dropIfExists('orders');
        DB::statement('DROP TYPE IF EXISTS order_status');
        DB::statement('DROP TABLE IF EXISTS events_2024');
        DB::statement('DROP TABLE IF EXISTS events');
    }
};
```

### Добавление tsvector-столбца с GIN-индексом

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Добавить generated tsvector столбец
        DB::statement("
            ALTER TABLE articles
            ADD COLUMN ts_search TSVECTOR
            GENERATED ALWAYS AS (
                setweight(to_tsvector('russian', COALESCE(title, '')), 'A') ||
                setweight(to_tsvector('russian', COALESCE(body, '')), 'B')
            ) STORED
        ");

        DB::statement('CREATE INDEX articles_ts_search_gin ON articles USING GIN (ts_search)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS articles_ts_search_gin');

        DB::statement('ALTER TABLE articles DROP COLUMN IF EXISTS ts_search');
    }
};
```

---

## Чего следует избегать

### Производительность

- **Избегайте `SELECT *`** — всегда перечисляйте нужные столбцы явно.
- **Не используйте функции в условиях `WHERE` для индексируемых столбцов** — это делает индекс неприменимым. Вместо `WHERE YEAR(created_at) = 2024` используйте `WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'`.
- **Не создавайте избыточные индексы** — каждый индекс замедляет запись.
- **Избегайте `OFFSET` для пагинации больших таблиц** — используйте keyset pagination (cursor-based).
- **Не используйте `DISTINCT` как способ исправить неправильный `JOIN`** — разберитесь с логикой запроса.

### Корректность

- **Не используйте `NOT IN` со значениями `NULL`** — всегда возвращает пустой результат. Используйте `NOT EXISTS`.
- **Не опускайте `TIMESTAMPTZ`** — `TIMESTAMP` без часового пояса приводит к ошибкам при работе в разных временных зонах.
- **Не храните деньги в `FLOAT`/`REAL`** — используйте `NUMERIC(p, s)`.
- **Не используйте `SERIAL` в новом коде** — используйте `GENERATED ALWAYS AS IDENTITY` или `BIGSERIAL` с `DEFAULT gen_random_uuid()`.
- **Не игнорируйте ошибки транзакций** — всегда обрабатывайте `ROLLBACK`.

### MySQL-совместимость

- **Не используйте `INT(5)`, `TINYINT(1)`** — в PostgreSQL параметр длины у числовых типов не имеет смысла.
- **Не используйте `DATETIME`** — используйте `TIMESTAMPTZ`.
- **Не используйте `TINYINT` для булевых значений** — используйте `BOOLEAN`.
- **Не используйте `AUTO_INCREMENT`** — используйте `BIGSERIAL` или `GENERATED ALWAYS AS IDENTITY`.
- **Не используйте обратные кавычки** (`` ` ``) для идентификаторов — используйте двойные кавычки `""` или избегайте зарезервированных слов.
- **Не используйте `LIMIT x, y`** — используйте `LIMIT x OFFSET y`.

### Проектирование

- **Не храните JSON там, где нужна реляционная структура** — если данные нужны для сложных запросов, нормализуйте.
- **Не создавайте таблицы без первичного ключа** — PostgreSQL допускает это, но это антипаттерн.
- **Не используйте `VARCHAR(255)` по умолчанию везде** — используйте `TEXT` для строк без ограничения или `VARCHAR(n)` с обоснованным ограничением.
- **Не забывайте об ограничениях `NOT NULL`** — проектируйте схему с минимальным количеством `NULL`.
- **Не используйте `EAV` (Entity-Attribute-Value)** — используйте `JSONB`.
