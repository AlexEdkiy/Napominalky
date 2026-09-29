# 6. Стандарты Orchid Platform (Административная панель)

## Общие требования

Каждая **значимая сущность** проекта (модель Eloquent, участвующая в бизнес-логике) **обязана** иметь экраны администрирования, реализованные через Orchid Platform.

Три обязательных экрана для каждой сущности:

| Экран | Назначение | Обязательная функциональность |
|-------|-----------|-------------------------------|
| **ListScreen** | Список записей | Пагинация, поиск, фильтрация, сортировка |
| **EditScreen** | Создание и редактирование | Один экран для create/update, валидация через FormRequest |
| **ViewScreen** | Детальный просмотр | Все поля, связанные данные, кнопки перехода |

Все admin-экраны строятся **только** через Orchid Platform (`orchid/platform` — доверенный вендор, см. `/home/vselug/workspace/Napominalky/docs/01-general.md`).

---

## Архитектура Orchid Platform

### Ключевые концепции

| Концепция | Назначение |
|-----------|-----------|
| **Screen** | Основная единица UI — аналог контроллера + шаблона. Определяет данные, действия и разметку |
| **Layout** | Компонент отображения внутри Screen (Table, Rows, Columns, Tabs, Modal, Legend) |
| **TD** | Определение столбца таблицы — заголовок, рендеринг, сортировка |
| **Field** | Элемент формы — Input, Select, TextArea, DateTimer, Relation, Upload, Switcher и др. |
| **Action** | Кнопка действия в CommandBar — Link, Button, DropDown, ModalToggle |
| **Filter** | Механизм фильтрации данных в списках |
| **Sight** | Пара ключ-значение для отображения данных в Legend layout (ViewScreen) |

### Жизненный цикл Screen

1. **`query()`** — загрузка данных (аналог controller method: получение модели/коллекции)
2. **`commandBar()`** — определение кнопок действий (Create, Save, Delete, Back)
3. **`layout()`** — определение структуры отображения (Table, Rows, Tabs, Legend)
4. **Методы-обработчики** — вызываются действиями пользователя (`save()`, `remove()` и др.)

---

## Структура кода

```
app/Orchid/
├── Screens/
│   ├── Article/
│   │   ├── ArticleListScreen.php
│   │   ├── ArticleEditScreen.php
│   │   └── ArticleViewScreen.php
│   ├── User/
│   │   ├── UserListScreen.php
│   │   ├── UserEditScreen.php
│   │   └── UserViewScreen.php
│   └── Order/
│       ├── OrderListScreen.php
│       ├── OrderEditScreen.php
│       └── OrderViewScreen.php
├── Layouts/
│   ├── Article/
│   │   ├── ArticleListLayout.php
│   │   ├── ArticleEditLayout.php
│   │   └── ArticleViewLayout.php
│   └── ...
├── Filters/
│   ├── SearchFilter.php
│   ├── StatusFilter.php
│   └── DateRangeFilter.php
└── Presenters/
    ├── ArticlePresenter.php
    └── ...
```

Экраны группируются по сущности в отдельные директории. Layouts выносятся в отдельные классы — не inline в методе `layout()`.

---

## Именование

| Сущность | Правило | Пример |
|----------|---------|--------|
| Экран списка | Ед.ч. + `ListScreen` | `ArticleListScreen` |
| Экран редактирования | Ед.ч. + `EditScreen` | `ArticleEditScreen` |
| Экран просмотра | Ед.ч. + `ViewScreen` | `ArticleViewScreen` |
| Layout таблицы | Ед.ч. + `ListLayout` | `ArticleListLayout` |
| Layout формы | Ед.ч. + `EditLayout` | `ArticleEditLayout` |
| Layout просмотра | Ед.ч. + `ViewLayout` | `ArticleViewLayout` |
| Фильтр | Описательный + `Filter` | `StatusFilter`, `SearchFilter` |
| Presenter | Ед.ч. + `Presenter` | `ArticlePresenter` |
| Директория экранов | Ед.ч., PascalCase | `app/Orchid/Screens/Article/` |
| Route name | `platform.` + snake_case мн.ч. + `.действие` | `platform.articles.list` |

