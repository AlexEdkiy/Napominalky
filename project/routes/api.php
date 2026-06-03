<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — /api/v1
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api/v1 (configured in bootstrap/app.php).
|
| Authentication:  Laravel Sanctum (token-based, auth:sanctum middleware)
| Rate limiting:   throttle:api (60 req/min by default)
| JSON format:     snake_case fields, defined by API Resources
|
| Groups:
|   Auth      — /auth/*           (register, login, logout, me)
|   Notes     — /notes/*          (CRUD + pin/archive)
|   Lists     — /shopping-lists/* (CRUD + items)
|   Reminders — /reminders/*      (CRUD + complete/snooze)
|   Sync      — /sync/*           (pull changes, push changes, conflicts)
|   Devices   — /devices/*        (list, update, delete)
|   Settings  — /settings/*       (sync toggle)
|   Account   — /account          (delete account, FR-42)
|   Admin     — /admin/*          (users management, admin-only)
|
| Routes are registered by MBE agent controllers for each domain.
| See docs/architecture/mvp-architecture.md for the full API contract.
|
*/

Route::prefix('v1')->name('api.v1.')->group(function (): void {

    // ------------------------------------------------------------------
    // Auth — unauthenticated endpoints (register / login)
    // ------------------------------------------------------------------
    Route::prefix('auth')->name('auth.')->group(function (): void {
        // POST /api/v1/auth/register  → App\Http\Controllers\Auth\RegisterController
        // POST /api/v1/auth/login     → App\Http\Controllers\Auth\LoginController
        // (controllers added by MBE agent in task MBE-1)
    });

    // ------------------------------------------------------------------
    // Authenticated endpoints — require valid Sanctum token
    // ------------------------------------------------------------------
    Route::middleware('auth:sanctum')->group(function (): void {

        // Auth — authenticated actions
        Route::prefix('auth')->name('auth.')->group(function (): void {
            // DELETE /api/v1/auth/logout  → App\Http\Controllers\Auth\LogoutController
            // GET    /api/v1/auth/me      → App\Http\Controllers\Auth\MeController
        });

        // Account deletion (FR-42)
        // DELETE /api/v1/account  → App\Http\Controllers\Account\DeleteAccountController

        // Notes (FR-5..FR-11)
        Route::prefix('notes')->name('notes.')->group(function (): void {
            // GET    /api/v1/notes               → App\Http\Controllers\Notes\IndexController
            // POST   /api/v1/notes               → App\Http\Controllers\Notes\StoreController
            // GET    /api/v1/notes/{uuid}         → App\Http\Controllers\Notes\ShowController
            // PUT    /api/v1/notes/{uuid}         → App\Http\Controllers\Notes\UpdateController
            // DELETE /api/v1/notes/{uuid}         → App\Http\Controllers\Notes\DestroyController
            // POST   /api/v1/notes/{uuid}/pin     → App\Http\Controllers\Notes\PinController
            // POST   /api/v1/notes/{uuid}/archive → App\Http\Controllers\Notes\ArchiveController
        });

        // Shopping Lists (FR-12..FR-18)
        Route::prefix('shopping-lists')->name('shopping-lists.')->group(function (): void {
            // GET    /api/v1/shopping-lists                              → ShoppingLists\IndexController
            // POST   /api/v1/shopping-lists                              → ShoppingLists\StoreController
            // GET    /api/v1/shopping-lists/{uuid}                       → ShoppingLists\ShowController
            // PUT    /api/v1/shopping-lists/{uuid}                       → ShoppingLists\UpdateController
            // DELETE /api/v1/shopping-lists/{uuid}                       → ShoppingLists\DestroyController
            // GET    /api/v1/shopping-lists/{uuid}/items                 → Items\IndexController
            // POST   /api/v1/shopping-lists/{uuid}/items                 → Items\StoreController
            // PUT    /api/v1/shopping-lists/{uuid}/items/{itemUuid}      → Items\UpdateController
            // DELETE /api/v1/shopping-lists/{uuid}/items/{itemUuid}      → Items\DestroyController
            // POST   /api/v1/shopping-lists/{uuid}/items/{itemUuid}/check → Items\CheckController
        });

        // Reminders (FR-19..FR-25)
        Route::prefix('reminders')->name('reminders.')->group(function (): void {
            // GET    /api/v1/reminders                 → Reminders\IndexController
            // POST   /api/v1/reminders                 → Reminders\StoreController
            // GET    /api/v1/reminders/{uuid}           → Reminders\ShowController
            // PUT    /api/v1/reminders/{uuid}           → Reminders\UpdateController
            // DELETE /api/v1/reminders/{uuid}           → Reminders\DestroyController
            // POST   /api/v1/reminders/{uuid}/complete  → Reminders\CompleteController
            // POST   /api/v1/reminders/{uuid}/snooze    → Reminders\SnoozeController
        });

        // Sync — delta sync engine (FR-33..FR-37)
        Route::prefix('sync')->name('sync.')->group(function (): void {
            // GET  /api/v1/sync/changes   → Sync\ChangesController  (pull: ?since={revision})
            // POST /api/v1/sync/push      → Sync\PushController     (push outbox batch)
            // GET  /api/v1/sync/conflicts → Sync\ConflictsController (view unresolved)
        });

        // Devices — multi-device sync bookkeeping (FR-35)
        Route::prefix('devices')->name('devices.')->group(function (): void {
            // PUT    /api/v1/devices/{uuid} → Devices\UpdateController
            // DELETE /api/v1/devices/{uuid} → Devices\DestroyController
        });

        // Settings (FR-43..FR-45)
        Route::prefix('settings')->name('settings.')->group(function (): void {
            // PATCH /api/v1/settings/sync → Settings\ToggleSyncController
        });

        // Admin — requires is_admin (enforced via AdminPolicy in each controller)
        Route::prefix('admin')->name('admin.')->group(function (): void {
            // GET /api/v1/admin/users      → Admin\Users\IndexController
            // GET /api/v1/admin/users/{id} → Admin\Users\ShowController
        });
    });
});
