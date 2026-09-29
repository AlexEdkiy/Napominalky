# 2. Стандарты кодирования PHP

## Стандарты

Проект придерживается следующих стандартов:

- [PSR-1: Basic Coding Standard](https://www.php-fig.org/psr/psr-1/)
- [PSR-4: Autoloading Standard](https://www.php-fig.org/psr/psr-4/)
- [PSR-12: Extended Coding Style Guide](https://www.php-fig.org/psr/psr-12/) — актуален, однако постепенно вытесняется стандартом [PER Coding Style](https://www.php-fig.org/per/coding-style/), который является его живым наследником и расширяет правила для современных возможностей PHP
- [PSR-3: Logger Interface](https://www.php-fig.org/psr/psr-3/)
- [PSR-6: Caching Interface](https://www.php-fig.org/psr/psr-6/)
- [PSR-7: HTTP Message Interface](https://www.php-fig.org/psr/psr-7/)
- [PSR-11: Container Interface](https://www.php-fig.org/psr/psr-11/)
- [PSR-14: Event Dispatcher](https://www.php-fig.org/psr/psr-14/)
- [PSR-15: HTTP Server Request Handlers](https://www.php-fig.org/psr/psr-15/)
- [PSR-16: Simple Cache](https://www.php-fig.org/psr/psr-16/)
- [PSR-17: HTTP Factories](https://www.php-fig.org/psr/psr-17/)
- [PSR-18: HTTP Client](https://www.php-fig.org/psr/psr-18/)

---

## Версии PHP

Целевая версия:

- **PHP 8.5** — основная версия для новых проектов и развития существующих

Поддерживаемые версии:

- **PHP 8.4** — допускается в существующих проектах, планировать обновление до 8.5
- **PHP 8.3** — допускается в существующих проектах, планировать обновление

Версии PHP 7.x, PHP 8.0, 8.1 и 8.2 не поддерживаются и не используются в новых проектах.

---

## Фреймворки

- **Laravel 12+** — основной фреймворк для веб-приложений и API

---

## Composer-зависимости

Правила добавления внешних пакетов описаны в `/home/vselug/workspace/Napominalky/docs/01-general.md` (раздел «Внешние зависимости»).

Ключевые правила для PHP:
- Допускаются пакеты от **доверенных вендоров** (`spatie/*`, `symfony/*`, `orchid/*`, `abstechnology/*`, `dskripchenko/*`, `hflabs/*`, `opcodesio/*`) или пакеты с **≥ 400k скачиваний** на Packagist при активном жизненном цикле
- Перед добавлением пакета проверь, не решается ли задача средствами Laravel
- После установки: `composer audit` для проверки уязвимостей
- `composer.lock` всегда фиксируется в git

---

## Общие положения

### Переменные

**1. Используйте значимые и произносимые имена переменных**

Плохо:
```php
$ymdstr = $moment->format('y-m-d');
```

Хорошо:
```php
$currentDate = $moment->format('y-m-d');
```

---

**2. Используйте одинаковые названия для одного типа переменных**

Плохо:
```php
getUserInfo();
getUserData();
getUserRecord();
getUserProfile();
```

Хорошо:
```php
getUser();
```

---

**3. Используйте легко находимые имена переменных**

Плохо:
```php
// Что такое 448?
$result = $serializer->serialize($data, 448);
```

Хорошо:
```php
$result = $serializer->serialize($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
```

---

**4. Используйте объясняющие переменные**

Плохо:
```php
$address = 'One Infinite Loop, Cupertino 95014';
$cityZipCodeRegex = '/^[^,]+,\s*(.+?)\s*(\d{5})?$/';
preg_match($cityZipCodeRegex, $address, $matches);

saveCityZipCode($matches[1], $matches[2]);
```

Хорошо:
```php
$address = 'One Infinite Loop, Cupertino 95014';
$cityZipCodeRegex = '/^[^,]+,\s*(.+?)\s*(\d{5})?$/';
preg_match($cityZipCodeRegex, $address, $matches);

[, $city, $zipCode] = $matches;
saveCityZipCode($city, $zipCode);
```

---

**5. Избегайте глубокой вложенности (часть 1) — используйте ранний возврат**

Плохо:
```php
function isShopOpen(string $day): bool
{
    if ($day) {
        if (is_string($day)) {
            $day = strtolower($day);
            if ($day === 'friday') {
                return true;
            } elseif ($day === 'saturday') {
                return true;
            } elseif ($day === 'sunday') {
                return true;
            }
            return false;
        }
        return false;
    }
    return false;
}
```

Хорошо:
```php
function isShopOpen(string $day): bool
{
    if (empty($day)) {
        return false;
    }

    $openingDays = ['friday', 'saturday', 'sunday'];

    return in_array(strtolower($day), $openingDays, strict: true);
}
```

---

**6. Избегайте глубокой вложенности (часть 2)**

Плохо:
```php
function fibonacci(int $n): int
{
    if ($n < 50) {
        if ($n !== 0) {
            if ($n !== 1) {
                return fibonacci($n - 1) + fibonacci($n - 2);
            }
            return 1;
        }
        return 0;
    }
    throw new \InvalidArgumentException('Not supported');
}
```

Хорошо:
```php
function fibonacci(int $n): int
{
    if ($n === 0 || $n === 1) {
        return $n;
    }

    if ($n >= 50) {
        throw new \InvalidArgumentException('Not supported');
    }

    return fibonacci($n - 1) + fibonacci($n - 2);
}
```

---

**7. Избегайте мысленного сопоставления**

Не заставляйте читателя кода расшифровывать смысл переменной. Явное всегда лучше неявного.

Плохо:
```php
$l = ['Austin', 'New York', 'San Francisco'];

foreach ($l as $li) {
    oStuff();
    doSomeOtherStuff();
    // ...
    // ...
    // ...
    // Что означает `$li`?
    dispatch($li);
}
```

Хорошо:
```php
$locations = ['Austin', 'New York', 'San Francisco'];

foreach ($locations as $location) {
    doStuff();
    doSomeOtherStuff();
    // ...
    dispatch($location);
}
```

---

**8. Не добавляйте ненужный контекст**

Если имя класса или объекта уже что-то говорит вам, не повторяйте это в имени переменной.

Плохо:
```php
class Car
{
    public string $carMake;
    public string $carModel;
    public string $carColor;

    // ...
}
```

Хорошо:
```php
class Car
{
    public string $make;
    public string $model;
    public string $color;

    // ...
}
```

---

**9. Используйте аргументы по умолчанию вместо условий**

Плохо:
```php
function createMicrobrewery(?string $name = null): void
{
    $breweryName = $name ?? 'Hipster Brew Co.';
    // ...
}
```

Хорошо:
```php
function createMicrobrewery(string $name = 'Hipster Brew Co.'): void
{
    // ...
}
```

---

### Сравнение

**Используйте строгое сравнение**

Плохо:
```php
$a = '1';
$b = 1;

if ($a == $b) {
    // выражение выполнится
}
```

Хорошо:
```php
$a = '1';
$b = 1;

if ($a === $b) {
    // выражение НЕ выполнится
}
```

---

**Используйте оператор объединения с null**

Плохо:
```php
if (isset($_GET['name'])) {
    $name = $_GET['name'];
} elseif (isset($_POST['name'])) {
    $name = $_POST['name'];
} else {
    $name = 'nobody';
}
```

Хорошо:
```php
$name = $_GET['name'] ?? $_POST['name'] ?? 'nobody';
```

---

**Используйте match вместо switch там, где это уместно**

Match является строгим (===), возвращает значение и не требует `break`. Используйте его, когда каждая ветка возвращает значение или когда важна строгая проверка типов.

Плохо:
```php
switch ($status) {
    case 'active':
        $label = 'Активен';
        break;
    case 'inactive':
        $label = 'Неактивен';
        break;
    default:
        $label = 'Неизвестно';
}
```

Хорошо:
```php
$label = match($status) {
    'active'   => 'Активен',
    'inactive' => 'Неактивен',
    default    => 'Неизвестно',
};
```

---

### Функции

**1. Аргументы функции (идеально — не более 2)**

Чем меньше аргументов у функции, тем проще её тестировать. Если аргументов больше двух, стоит рассмотреть возможность передачи объекта или использования именованных аргументов.

Плохо:
```php
class Questionnaire
{
    public function __construct(
        string $firstname,
        string $lastname,
        string $patronymic,
        string $region,
        string $district,
        string $city,
        string $phone,
        string $email,
    ) {
        // ...
    }
}
```

Хорошо:
```php
class Name
{
    public function __construct(
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly string $patronymic,
    ) {}
}

class City
{
    public function __construct(
        public readonly string $region,
        public readonly string $district,
        public readonly string $name,
    ) {}
}

class Contact
{
    public function __construct(
        public readonly string $phone,
        public readonly string $email,
    ) {}
}

class Questionnaire
{
    public function __construct(
        public readonly Name    $name,
        public readonly City    $city,
        public readonly Contact $contact,
    ) {}
}
```

---

**2. Функции должны выполнять одно действие**

Это одно из важнейших правил. Функции, делающие больше одного дела, сложнее составлять, тестировать и понимать.

Плохо:
```php
function emailClients(array $clients): void
{
    foreach ($clients as $client) {
        $clientRecord = $db->find($client);
        if ($clientRecord->isActive()) {
            email($client);
        }
    }
}
```

Хорошо:
```php
function emailClients(array $clients): void
{
    $activeClients = activeClients($clients);
    array_walk($activeClients, 'email');
}

function activeClients(array $clients): array
{
    return array_filter($clients, 'isClientActive');
}

function isClientActive(int $client): bool
{
    $clientRecord = $db->find($client);

    return $clientRecord->isActive();
}
```

---

**3. Названия функций должны описывать их назначение**

Плохо:
```php
class Email
{
    // ...

    public function handle(): void
    {
        mail($this->to, $this->subject, $this->body);
    }
}

$message = new Email(...);
// Что это? Обработчик сообщения? Теперь записывает в файл?
$message->handle();
```

Хорошо:
```php
class Email
{
    // ...

    public function send(): void
    {
        mail($this->to, $this->subject, $this->body);
    }
}

$message = new Email(...);
$message->send();
```

---

**4. Функции должны работать на одном уровне абстракции**

Если в функции смешаны разные уровни абстракции, это, как правило, означает, что функция делает слишком много. Разбиение функций на части повышает читаемость и упрощает переиспользование.

Плохо:
```php
function parseBetterJSAlternative(string $code): void
{
    $regexes = [
        // ...
    ];

    $statements = explode(' ', $code);
    $tokens = [];
    foreach ($regexes as $regex) {
        foreach ($statements as $statement) {
            // ...
        }
    }

    $ast = [];
    foreach ($tokens as $token) {
        // lex...
    }

    foreach ($ast as $node) {
        // parse...
    }
}
```

Хорошо:
```php
function tokenize(string $code): array
{
    $regexes = [
        // ...
    ];

    $statements = explode(' ', $code);
    $tokens = [];
    foreach ($regexes as $regex) {
        foreach ($statements as $statement) {
            $tokens[] = /* ... */;
        }
    }

    return $tokens;
}

function lexer(array $tokens): array
{
    $ast = [];
    foreach ($tokens as $token) {
        $ast[] = /* ... */;
    }

    return $ast;
}

function parseBetterJSAlternative(string $code): void
{
    $tokens = tokenize($code);
    $ast = lexer($tokens);
    foreach ($ast as $node) {
        // parse...
    }
}
```

---

**5. Не используйте флаги в качестве параметров функции**

Флаги говорят пользователю, что функция делает больше одного действия. Разделите функцию на части.

Плохо:
```php
function createFile(string $name, bool $temp = false): void
{
    if ($temp) {
        touch('./temp/' . $name);
    } else {
        touch($name);
    }
}
```

Хорошо:
```php
function createFile(string $name): void
{
    touch($name);
}

function createTempFile(string $name): void
{
    touch('./temp/' . $name);
}
```

---

**6. Избегайте побочных эффектов**

Функция производит побочный эффект, если она делает что-то помимо получения значения и возврата другого значения или значений. Сосредоточьте побочные эффекты в одном месте.

Плохо:
```php
// Глобальная переменная используется в функции ниже.
// Если бы у нас была другая функция, использующая это имя, это был бы массив, и это могло бы сломать код.
$name = 'Ryan McDermott';

function splitIntoFirstAndLastName(): void
{
    global $name;

    $name = explode(' ', $name);
}

splitIntoFirstAndLastName();

var_dump($name);
// ['Ryan', 'McDermott'];
```

Хорошо:
```php
function splitIntoFirstAndLastName(string $name): array
{
    return explode(' ', $name);
}

$name = 'Ryan McDermott';
$newName = splitIntoFirstAndLastName($name);

var_dump($name);
// 'Ryan McDermott';

var_dump($newName);
// ['Ryan', 'McDermott'];
```

---

**7. Не используйте глобальные функции**

Загрязнение глобального пространства имен — плохая практика, потому что это может привести к конфликту с другой библиотекой, и пользователь вашего API не будет знать, пока не получит исключение в продакшне.

Плохо:
```php
function config(): array
{
    return [
        'foo' => 'bar',
    ];
}
```

Хорошо:
```php
class Configuration
{
    private array $configuration = [];

    public function __construct(array $configuration)
    {
        $this->configuration = $configuration;
    }

    public function get(string $key): ?string
    {
        return $this->configuration[$key] ?? null;
    }
}
```

---

**8. Не используйте паттерн Singleton**

Singleton — это антипаттерн. Используйте dependency injection через контейнер вместо прямого вызова синглтона.

Плохо:
```php
class DBConnection
{
    private static ?DBConnection $instance = null;

    private function __construct(
        private readonly string $dsn,
    ) {}

    public static function getInstance(): static
    {
        if (self::$instance === null) {
            self::$instance = new static(/* dsn */);
        }

        return self::$instance;
    }

    // ...
}

$singleton = DBConnection::getInstance();
```

Хорошо:
```php
class DBConnection
{
    public function __construct(
        private readonly string $dsn,
    ) {}

    // ...
}

$connection = new DBConnection($dsn);
```

---

**9. Инкапсулируйте условные конструкции**

Плохо:
```php
if ($article->state === 'published') {
    // ...
}
```

Хорошо:
```php
if ($article->isPublished()) {
    // ...
}
```

---

**10. Избегайте негативных условных конструкций**

Плохо:
```php
function isDOMNodeNotPresent(\DOMNode $node): bool
{
    // ...
}

if (!isDOMNodeNotPresent($node)) {
    // ...
}
```

Хорошо:
```php
function isDOMNodePresent(\DOMNode $node): bool
{
    // ...
}

if (isDOMNodePresent($node)) {
    // ...
}
```

---

**11. Избегайте условных конструкций — используйте полиморфизм**

Звучит как невозможная задача. Большинство людей слышат это и думают: «Как я должен делать что-либо без оператора `if`?» В большинстве случаев для достижения той же цели можно использовать полиморфизм. Во-вторых, поддержка такого кода выглядит лучше.

Плохо:
```php
class Airplane
{
    // ...

    public function getCruisingAltitude(): int
    {
        switch ($this->type) {
            case '777':
                return $this->getMaxAltitude() - $this->getPassengerCount();
            case 'Air Force One':
                return $this->getMaxAltitude();
            case 'Cessna':
                return $this->getMaxAltitude() - $this->getFuelExpenditure();
        }
    }
}
```

Хорошо:
```php
interface Airplane
{
    public function getCruisingAltitude(): int;
}

class Boeing777 implements Airplane
{
    public function getCruisingAltitude(): int
    {
        return $this->getMaxAltitude() - $this->getPassengerCount();
    }
}

class AirForceOne implements Airplane
{
    public function getCruisingAltitude(): int
    {
        return $this->getMaxAltitude();
    }
}

class Cessna implements Airplane
{
    public function getCruisingAltitude(): int
    {
        return $this->getMaxAltitude() - $this->getFuelExpenditure();
    }
}
```

---

**12. Избегайте проверки типов — используйте строгую типизацию**

Плохо:
```php
function travelToTexas(mixed $vehicle): void
{
    if ($vehicle instanceof Bicycle) {
        $vehicle->pedalTo(new Location('texas'));
    } elseif ($vehicle instanceof Car) {
        $vehicle->driveTo(new Location('texas'));
    }
}
```

Хорошо:
```php
function travelToTexas(Bicycle|Car $vehicle): void
{
    $vehicle->travelTo(new Location('texas'));
}
```

---

**13. Удаляйте мёртвый код**

Мёртвый код так же плох, как и дублирование. Нет никаких причин держать его в кодовой базе. Если он не вызывается — избавьтесь от него! Если он всё же понадобится, его всегда можно восстановить из истории версий.

Плохо:
```php
function oldRequestModule(string $url): void
{
    // ...
}

function newRequestModule(string $url): void
{
    // ...
}

$request = newRequestModule($requestUrl);
inventoryTracker('apples', $request, 'www.inventory-awesome.io');
```

Хорошо:
```php
function requestModule(string $url): void
{
    // ...
}

$request = requestModule($requestUrl);
inventoryTracker('apples', $request, 'www.inventory-awesome.io');
```

---

### Объекты и структуры данных

**Используйте инкапсуляцию**

В PHP можно установить ключевые слова `public`, `protected` и `private` для методов. Используйте их для управления изменениями свойств объектов.

- Если вам нужно не только получение свойства объекта — вам не нужно искать и изменять каждый метод доступа в кодовой базе.
- Добавить валидацию при `set` — просто.
- Инкапсулирует внутреннее представление.
- Легко логировать и обрабатывать ошибки при получении и установке.
- При наследовании вы можете переопределить функциональность по умолчанию.
- Вы можете лениво загружать свойства объектов, например с сервера.

Плохо:
```php
class BankAccount
{
    public float $balance = 1000.0;
}

$bankAccount = new BankAccount();

// Покупаем обувь...
$bankAccount->balance -= 100;
```

Хорошо:
```php
class BankAccount
{
    private float $balance;

    public function __construct(float $balance = 1000.0)
    {
        $this->balance = $balance;
    }

    public function withdraw(float $amount): void
    {
        if ($amount > $this->balance) {
            throw new \Exception('Amount greater than available balance.');
        }

        $this->balance -= $amount;
    }

    public function deposit(float $amount): void
    {
        $this->balance += $amount;
    }

    public function getBalance(): float
    {
        return $this->balance;
    }
}

$bankAccount = new BankAccount();

// Покупаем обувь...
$bankAccount->withdraw(100);

// Получаем баланс
$balance = $bankAccount->getBalance();
```

---

**Используйте private/protected для полей классов**

Плохо:
```php
class Employee
{
    public string $name;

    public function __construct(string $name)
    {
        $this->name = $name;
    }
}

$employee = new Employee('John Doe');
// Сотрудник меняет имя...
echo $employee->name; // John Doe
```

Хорошо:
```php
class Employee
{
    public function __construct(
        private readonly string $name,
    ) {}

    public function getName(): string
    {
        return $this->name;
    }
}

$employee = new Employee('John Doe');
echo $employee->getName(); // John Doe
```

---

### Классы

**Предпочитайте композицию наследованию**

Как сказано в «Паттернах проектирования» банды четырёх: там, где это возможно, вы должны предпочитать композицию наследованию. Есть много веских причин использовать наследование, но также много причин предпочесть композицию.

Главный момент этого принципа: если вы инстинктивно тянетесь к наследованию, попробуйте подумать, может ли композиция лучше решить вашу проблему. В некоторых случаях это действительно так.

Плохо:
```php
class Employee
{
    public function __construct(
        private readonly string $name,
        private readonly string $email,
    ) {}

    // ...
}

// Плохо, потому что Employees "имеют" налоговые данные,
// а EmployeeTaxData не является типом Employee
class EmployeeTaxData extends Employee
{
    public function __construct(
        string $name,
        string $email,
        private readonly string $ssn,
        private readonly string $salary,
    ) {
        parent::__construct($name, $email);
    }

    // ...
}
```

Хорошо:
```php
class EmployeeTaxData
{
    public function __construct(
        public readonly string $ssn,
        public readonly string $salary,
    ) {}

    // ...
}

class Employee
{
    private ?EmployeeTaxData $taxData = null;

    public function __construct(
        private readonly string $name,
        private readonly string $email,
    ) {}

    public function setTaxData(EmployeeTaxData $taxData): void
    {
        $this->taxData = $taxData;
    }

    // ...
}
```

---

**Избегайте Fluent Interface**

Fluent Interface — объектно-ориентированный API, цель которого — улучшение читаемости исходного кода за счёт применения «цепочки методов» (method chaining). Хотя существуют случаи, где это оправдано (например, построители запросов), в большинстве ситуаций это создаёт проблемы.

Плохо:
```php
class Car
{
    private string $make  = 'Honda';
    private string $model = 'Accord';
    private string $color = 'white';

    public function setMake(string $make): static
    {
        $this->make = $make;
        return $this;
    }

    public function setModel(string $model): static
    {
        $this->model = $model;
        return $this;
    }

    public function setColor(string $color): static
    {
        $this->color = $color;
        return $this;
    }

    public function dump(): void
    {
        var_dump($this->make, $this->model, $this->color);
    }
}

$car = (new Car())
    ->setColor('pink')
    ->setMake('Ford')
    ->setModel('F-150')
    ->dump();
```

Хорошо:
```php
class Car
{
    public function __construct(
        private string $make  = 'Honda',
        private string $model = 'Accord',
        private string $color = 'white',
    ) {}

    public function setMake(string $make): void
    {
        $this->make = $make;
    }

    public function setModel(string $model): void
    {
        $this->model = $model;
    }

    public function setColor(string $color): void
    {
        $this->color = $color;
    }

    public function dump(): void
    {
        var_dump($this->make, $this->model, $this->color);
    }
}

$car = new Car();
$car->setColor('pink');
$car->setMake('Ford');
$car->setModel('F-150');
$car->dump();
```

---

**Предпочитайте final классы**

`final` следует использовать всегда, когда это возможно:

- предотвращает неконтролируемые цепочки наследования;
- поощряет использование композиции;
- поощряет паттерн «Единственная ответственность»;
- поощряет разработчиков использовать ваши публичные методы, а не наследовать и переопределять их;
- позволяет изменять внутренний код без риска сломать дочерние классы.

Единственное условие — ваш класс должен реализовывать интерфейс, и никаких других публичных методов не определено.

Плохо:
```php
final class Car
{
    private string $color;

    public function __construct(
        private readonly ColorEnum $make,
        private readonly string    $model,
        string $color,
    ) {
        $this->color = $color;
    }

    public function getColor(): string
    {
        return $this->color;
    }
}
```

Хорошо:
```php
interface Vehicle
{
    public function getColor(): string;
}

final class Car implements Vehicle
{
    public function __construct(
        private readonly ColorEnum $make,
        private readonly string    $model,
        private readonly string    $color,
    ) {}

    public function getColor(): string
    {
        return $this->color;
    }
}
```

---

### SOLID

#### S — Принцип единственной ответственности (SRP)

Как сказано в «Чистом коде»: «Не должно быть более одной причины для изменения класса». Соблазнительно набить класс множеством функций, как мы делаем с сумкой для ручной клади в самолёте. Проблема в том, что ваш класс не будет концептуально связным, и это даст ему много причин для изменения.

Плохо:
```php
class UserSettings
{
    public function __construct(
        private readonly User $user,
    ) {}

    public function changeSettings(UserSettingsDto $settings): void
    {
        if ($this->verifyCredentials()) {
            // ...
        }
    }

    private function verifyCredentials(): bool
    {
        // ...
    }
}
```

Хорошо:
```php
class UserAuth
{
    public function __construct(
        private readonly User $user,
    ) {}

    public function verifyCredentials(): bool
    {
        // ...
    }
}

class UserSettings
{
    private readonly UserAuth $auth;

    public function __construct(
        private readonly User $user,
    ) {
        $this->auth = new UserAuth($user);
    }

    public function changeSettings(UserSettingsDto $settings): void
    {
        if ($this->auth->verifyCredentials()) {
            // ...
        }
    }
}
```

---

#### O — Принцип открытости/закрытости (OCP)

Как сказал Бертран Мейер: «Программные объекты (классы, модули, функции и т.д.) должны быть открыты для расширения, но закрыты для изменения». Что это значит на практике? Этот принцип говорит о том, что вы должны позволить пользователям расширять функциональность вашего модуля, не изменяя его исходный код.

Плохо:
```php
abstract class Adapter
{
    abstract public function getName(): string;
}

class AjaxAdapter extends Adapter
{
    public function getName(): string
    {
        return 'ajaxAdapter';
    }
}

class NodeAdapter extends Adapter
{
    public function getName(): string
    {
        return 'nodeAdapter';
    }
}

class HttpRequester
{
    public function __construct(
        private readonly Adapter $adapter,
    ) {}

    public function fetch(string $url): Promise
    {
        $adapterName = $this->adapter->getName();

        if ($adapterName === 'ajaxAdapter') {
            return $this->makeAjaxCall($url);
        } elseif ($adapterName === 'nodeAdapter') {
            return $this->makeHttpCall($url);
        }
    }

    private function makeAjaxCall(string $url): Promise
    {
        // request and return promise
    }

    private function makeHttpCall(string $url): Promise
    {
        // request and return promise
    }
}
```

Хорошо:
```php
interface Adapter
{
    public function request(string $url): Promise;
}

class AjaxAdapter implements Adapter
{
    public function request(string $url): Promise
    {
        // request and return promise
    }
}

class NodeAdapter implements Adapter
{
    public function request(string $url): Promise
    {
        // request and return promise
    }
}

class HttpRequester
{
    public function __construct(
        private readonly Adapter $adapter,
    ) {}

    public function fetch(string $url): Promise
    {
        return $this->adapter->request($url);
    }
}
```

---

#### L — Принцип подстановки Лисков (LSP)

Это страшное название для очень простой концепции. Формально она определяется так: «Если S является подтипом T, то объекты типа T могут быть заменены объектами типа S без изменения каких-либо желательных свойств программы». Ещё более пугающее определение.

Лучший способ объяснить это — квадрат и прямоугольник. Математически квадрат — это прямоугольник, но если вы реализуете его через наследование с отношением «является», то быстро столкнётесь с проблемой.

Плохо:
```php
class Rectangle
{
    public function __construct(
        protected float $width  = 0.0,
        protected float $height = 0.0,
    ) {}

    public function setWidth(float $width): void
    {
        $this->width = $width;
    }

    public function setHeight(float $height): void
    {
        $this->height = $height;
    }

    public function getArea(): float
    {
        return $this->width * $this->height;
    }
}

class Square extends Rectangle
{
    public function setWidth(float $width): void
    {
        $this->width  = $width;
        $this->height = $width;
    }

    public function setHeight(float $height): void
    {
        $this->width  = $height;
        $this->height = $height;
    }
}

function printArea(Rectangle $rectangle): void
{
    $rectangle->setWidth(4);
    $rectangle->setHeight(5);

    // Плохо: вернёт 25 для Square, а не 20
    echo sprintf('%s has area %d.', get_class($rectangle), $rectangle->getArea()) . PHP_EOL;
}

$rectangles = [new Rectangle(), new Square()];

foreach ($rectangles as $rectangle) {
    printArea($rectangle);
}
```

Хорошо:
```php
interface Shape
{
    public function getArea(): float;
}

class Rectangle implements Shape
{
    public function __construct(
        private readonly float $width,
        private readonly float $height,
    ) {}

    public function getArea(): float
    {
        return $this->width * $this->height;
    }
}

class Square implements Shape
{
    public function __construct(
        private readonly float $side,
    ) {}

    public function getArea(): float
    {
        return $this->side ** 2;
    }
}

function printArea(Shape $shape): void
{
    echo sprintf('%s has area %d.', get_class($shape), $shape->getArea()) . PHP_EOL;
}

$shapes = [new Rectangle(width: 4, height: 5), new Square(side: 5)];

foreach ($shapes as $shape) {
    printArea($shape);
}
```

---

#### I — Принцип разделения интерфейсов (ISP)

ISP гласит, что «клиенты не должны зависеть от интерфейсов, которые они не используют». Хороший пример демонстрации этого принципа — классы, которым требуется большие объекты настроек.

Плохо:
```php
interface Employee
{
    public function work(): void;
    public function eat(): void;
}

class HumanEmployee implements Employee
{
    public function work(): void
    {
        // ....working
    }

    public function eat(): void
    {
        // ...... eating in lunch break
    }
}

class RobotEmployee implements Employee
{
    public function work(): void
    {
        //.... working much more
    }

    public function eat(): void
    {
        //.... robot cannot eat, but it must implement this method
    }
}
```

Хорошо:
```php
interface Workable
{
    public function work(): void;
}

interface Feedable
{
    public function eat(): void;
}

interface Employee extends Workable, Feedable {}

class HumanEmployee implements Employee
{
    public function work(): void
    {
        // ....working
    }

    public function eat(): void
    {
        //.... eating in lunch break
    }
}

// robot only implements Workable
class RobotEmployee implements Workable
{
    public function work(): void
    {
        //.... working much more
    }
}
```

---

#### D — Принцип инверсии зависимостей (DIP)

Этот принцип утверждает две основные вещи:

1. Модули высокого уровня не должны зависеть от модулей низкого уровня. И те, и другие должны зависеть от абстракций.
2. Абстракции не должны зависеть от деталей. Детали должны зависеть от абстракций.

Плохо:
```php
class Employee
{
    public function work(): void
    {
        // ....working
    }
}

class Robot extends Employee
{
    public function work(): void
    {
        //.... working much more
    }
}

class Manager
{
    private Employee $employee;

    public function __construct(Employee $employee)
    {
        $this->employee = $employee;
    }

    public function manage(): void
    {
        $this->employee->work();
    }
}
```

Хорошо:
```php
interface Employee
{
    public function work(): void;
}

class HumanEmployee implements Employee
{
    public function work(): void
    {
        // ....working
    }
}

class RobotEmployee implements Employee
{
    public function work(): void
    {
        //.... working much more
    }
}

class Manager
{
    public function __construct(
        private readonly Employee $employee,
    ) {}

    public function manage(): void
    {
        $this->employee->work();
    }
}
```

---

## Возможности PHP 8.2+ (доступны в PHP 8.5)

### Readonly классы

В PHP 8.2+ появилась возможность объявлять весь класс как `readonly`. Это делает все объявленные свойства автоматически `readonly`, исключает добавление динамических свойств и позволяет создавать полностью иммутабельные объекты без повторения модификатора у каждого свойства.

```php
readonly class Point
{
    public function __construct(
        public float $x,
        public float $y,
        public float $z,
    ) {}
}

$point = new Point(x: 1.5, y: 2.0, z: 3.7);

// Ошибка: нельзя изменить свойство readonly-класса
// $point->x = 4.0;
```

Readonly классы отлично подходят для Value Objects, DTO и структур данных, которые не должны изменяться после создания.

---

### DNF-типы (Disjunctive Normal Form)

PHP 8.2+ позволяет комбинировать объединённые (union) и пересечённые (intersection) типы в одном объявлении. Синтаксис требует оборачивать каждую пересечённую группу в скобки.

```php
// Принимает тип, реализующий оба интерфейса, ИЛИ null
function processInput((Stringable&Countable)|null $input): void
{
    if ($input === null) {
        return;
    }

    echo $input; // Stringable
    echo count($input); // Countable
}
```

---

### `true`, `false` и `null` как самостоятельные типы

PHP 8.2+ добавляет `true`, `false` и `null` в качестве самостоятельных возвращаемых типов. Это позволяет точнее документировать намерения функции без использования `bool`.

```php
// До PHP 8.2 — только bool
function alwaysTrue(): bool
{
    return true;
}

// PHP 8.2+
function alwaysTrue(): true
{
    return true;
}

function findUser(int $id): User|null
{
    // ...
}

// Более явно:
function deleteRecord(int $id): true
{
    // удаляет запись или бросает исключение
    return true;
}
```

---

### Константы в трейтах

PHP 8.2+ позволяет определять константы внутри трейтов. Ранее это было невозможно.

```php
trait HasTimestamps
{
    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = 'updated_at';

    public function getTimestampColumns(): array
    {
        return [self::CREATED_AT, self::UPDATED_AT];
    }
}

class Post
{
    use HasTimestamps;
}

echo Post::CREATED_AT; // 'created_at'
```

---

### Перечисления (Enums)

Enums введены в PHP 8.1 и активно используются в PHP 8.2+ для замены наборов констант в классах. Используйте enum там, где ранее использовались классы с константами, представляющими фиксированный набор значений.

Плохо:
```php
class Status
{
    const ACTIVE   = 'active';
    const INACTIVE = 'inactive';
    const PENDING  = 'pending';
}

function activate(string $status): void
{
    // Нет гарантии, что $status — это допустимое значение
}
```

Хорошо:
```php
enum Status: string
{
    case Active   = 'active';
    case Inactive = 'inactive';
    case Pending  = 'pending';

    public function label(): string
    {
        return match($this) {
            Status::Active   => 'Активен',
            Status::Inactive => 'Неактивен',
            Status::Pending  => 'На рассмотрении',
        };
    }

    public function isActive(): bool
    {
        return $this === Status::Active;
    }
}

function activate(Status $status): void
{
    // Тип гарантирован на уровне PHP
}

$status = Status::Active;
echo $status->label();   // Активен
echo $status->value;     // active
```

---

### Файберы (Fibers)

Файберы (введены в PHP 8.1, стабилизированы в 8.2+) — это примитивы для реализации кооперативной многозадачности. Они позволяют приостанавливать и возобновлять выполнение кода без использования генераторов.

```php
$fiber = new Fiber(function (): void {
    $value = Fiber::suspend('волокно');
    echo "Значение, переданное в файбер при возобновлении: " . $value . "\n";
});

$value = $fiber->start();

echo "Значение из файбера при приостановке: " . $value . "\n";

$fiber->resume('тест');
```

Файберы являются основой асинхронных фреймворков (например, ReactPHP, Amp v3+) и не предназначены для прямого использования в прикладном коде — для этого используйте соответствующие высокоуровневые абстракции.

---

### Именованные аргументы

Именованные аргументы (введены в PHP 8.0) улучшают читаемость при вызове функций со многими параметрами или с параметрами по умолчанию, которые нужно пропустить.

```php
// Сложно читать без IDE: что означает true и false?
$result = array_slice($array, 0, 10, true);

// С именованными аргументами — ясно
$result = array_slice(
    array: $array,
    offset: 0,
    length: 10,
    preserve_keys: true,
);
```

```php
function createUser(
    string $name,
    string $email,
    bool   $isAdmin    = false,
    bool   $isVerified = false,
): User {
    // ...
}

// Пропускаем $isAdmin, передаём только $isVerified
$user = createUser(
    name: 'Ivan',
    email: 'ivan@example.com',
    isVerified: true,
);
```