---

## Паттерны экранов

### ListScreen (экран списка)

Обязательная функциональность:
- Пагинация (стандартный paginator Orchid)
- Поиск и фильтрация (Orchid Filters или HttpFilter)
- Сортировка по столбцам
- Кнопка создания в `commandBar()`
- Ссылки на View и Edit для каждой записи

```php
<?php

declare(strict_types=1);

namespace App\Orchid\Screens\Article;

use App\Models\Article;
use App\Orchid\Layouts\Article\ArticleListLayout;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Screen;

final class ArticleListScreen extends Screen
{
    public ?string $name = 'Статьи';

    public ?string $description = 'Список всех статей';

    public function query(): iterable
    {
        return [
            'articles' => Article::with('author')
                ->filters()
                ->defaultSort('created_at', 'desc')
                ->paginate(),
        ];
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('Создать')
                ->icon('bs.plus-circle')
                ->route('platform.articles.create'),
        ];
    }

    public function layout(): iterable
    {
        return [
            ArticleListLayout::class,
        ];
    }
}
```

### Layout для списка (Table Layout)

```php
<?php

declare(strict_types=1);

namespace App\Orchid\Layouts\Article;

use App\Models\Article;
use Orchid\Screen\Actions\DropDown;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Layouts\Table;
use Orchid\Screen\TD;

final class ArticleListLayout extends Table
{
    protected $target = 'articles';

    protected function columns(): iterable
    {
        return [
            TD::make('id', 'ID')
                ->sort()
                ->width('80px'),

            TD::make('title', 'Заголовок')
                ->sort()
                ->filter()
                ->render(fn (Article $article): string => $article->title),

            TD::make('status', 'Статус')
                ->sort()
                ->render(fn (Article $article): string => $article->status->label()),

            TD::make('author.name', 'Автор'),

            TD::make('created_at', 'Создано')
                ->sort()
                ->render(fn (Article $article): string => $article->created_at->format('d.m.Y H:i')),

            TD::make('actions', 'Действия')
                ->align(TD::ALIGN_CENTER)
                ->width('120px')
                ->render(fn (Article $article) => DropDown::make()
                    ->icon('bs.three-dots-vertical')
                    ->list([
                        Link::make('Просмотр')
                            ->icon('bs.eye')
                            ->route('platform.articles.view', $article),
                        Link::make('Редактировать')
                            ->icon('bs.pencil')
                            ->route('platform.articles.edit', $article),
                    ])),
        ];
    }
}
```

---

### EditScreen (экран создания/редактирования)

Обязательная функциональность:
- **Один экран** для create и update (определение через наличие модели)
- Валидация через Form Request (не внутри Screen)
- Кнопки Save и Delete в `commandBar()`
- Redirect на список после сохранения/удаления
- Toast-уведомление о результате

```php
<?php

declare(strict_types=1);

namespace App\Orchid\Screens\Article;

use App\Http\Requests\StoreArticleRequest;
use App\Models\Article;
use App\Orchid\Layouts\Article\ArticleEditLayout;
use Illuminate\Http\RedirectResponse;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Toast;

final class ArticleEditScreen extends Screen
{
    public ?string $name = 'Редактирование статьи';

    public function __construct(
        private readonly ?Article $article = null,
    ) {}

    public function query(Article $article): iterable
    {
        $this->name = $article->exists
            ? 'Редактирование: ' . $article->title
            : 'Создание статьи';

        return [
            'article' => $article,
        ];
    }

    public function commandBar(): iterable
    {
        return [
            Button::make('Сохранить')
                ->icon('bs.check-circle')
                ->method('save'),

            Button::make('Удалить')
                ->icon('bs.trash')
                ->method('remove')
                ->confirm('Вы уверены, что хотите удалить эту статью?')
                ->canSee($this->article?->exists ?? false),

            Link::make('Отмена')
                ->icon('bs.x-circle')
                ->route('platform.articles.list'),
        ];
    }

    public function layout(): iterable
    {
        return [
            ArticleEditLayout::class,
        ];
    }

    public function save(StoreArticleRequest $request, Article $article): RedirectResponse
    {
        $article->fill($request->validated())->save();

        Toast::info('Статья сохранена.');

        return redirect()->route('platform.articles.list');
    }

    public function remove(Article $article): RedirectResponse
    {
        $article->delete();

        Toast::info('Статья удалена.');

        return redirect()->route('platform.articles.list');
    }
}
```

