<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Автоудаление выполненных напоминаний старше 7 дней (DEV-25). Планировщик
// в проде запускается cron'ом хоста: `docker exec reminders_serve php artisan
// schedule:run` раз в минуту (OPS-12). Ежечасно — чтобы лаг после порога
// не превышал часа.
Schedule::command('reminders:purge-completed')->hourly()->withoutOverlapping();
