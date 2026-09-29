# 3. Стандарты кодирования Laravel

## Принцип единственной ответственности (SRP)

У каждого класса и метода должна быть только одна обязанность.

Плохо:
```php
<?php

declare(strict_types=1);

class Article
{
    public function getFullNameAttribute(): string
    {
        if (auth()->user() && auth()->user()->hasRole('client') && auth()->user()->isVerified()) {
            return 'Mr. ' . $this->first_name . ' ' . $this->last_name;
        } else {
            return $this->first_name[0] . '. ' . $this->last_name;
        }
    }
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

class Article
{
    public function getFullNameAttribute(): string
    {
        return $this->isVerifiedClient()
            ? $this->getFullClientName()
            : $this->getShortName();
    }

    private function isVerifiedClient(): bool
    {
        return auth()->user()?->hasRole('client') && auth()->user()?->isVerified();
    }

    private function getFullClientName(): string
    {
        return 'Mr. ' . $this->first_name . ' ' . $this->last_name;
    }

    private function getShortName(): string
    {
        return $this->first_name[0] . '. ' . $this->last_name;
    }
}
```

---

## Тонкие контроллеры, толстые модели

Помещайте всю логику работы с БД и данными в модели Eloquent (или в репозитории — при необходимости), а контроллеры делайте максимально лаконичными.

Плохо:
```php
<?php

declare(strict_types=1);

class ArticleController
{
    public function index(): View
    {
        $clients = Client::verified()
            ->with(['orders' => function ($query) {
                $query->where('created_at', '>', Carbon::today()->subWeek());
            }])
            ->get();

        return view('index', compact('clients'));
    }
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

class ArticleController
{
    public function index(): View
    {
        return view('index', ['clients' => Client::getVerifiedWithRecentOrders()]);
    }
}

// В модели:
class Client extends Model
{
    public static function getVerifiedWithRecentOrders(): Collection
    {
        return self::verified()
            ->with(['orders' => fn ($query) => $query->where('created_at', '>', Carbon::today()->subWeek())])
            ->get();
    }
}
```

---

## Валидация

Выносите валидацию из контроллеров в отдельные классы Form Request.

Плохо:
```php
<?php

declare(strict_types=1);

class ArticleController
{
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'title'   => ['required', 'unique:posts', 'max:255'],
            'body'    => ['required'],
            'publish' => ['boolean'],
        ]);

        // ...
    }
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

// app/Http/Requests/StoreArticleRequest.php
class StoreArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Article::class);
    }

    public function rules(): array
    {
        return [
            'title'   => ['required', 'unique:posts', 'max:255'],
            'body'    => ['required'],
            'publish' => ['boolean'],
        ];
    }
}

// В контроллере:
class ArticleController
{
    public function store(StoreArticleRequest $request): RedirectResponse
    {
        // Валидация уже выполнена, данные доступны через $request->validated()
    }
}
```

---

## Бизнес-логика в сервис-классах

Бизнес-логика должна находиться в сервис-классах, а не в контроллерах.

Плохо:
```php
<?php

declare(strict_types=1);

class ArticleController
{
    public function store(StoreArticleRequest $request): RedirectResponse
    {
        if ($request->hasFile('image')) {
            $request->file('image')->move(public_path('images'), $filename);
        }

        // ...
    }
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

// app/Services/ArticleService.php
class ArticleService
{
    public function handleUploadedImage(UploadedFile $image): string
    {
        $filename = str()->uuid() . '.' . $image->extension();
        $image->move(public_path('images'), $filename);

        return $filename;
    }
}

// В контроллере:
class ArticleController
{
    public function __construct(
        private readonly ArticleService $articleService,
    ) {}

    public function store(StoreArticleRequest $request): RedirectResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            $data['image'] = $this->articleService->handleUploadedImage($request->file('image'));
        }

        // ...
    }
}
```

---

## DRY (Don't Repeat Yourself)

Не дублируйте код. Повторяющиеся условия выборки выносите в Eloquent-скоупы.