### Layout для формы (Rows Layout)

```php
<?php

declare(strict_types=1);

namespace App\Orchid\Layouts\Article;

use App\Enums\ArticleStatus;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\Quill;
use Orchid\Screen\Fields\Relation;
use Orchid\Screen\Fields\Select;
use Orchid\Screen\Layouts\Rows;

final class ArticleEditLayout extends Rows
{
    protected function fields(): iterable
    {
        return [
            Input::make('article.title')
                ->title('Заголовок')
                ->required()
                ->max(255)
                ->placeholder('Введите заголовок статьи'),

            Quill::make('article.body')
                ->title('Содержание')
                ->required(),

            Select::make('article.status')
                ->title('Статус')
                ->options(
                    collect(ArticleStatus::cases())
                        ->mapWithKeys(fn (ArticleStatus $status) => [$status->value => $status->label()])
                        ->all()
                )
                ->required(),

            Relation::make('article.author_id')
                ->title('Автор')
                ->fromModel(\App\Models\User::class, 'name')
                ->required(),
        ];
    }
}
```

---

### ViewScreen (экран детального просмотра)

Обязательная функциональность:
- Все поля сущности в читаемом формате через Sight / Legend
- Кнопки: Редактировать, Назад, Удалить
- Связанные данные (relations) через дополнительные Layouts или вкладки

```php
<?php

declare(strict_types=1);

namespace App\Orchid\Screens\Article;

use App\Models\Article;
use App\Orchid\Layouts\Article\ArticleViewLayout;
use Illuminate\Http\RedirectResponse;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Toast;

final class ArticleViewScreen extends Screen
{
    public ?string $name = 'Просмотр статьи';

    public function query(Article $article): iterable
    {
        $this->name = $article->title;

        return [
            'article' => $article->load('author', 'comments'),
        ];
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('Редактировать')
                ->icon('bs.pencil')
                ->route('platform.articles.edit', $this->query['article'] ?? null),

            Button::make('Удалить')
                ->icon('bs.trash')
                ->method('remove')
                ->confirm('Вы уверены, что хотите удалить эту статью?'),

            Link::make('Назад')
                ->icon('bs.arrow-left')
                ->route('platform.articles.list'),
        ];
    }

    public function layout(): iterable
    {
        return [
            ArticleViewLayout::class,
        ];
    }

    public function remove(Article $article): RedirectResponse
    {
        $article->delete();

        Toast::info('Статья удалена.');

        return redirect()->route('platform.articles.list');
    }
}
```

### Layout для просмотра (Legend Layout)

```php
<?php

declare(strict_types=1);

namespace App\Orchid\Layouts\Article;

use App\Models\Article;
use Orchid\Screen\Layouts\Legend;
use Orchid\Screen\Sight;

final class ArticleViewLayout extends Legend
{
    protected $target = 'article';

    protected function columns(): iterable
    {
        return [
            Sight::make('id', 'ID'),

            Sight::make('title', 'Заголовок'),

            Sight::make('status', 'Статус')
                ->render(fn (Article $article): string => $article->status->label()),

            Sight::make('author.name', 'Автор'),

            Sight::make('body', 'Содержание')
                ->render(fn (Article $article): string => (string) $article->body),

            Sight::make('created_at', 'Создано')
                ->render(fn (Article $article): string => $article->created_at->format('d.m.Y H:i')),

            Sight::make('updated_at', 'Обновлено')
                ->render(fn (Article $article): string => $article->updated_at->format('d.m.Y H:i')),
        ];
    }
}
```

---

## Маршрутизация

Маршруты для admin-панели определяются в `routes/platform.php`:

```php
<?php

declare(strict_types=1);

use App\Orchid\Screens\Article\ArticleEditScreen;
use App\Orchid\Screens\Article\ArticleListScreen;
use App\Orchid\Screens\Article\ArticleViewScreen;
use Illuminate\Support\Facades\Route;
use Tabuna\Breadcrumbs\Trail;

// Статьи
Route::screen('articles', ArticleListScreen::class)
    ->name('platform.articles.list')
    ->breadcrumbs(fn (Trail $trail) => $trail
        ->parent('platform.index')
        ->push('Статьи'));

Route::screen('articles/create', ArticleEditScreen::class)
    ->name('platform.articles.create')
    ->breadcrumbs(fn (Trail $trail) => $trail
        ->parent('platform.articles.list')
        ->push('Создание'));

Route::screen('articles/{article}/edit', ArticleEditScreen::class)
    ->name('platform.articles.edit')
    ->breadcrumbs(fn (Trail $trail) => $trail
        ->parent('platform.articles.list')
        ->push('Редактирование'));

Route::screen('articles/{article}', ArticleViewScreen::class)
    ->name('platform.articles.view')
    ->breadcrumbs(fn (Trail $trail) => $trail
        ->parent('platform.articles.list')
        ->push('Просмотр'));
```

### Правила маршрутизации

- Все маршруты в `routes/platform.php` (файл создаётся Orchid при установке)
- Префикс `platform.` для всех именованных маршрутов
- kebab-case для URL-сегментов
- Route model binding для edit/view экранов
- Breadcrumbs для навигации

---

## Интеграция с Laravel

### Использование существующих моделей и сервисов

Screen использует существующие Eloquent-модели проекта (из `app/Models/`). Бизнес-логика остаётся в Service/Action классах — Screen **не содержит** бизнес-логику, а делегирует её.

Плохо:
```php
<?php

declare(strict_types=1);

// Бизнес-логика внутри Screen
public function save(Request $request, Article $article): RedirectResponse
{
    $article->title = $request->input('article.title');
    $article->status = ArticleStatus::Published;
    $article->published_at = now();
    $article->save();

    $article->author->notify(new ArticlePublishedNotification($article));
    event(new ArticlePublished($article));

    Toast::info('Опубликовано.');
    return redirect()->route('platform.articles.list');
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

// Screen делегирует Action-классу
public function save(
    StoreArticleRequest $request,
    Article $article,
    PublishArticleAction $publishArticle,
): RedirectResponse {
    ($publishArticle)(ArticleData::fromRequest($request), $article);

    Toast::info('Статья сохранена.');
    return redirect()->route('platform.articles.list');
}
```

### Валидация

Валидация выполняется через Laravel Form Request, не внутри Screen:

```php
<?php

declare(strict_types=1);

// Правильно: используем FormRequest
public function save(StoreArticleRequest $request, Article $article): RedirectResponse
{
    $article->fill($request->validated())->save();
    // ...
}
```

Не используй `$request->validate()` или ручную валидацию внутри методов Screen.

---

## Права доступа (Permissions)

Orchid имеет встроенную систему ролей и разрешений.

### Регистрация разрешений

Определяй permissions в `app/Orchid/PlatformProvider.php`:

```php
<?php

declare(strict_types=1);

public function permissions(): array
{
    return [
        ItemPermission::group('Статьи')
            ->addPermission('platform.articles.list', 'Просмотр списка')
            ->addPermission('platform.articles.view', 'Детальный просмотр')
            ->addPermission('platform.articles.edit', 'Создание и редактирование')
            ->addPermission('platform.articles.delete', 'Удаление'),

        ItemPermission::group('Заказы')
            ->addPermission('platform.orders.list', 'Просмотр списка')
            ->addPermission('platform.orders.view', 'Детальный просмотр')
            ->addPermission('platform.orders.edit', 'Создание и редактирование')
            ->addPermission('platform.orders.delete', 'Удаление'),
    ];
}
```

### Стандартный набор permissions для каждой сущности

| Permission | Назначение |
|------------|-----------|
| `platform.{entities}.list` | Просмотр списка |
| `platform.{entities}.view` | Детальный просмотр |
| `platform.{entities}.edit` | Создание и редактирование |
| `platform.{entities}.delete` | Удаление |

