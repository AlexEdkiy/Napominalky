<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Суперадмин — полный доступ к управлению пользователями
        User::updateOrCreate(
            ['email' => 'admin@demo.local'],
            [
                'name' => 'Admin',
                'password' => Hash::make('password'),
                'is_admin' => true,
                'is_super_admin' => true,
                'is_active' => true,
            ],
        );

        // Обычные демо-пользователи
        User::updateOrCreate(
            ['email' => 'alice@demo.local'],
            [
                'name' => 'Alice',
                'password' => Hash::make('password'),
                'is_admin' => false,
                'is_super_admin' => false,
                'is_active' => true,
            ],
        );

        User::updateOrCreate(
            ['email' => 'bob@demo.local'],
            [
                'name' => 'Bob',
                'password' => Hash::make('password'),
                'is_admin' => false,
                'is_super_admin' => false,
                'is_active' => true,
            ],
        );
    }
}