Плохо:
```php
<?php

declare(strict_types=1);

class ArticleController
{
    public function index(): View
    {
        $articles = Article::where('verified', 1)->whereNotNull('published_at')->get();

        return view('index', compact('articles'));
    }
}

class AnotherController
{
    public function index(): View
    {
        $articles = Article::where('verified', 1)->whereNotNull('published_at')->oldest()->get();

        return view('index', compact('articles'));
    }
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

// В модели:
class Article extends Model
{
    public function scopeVerified(Builder $query): Builder
    {
        return $query->where('verified', 1)->whereNotNull('published_at');
    }
}

// В контроллерах:
class ArticleController
{
    public function index(): View
    {
        $articles = Article::verified()->get();

        return view('index', compact('articles'));
    }
}

class AnotherController
{
    public function index(): View
    {
        $articles = Article::verified()->oldest()->get();

        return view('index', compact('articles'));
    }
}
```

---

## Предпочитайте Eloquent и Query Builder сырым SQL-запросам

Eloquent позволяет писать читаемый, переносимый код. Избегайте сырых SQL-запросов без крайней необходимости.

Плохо:
```php
<?php

declare(strict_types=1);

$users = DB::select('SELECT * FROM users WHERE active = 1');
```

Хорошо:
```php
<?php

declare(strict_types=1);

$users = User::where('active', 1)->get();
```

Плохо:
```php
<?php

declare(strict_types=1);

SELECT *
FROM `articles`
WHERE EXISTS (
    SELECT *
    FROM `users`
    WHERE `articles`.`user_id` = `users`.`id`
    AND EXISTS (
        SELECT *
        FROM `profiles`
        WHERE `profiles`.`user_id` = `users`.`id`
    )
    AND `users`.`deleted_at` IS NULL
)
AND `verified` = '1'
AND `active` = '1'
ORDER BY `created_at` DESC
```

Хорошо:
```php
<?php

declare(strict_types=1);

Article::has('user.profile')
    ->verified()
    ->latest()
    ->get();
```

---

## Используйте массовое заполнение (Mass Assignment)

Плохо:
```php
<?php

declare(strict_types=1);

$article = new Article();
$article->title    = $request->input('title');
$article->body     = $request->input('body');
$article->author   = $request->input('author');
$article->category = $request->input('category');
$article->save();
```

Хорошо:
```php
<?php

declare(strict_types=1);

$article = Article::create($request->validated());
```

Не забудьте определить `$fillable` или `$guarded` в модели:

```php
<?php

declare(strict_types=1);

class Article extends Model
{
    protected $fillable = [
        'title',
        'body',
        'author',
        'category',
    ];
}
```

---

## Не выполняйте запросы в представлениях (Проблема N+1)

Загружайте связанные данные через eager loading, а не внутри шаблонов Blade.

Плохо:
```php
// В контроллере:
$articles = Article::all();

// В шаблоне:
@foreach ($articles as $article)
    {{ $article->author->name }}
@endforeach
```

Хорошо:
```php
<?php

declare(strict_types=1);

// В контроллере:
$articles = Article::with('author')->get();

// В шаблоне:
@foreach ($articles as $article)
    {{ $article->author->name }}
@endforeach
```

Используйте `withCount` для подсчёта связанных записей без загрузки всей коллекции:

```php
<?php

declare(strict_types=1);

$articles = Article::withCount('comments')->get();
```

---

## Комментируйте код, предпочитайте читаемые имена методов

Плохо:
```php
<?php

declare(strict_types=1);

// Проверяем, что дата больше, чем год назад
if ($date->greaterThan(Carbon::now()->subYear())) {
    // ...
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

if ($this->isPublishedWithinLastYear($article)) {
    // ...
}

private function isPublishedWithinLastYear(Article $article): bool
{
    return $article->published_at->greaterThan(Carbon::now()->subYear());
}
```

Комментарии уместны, когда объяснить смысл через имя метода невозможно — например, при сложных алгоритмах или нетривиальных обходных решениях.

