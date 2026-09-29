<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
        $this->configureGates();
    }

    /**
     * Define application-level authorization gates.
     *
     * 'admin-access' grants entry to admin-only endpoints.
     * Admin middleware (MBE-8) adds a first-line guard on routes;
     * controllers call $this->authorize('admin-access') as a second layer.
     */
    private function configureGates(): void
    {
        Gate::define('admin-access', static fn (User $user): bool => $user->is_admin === true);
    }

    private function configureRateLimiting(): void
    {
        // Auth endpoints (register/login): 5 requests per minute per client IP.
        RateLimiter::for('auth', static fn (Request $request): Limit => Limit::perMinute(5)->by($request->ip()));
    }
}
