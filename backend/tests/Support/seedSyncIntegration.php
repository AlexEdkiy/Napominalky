<?php

declare(strict_types=1);
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Hash;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (! $app->environment('testing') || config('database.connections.pgsql.database') !== 'reminders_test') {
    throw new RuntimeException('Only the disposable test database is allowed.');
}

User::factory()->create([
    'email' => 'dev26@example.test',
    'password' => Hash::make('test-password-26'),
]);