---

## Выносите JS и CSS из шаблонов Blade

Не помещайте JavaScript и CSS непосредственно в Blade-шаблоны. Размещайте их в соответствующих файлах и подключайте через Vite.

Плохо:
```blade
{{-- resources/views/article.blade.php --}}
<html>
<head>
    <style>
        .active { font-weight: bold; }
    </style>
</head>
<body>
    ...
    <script>
        var articles = {{ json_encode($articles) }};
        articles.forEach(function (article) {
            console.log(article.title);
        });
    </script>
</body>
</html>
```

Хорошо:
```blade
{{-- resources/views/article.blade.php --}}
<html>
<head>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    ...
</body>
</html>
```

```js
// resources/js/articles.js
import './bootstrap';

const articles = window.__ARTICLES__;
articles.forEach((article) => {
    console.log(article.title);
});
```

---

## Конфиги и константы вместо текста в коде

Плохо:
```php
<?php

declare(strict_types=1);

public function isActive(): bool
{
    return $this->status === 'active';
}

public function getUrl(): string
{
    return 'https://example.com/articles/' . $this->slug;
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

// config/articles.php
return [
    'base_url' => env('APP_URL') . '/articles/',
];

// В модели:
public function isActive(): bool
{
    return $this->status === OrderStatus::Active;
}

public function getUrl(): string
{
    return config('articles.base_url') . $this->slug;
}
```

---

## Используйте инструменты, принятые сообществом

Предпочитайте встроенные возможности Laravel и инструменты, принятые сообществом, сторонним пакетам.

| Задача                      | Стандартный инструмент              | Нестандартный инструмент            |
|-----------------------------|-------------------------------------|-------------------------------------|
| Авторизация                 | Policies, Gates                     | Entrust, Sentinel, сторонние пакеты |
| Сборка фронтенда            | Vite                                | Grunt, Gulp, Webpack напрямую       |
| Локальная разработка        | Docker / Laravel Sail               | Vagrant, WAMP, MAMP                 |
| Тестирование                | Pest PHP / PHPUnit                  | Codeception, PHPSpec                |
| Аутентификация API          | Laravel Sanctum                     | JWT-auth, сторонние пакеты          |
| OAuth / социальный вход     | Laravel Socialite                   | Самописные реализации               |
| Кэширование                 | Laravel Cache (Redis, Memcached)    | Прямые вызовы Redis/Memcached       |
| Почта                       | Laravel Mail + Mailables            | SwiftMailer напрямую                |
| Очереди                     | Laravel Horizon                     | Прямая работа с Redis/RabbitMQ      |
| Поиск                       | Laravel Scout                       | Самописные реализации               |
| Файловое хранилище          | Laravel Filesystem (S3, local)      | Прямая работа с файловой системой   |

---

## Соглашения об именовании

Следуйте принятым соглашениям об именовании Laravel и PHP-сообщества.