### Применение на маршрутах

```php
Route::screen('articles', ArticleListScreen::class)
    ->name('platform.articles.list')
    ->permission('platform.articles.list');
```

### Проверка в Screen

```php
Button::make('Удалить')
    ->canSee($this->currentUser()->hasAccess('platform.articles.delete'))
    ->method('remove');
```

---

## Фильтры

### Trait Filterable

Модели, используемые в ListScreen, должны использовать trait `Filterable` и `AsSource`:

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Orchid\Filters\Filterable;
use Orchid\Screen\AsSource;

class Article extends Model
{
    use Filterable;
    use AsSource;

    protected array $allowedFilters = [
        'title',
        'status',
        'created_at',
    ];

    protected array $allowedSorts = [
        'id',
        'title',
        'status',
        'created_at',
    ];
}
```

### Пользовательские фильтры

Для сложных фильтров — создавай классы в `app/Orchid/Filters/`:

```php
<?php

declare(strict_types=1);

namespace App\Orchid\Filters;

use Illuminate\Database\Eloquent\Builder;
use Orchid\Filters\Filter;
use Orchid\Screen\Fields\Select;

final class StatusFilter extends Filter
{
    public function name(): string
    {
        return 'Статус';
    }

    public function parameters(): ?array
    {
        return ['status'];
    }

    public function run(Builder $builder): Builder
    {
        return $builder->where('status', $this->request->get('status'));
    }

    public function display(): iterable
    {
        return [
            Select::make('status')
                ->options([
                    'active' => 'Активный',
                    'inactive' => 'Неактивный',
                    'pending' => 'Ожидает',
                ])
                ->empty('Все'),
        ];
    }
}
```

### Подключение фильтров в Layout

```php
final class ArticleListLayout extends Table
{
    protected $target = 'articles';

    protected function filters(): iterable
    {
        return [
            StatusFilter::class,
        ];
    }

    // columns()...
}
```

---

## Tabs и группировка

Для сложных сущностей с большим количеством полей используй вкладки:

```php
public function layout(): iterable
{
    return [
        Layout::tabs([
            'Основное'  => ArticleEditLayout::class,
            'SEO'       => ArticleSeoLayout::class,
            'Медиа'     => ArticleMediaLayout::class,
        ]),
    ];
}
```

Для ViewScreen с связанными данными:

```php
public function layout(): iterable
{
    return [
        Layout::tabs([
            'Информация' => ArticleViewLayout::class,
            'Комментарии' => ArticleCommentsLayout::class,
        ]),
    ];
}
```

---

## Чего следует избегать

- **Бизнес-логика в Screen** — Screen только принимает данные и делегирует Service/Action
- **Inline layouts** — всегда выноси layouts в отдельные классы
- **`$request->validate()` в Screen** — используй FormRequest
- **Дублирование логики** — если CRUD-операция уже есть в Service/Action, не переписывай её в Screen
- **`DB::raw()` в query()** — используй Eloquent scopes и стандартный Query Builder
- **Хардкод текстов** — используй config или языковые файлы для labels

---

## Проверочный список

- [ ] Три экрана для каждой значимой сущности (List, Edit, View)
- [ ] ListScreen: пагинация работает, фильтры функционируют, сортировка по столбцам
- [ ] EditScreen: один экран для create/update, валидация через FormRequest
- [ ] ViewScreen: все поля отображаются, связанные данные загружены
- [ ] Маршруты в `routes/platform.php` с именами `platform.*`
- [ ] Breadcrumbs настроены для навигации
- [ ] Permissions зарегистрированы в `PlatformProvider`
- [ ] Permissions применены на маршрутах
- [ ] Бизнес-логика в Service/Action, не в Screen
- [ ] Layouts вынесены в отдельные классы
- [ ] Модели используют traits `Filterable` и `AsSource`
- [ ] `declare(strict_types=1)` в каждом PHP-файле
- [ ] Именование соответствует таблице конвенций
- [ ] Eager loading в `query()` для предотвращения N+1
- [ ] Toast-уведомления после операций