| Сущность           | Правило                           | Пример                                  |
|--------------------|-----------------------------------|-----------------------------------------|
| Контроллер         | Ед.ч., суффикс `Controller`       | `ArticleController`                     |
| Модель             | Ед.ч.                             | `User`, `Article`                       |
| Enum               | Ед.ч., PascalCase                 | `OrderStatus`, `PaymentMethod`          |
| Action             | Ед.ч., глагол, суффикс `Action`   | `CreateOrderAction`, `PublishArticleAction` |
| DTO                | Ед.ч., суффикс `Data` или `DTO`   | `OrderData`, `CreateUserDTO`            |
| Таблица БД         | Мн.ч., snake_case                 | `articles`, `order_items`               |
| Метод модели       | camelCase                         | `getVerifiedUsers()`, `scopeActive()`   |
| Метод контроллера  | camelCase (CRUD-имена)            | `index`, `store`, `show`, `update`, `destroy` |
| Маршрут            | kebab-case                        | `/order-items`, `/user-profiles`        |
| Именованный маршрут| snake_case с точками              | `articles.index`, `user.profile.show`   |
| Переменная         | camelCase                         | `$articleCount`, `$userId`              |
| Коллекция          | Мн.ч.                             | `$users`, `$activeArticles`             |
| Объект             | Ед.ч.                             | `$user`, `$article`                     |
| Конфигурационный файл | snake_case                     | `mail_settings.php`, `queue.php`        |
| Конфигурационный ключ | snake_case                     | `config('mail.from_address')`           |
| Миграция           | snake_case                        | `2024_01_01_000000_create_articles_table.php` |
| Метод теста        | camelCase с описанием             | `testUserCanPublishArticle()`           |
| Трейт              | Ед.ч., PascalCase                 | `HasTimestamps`, `Notifiable`           |
| Form Request       | Ед.ч., описательный               | `StoreArticleRequest`, `UpdateUserRequest` |
| Resource           | Ед.ч., суффикс `Resource`         | `ArticleResource`, `UserResource`       |
| Job                | Ед.ч., глагол                     | `ProcessPaymentJob`, `SendEmailJob`     |
| Event              | Ед.ч., прошедшее время            | `OrderShipped`, `UserRegistered`        |
| Listener           | Ед.ч., описательный               | `SendOrderConfirmation`                 |
| Policy             | Ед.ч., суффикс `Policy`           | `ArticlePolicy`, `OrderPolicy`          |
| Service            | Ед.ч., суффикс `Service`          | `PaymentService`, `ArticleService`      |

---

## Короткий и читаемый синтаксис

| Стандартный синтаксис                                                   | Короткий синтаксис                                    |
|-------------------------------------------------------------------------|-------------------------------------------------------|
| `Session::get('cart')`                                                  | `session('cart')`                                     |
| `$request->session()->get('cart')`                                      | `session('cart')`                                     |
| `Session::put('cart', $data)`                                           | `session(['cart' => $data])`                          |
| `$request->input('name')`                                               | `$request->name`                                      |
| `return Redirect::back()`                                               | `return back()`                                       |
| `return View::make('index')`                                            | `return view('index')`                                |
| `return Response::make($content)`                                       | `return response($content)`                           |
| `return Response::json($data)`                                          | `return response()->json($data)`                      |
| `User::where('email', $email)->first()`                                 | `User::firstWhere('email', $email)`                   |
| `->where('column', '=', $value)`                                        | `->where('column', $value)`                           |
| `->orWhere('column', '=', $value)`                                      | `->orWhere('column', $value)`                         |
| `Carbon::now()`                                                         | `now()`                                               |
| `Carbon::today()`                                                       | `today()`                                             |
| `isset($variable) ? $variable : 'default'`                              | `$variable ?? 'default'`                              |
| `isset($variable) && $variable ? $variable : 'default'`                 | `$variable ?: 'default'`                              |

---

## Используйте IoC / контейнер или фасады вместо `new Class`

Создание объектов через `new` напрямую ухудшает тестируемость и нарушает принцип инверсии зависимостей.

Плохо:
```php
<?php

declare(strict_types=1);

class ArticleController
{
    public function store(StoreArticleRequest $request): RedirectResponse
    {
        $article = new Article();
        $service = new ArticleService();
        // ...
    }
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

class ArticleController
{
    public function __construct(
        private readonly ArticleService $articleService,
    ) {}

    public function store(StoreArticleRequest $request): RedirectResponse
    {
        // $this->articleService уже внедрён через IoC-контейнер
    }
}
```

Или через фасад, когда это оправданно:
```php
<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Cache;

$articles = Cache::remember('articles', 3600, fn () => Article::all());
```

---

## Не работайте с `.env` напрямую

Обращайтесь к переменным окружения только через конфиг-файлы. Прямые вызовы `env()` вне конфигурационных файлов не работают при кэшировании конфигурации (`php artisan config:cache`).

Плохо:
```php
<?php

declare(strict_types=1);

class ApiController
{
    public function getApiKey(): string
    {
        return env('API_KEY');
    }
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

// config/services.php
return [
    'api_key' => env('API_KEY'),
];

// В коде:
class ApiController
{
    public function getApiKey(): string
    {
        return config('services.api_key');
    }
}
```

---

## Храните даты в стандартном формате, используйте accessors

Плохо:
```php
<?php

declare(strict_types=1);

{{ Carbon::createFromFormat('Y-d-m', $article->published_at)->toDateString() }}
{{ Carbon::createFromFormat('Y-d-m', $article->published_at)->format('m-d') }}
```

Хорошо:
```php
<?php

declare(strict_types=1);

// В модели (Laravel 12+, attribute casting):
use Illuminate\Database\Eloquent\Casts\Attribute;

class Article extends Model
{
    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    protected function publishedAtFormatted(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->published_at?->format('d.m.Y'),
        );
    }
}

// В шаблоне:
{{ $article->published_at->toDateString() }}
{{ $article->published_at->format('m-d') }}
{{ $article->published_at_formatted }}
```

---

## Action-классы

Для изолированных бизнес-операций используйте вызываемые (invokable) Action-классы. Каждый Action выполняет ровно одно действие и располагается в директории `app/Actions/`.

Это позволяет:
- повторно использовать бизнес-логику из контроллеров, консольных команд и задач очереди;
- упростить тестирование — каждый Action тестируется независимо;
- соблюдать принцип единственной ответственности на уровне операций.

Плохо (логика в контроллере):
```php
<?php

declare(strict_types=1);

class OrderController
{
    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = Order::create($request->validated());

        // Логика создания заказа размазана по контроллеру
        foreach ($request->input('items') as $item) {
            $order->items()->create($item);
        }

        $order->customer->notify(new OrderCreatedNotification($order));
        event(new OrderCreated($order));

        return response()->json(new OrderResource($order), 201);
    }
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

// app/Actions/Orders/CreateOrderAction.php
namespace App\Actions\Orders;

use App\Data\OrderData;
use App\Events\OrderCreated;
use App\Models\Order;
use App\Notifications\OrderCreatedNotification;

final class CreateOrderAction
{
    public function __invoke(OrderData $data): Order
    {
        $order = Order::create([
            'customer_id' => $data->customerId,
            'total'       => $data->total,
        ]);

        foreach ($data->items as $item) {
            $order->items()->create($item->toArray());
        }

        $order->customer->notify(new OrderCreatedNotification($order));
        event(new OrderCreated($order));

        return $order;
    }
}

// В контроллере:
class OrderController
{
    public function __construct(
        private readonly CreateOrderAction $createOrder,
    ) {}

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = ($this->createOrder)(OrderData::from($request->validated()));

        return response()->json(new OrderResource($order), 201);
    }
}
```

---

## Enums (Перечисления)

Используйте PHP backed enum (8.1+) вместо наборов констант для статусов, типов и любых фиксированных наборов значений. Laravel поддерживает автоматическое приведение enum в моделях через `$casts`.

Плохо:
```php
<?php

declare(strict_types=1);

class Order extends Model
{
    public const STATUS_PENDING   = 'pending';
    public const STATUS_PAID      = 'paid';
    public const STATUS_CANCELLED = 'cancelled';
}

// Нет гарантии корректного значения:
$order->status = 'oops';
```

Хорошо:
```php
<?php

declare(strict_types=1);

// app/Enums/OrderStatus.php
namespace App\Enums;

enum OrderStatus: string
{
    case Pending   = 'pending';
    case Paid      = 'paid';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match($this) {
            self::Pending   => 'Ожидает оплаты',
            self::Paid      => 'Оплачен',
            self::Cancelled => 'Отменён',
        };
    }

    public function isPaid(): bool
    {
        return $this === self::Paid;
    }
}

// В модели:
class Order extends Model
{
    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
        ];
    }
}

// Использование:
$order->status = OrderStatus::Paid;

if ($order->status->isPaid()) {
    // ...
}

echo $order->status->label(); // Оплачен
echo $order->status->value;   // paid
```

Enum-классы именуются в единственном числе, PascalCase, без суффиксов: `OrderStatus`, `PaymentMethod`, `UserRole`.

---

## API Resources

Всегда используйте `JsonResource` и `ResourceCollection` для формирования API-ответов. Никогда не возвращайте модели Eloquent или массивы напрямую из контроллеров.

Это позволяет:
- контролировать, какие поля возвращаются в API;
- трансформировать данные без изменения модели;
- версионировать ответы API.

Плохо:
```php
<?php

declare(strict_types=1);

class ArticleController
{
    public function index(): JsonResponse
    {
        // Возвращает все поля модели, включая чувствительные
        return response()->json(Article::all());
    }

    public function show(Article $article): JsonResponse
    {
        return response()->json($article->toArray());
    }
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

// app/Http/Resources/ArticleResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ArticleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'title'      => $this->title,
            'body'       => $this->body,
            'author'     => new UserResource($this->whenLoaded('author')),
            'published_at' => $this->published_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}

// app/Http/Resources/ArticleCollection.php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\ResourceCollection;

final class ArticleCollection extends ResourceCollection
{
    public $collects = ArticleResource::class;
}

// В контроллере:
class ArticleController
{
    public function index(): ArticleCollection
    {
        return new ArticleCollection(Article::with('author')->paginate());
    }

    public function show(Article $article): ArticleResource
    {
        return new ArticleResource($article->load('author'));
    }
}
```

---

## Data Transfer Objects (DTO)

Используйте DTO для передачи структурированных данных между слоями приложения. DTO делают контракты между компонентами явными и исключают передачу неструктурированных массивов.

Рекомендуемые подходы:
- `readonly` классы PHP 8.5+ для простых DTO;
- пакет [spatie/laravel-data](https://github.com/spatie/laravel-data) для расширенных возможностей (валидация, трансформация, кастинг).

Плохо:
```php
<?php

declare(strict_types=1);

class OrderController
{
    public function store(StoreOrderRequest $request): JsonResponse
    {
        // Неявный контракт — что именно содержится в массиве?
        $this->createOrder->handle($request->validated());
    }
}
```

Хорошо (простой readonly DTO):
```php
<?php

declare(strict_types=1);

// app/Data/OrderData.php
namespace App\Data;

use App\Enums\PaymentMethod;

readonly class OrderData
{
    public function __construct(
        public int           $customerId,
        public float         $total,
        public PaymentMethod $paymentMethod,
        /** @var OrderItemData[] */
        public array         $items,
    ) {}

    public static function fromRequest(StoreOrderRequest $request): self
    {
        return new self(
            customerId:    $request->user()->id,
            total:         $request->input('total'),
            paymentMethod: PaymentMethod::from($request->input('payment_method')),
            items:         array_map(
                fn (array $item) => OrderItemData::fromArray($item),
                $request->input('items', []),
            ),
        );
    }
}

// В контроллере:
class OrderController
{
    public function __construct(
        private readonly CreateOrderAction $createOrder,
    ) {}

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $data  = OrderData::fromRequest($request);
        $order = ($this->createOrder)($data);

        return response()->json(new OrderResource($order), 201);
    }
}
```

Хорошо (с пакетом spatie/laravel-data):
```php
<?php

declare(strict_types=1);

// app/Data/OrderData.php
namespace App\Data;

use App\Enums\PaymentMethod;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;

final class OrderData extends Data
{
    public function __construct(
        #[MapInputName('customer_id')]
        public readonly int           $customerId,
        public readonly float         $total,
        #[MapInputName('payment_method')]
        public readonly PaymentMethod $paymentMethod,
        /** @var OrderItemData[] */
        public readonly array         $items,
    ) {}
}

// В контроллере:
public function store(StoreOrderRequest $request): JsonResponse
{
    $data  = OrderData::from($request->validated());
    $order = ($this->createOrder)($data);

    return response()->json(new OrderResource($order), 201);
}
```

DTO именуются в единственном числе с суффиксом `Data` или `DTO`: `OrderData`, `CreateUserDTO`.

---

## Строгая типизация (Strict Types)

Все PHP-файлы проекта должны начинаться с директивы `declare(strict_types=1)`. Это обязательное требование.

Строгая типизация:
- предотвращает неявное приведение типов;
- делает ошибки типов очевидными на ранних стадиях;
- улучшает читаемость и надёжность кода.

Плохо:
```php
<?php

// Файл без declare(strict_types=1)

class OrderService
{
    public function calculateTotal(int $price, int $quantity): int
    {
        return $price * $quantity;
    }
}

// PHP молча преобразует '5' в 5 без строгой типизации
$service->calculateTotal('100', '3'); // Вернёт 300 без ошибки
```

Хорошо:
```php
<?php

declare(strict_types=1);

class OrderService
{
    public function calculateTotal(int $price, int $quantity): int
    {
        return $price * $quantity;
    }
}

// Со strict_types: TypeError — переданы строки вместо int
$service->calculateTotal('100', '3');
```

Директива `declare(strict_types=1)` должна быть первой строкой в каждом PHP-файле (после открывающего тега `<?php`), включая контроллеры, модели, сервисы, Action-классы, DTO, перечисления, тесты и конфигурационные файлы с кодом.

---

## Административная панель (Orchid Platform)

Каждая существенно значимая сущность проекта **обязана** иметь административный интерфейс на базе Orchid Platform с тремя экранами:

| Экран | Назначение |
|-------|-----------|
| **ListScreen** | Таблица с пагинацией, сортировкой и фильтрами |
| **EditScreen** | Единый экран для создания и редактирования |
| **ViewScreen** | Детализированный просмотр сущности |

Административные экраны **не содержат бизнес-логику** — они делегируют операции в Service/Action классы, используют Form Requests для валидации и Eloquent-модели с существующими scopes и отношениями.

Подробные стандарты: **`/home/vselug/workspace/Napominalky/docs/06-orchid.md`**

---

## Типизированные свойства и конструктор promotion

Используйте типизированные свойства и constructor property promotion во всех классах. Это сокращает шаблонный код и делает контракты класса явными.

Плохо:
```php
<?php

declare(strict_types=1);

class UserService
{
    private UserRepository $userRepository;
    private MailService $mailService;
    private LoggerInterface $logger;

    public function __construct(
        UserRepository $userRepository,
        MailService $mailService,
        LoggerInterface $logger,
    ) {
        $this->userRepository = $userRepository;
        $this->mailService    = $mailService;
        $this->logger         = $logger;
    }
}
```

Хорошо:
```php
<?php

declare(strict_types=1);

class UserService
{
    public function __construct(
        private readonly UserRepository  $userRepository,
        private readonly MailService     $mailService,
        private readonly LoggerInterface $logger,
    ) {}
}
```

Правила использования типизированных свойств:
- Используйте `readonly` для зависимостей, которые не должны переопределяться после создания объекта.
- Для DTO и Value Objects применяйте `readonly class`, чтобы все свойства стали автоматически `readonly`.
- Всегда указывайте тип свойства. Нетипизированные свойства недопустимы.
- Используйте `?Type` только тогда, когда `null` является допустимым значением с явной семантикой.

```php
<?php

declare(strict_types=1);

// Value Object с readonly class
readonly class Money
{
    public function __construct(
        public int    $amount,
        public string $currency,
    ) {}

    public function add(Money $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new \InvalidArgumentException('Currency mismatch');
        }

        return new self($this->amount + $other->amount, $this->currency);
    }
}

// Использование типизированных свойств в модели
class Order extends Model
{
    protected string $table = 'orders';

    protected function casts(): array
    {
        return [
            'status'     => OrderStatus::class,
            'shipped_at' => 'datetime',
            'total'      => 'float',
        ];
    }
}
```
