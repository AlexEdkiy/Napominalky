<?php

declare(strict_types=1);

use App\Http\Controllers\Account\DeleteAccountController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Notes\ArchiveController as NoteArchiveController;
use App\Http\Controllers\Notes\DestroyController as NoteDestroyController;
use App\Http\Controllers\Notes\IndexController as NoteIndexController;
use App\Http\Controllers\Notes\PinController as NotePinController;
use App\Http\Controllers\Notes\ShowController as NoteShowController;
use App\Http\Controllers\Notes\StoreController as NoteStoreController;
use App\Http\Controllers\Notes\UpdateController as NoteUpdateController;
use App\Http\Controllers\Reminders\CompleteController as ReminderCompleteController;
use App\Http\Controllers\Reminders\DestroyController as ReminderDestroyController;
use App\Http\Controllers\Reminders\IndexController as ReminderIndexController;
use App\Http\Controllers\Reminders\ShowController as ReminderShowController;
use App\Http\Controllers\Reminders\SnoozeController as ReminderSnoozeController;
use App\Http\Controllers\Reminders\StoreController as ReminderStoreController;
use App\Http\Controllers\Reminders\UpdateController as ReminderUpdateController;
use App\Http\Controllers\ShoppingLists\DestroyController as ListDestroyController;
use App\Http\Controllers\ShoppingLists\IndexController as ListIndexController;
use App\Http\Controllers\ShoppingLists\Items\CheckController as ItemCheckController;
use App\Http\Controllers\ShoppingLists\Items\DestroyController as ItemDestroyController;
use App\Http\Controllers\ShoppingLists\Items\IndexController as ItemIndexController;
use App\Http\Controllers\ShoppingLists\Items\StoreController as ItemStoreController;
use App\Http\Controllers\ShoppingLists\Items\UpdateController as ItemUpdateController;
use App\Http\Controllers\ShoppingLists\ShowController as ListShowController;
use App\Http\Controllers\ShoppingLists\StoreController as ListStoreController;
use App\Http\Controllers\ShoppingLists\UpdateController as ListUpdateController;
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
    Route::prefix('auth')->name('auth.')->middleware('throttle:auth')->group(function (): void {
        Route::post('register', RegisterController::class)->name('register');
        Route::post('login', LoginController::class)->name('login');
    });

    // ------------------------------------------------------------------
    // Authenticated endpoints — require valid Sanctum token
    // ------------------------------------------------------------------
    Route::middleware('auth:sanctum')->group(function (): void {

        // Auth — authenticated actions
        Route::prefix('auth')->name('auth.')->group(function (): void {
            Route::delete('logout', LogoutController::class)->name('logout');
            Route::get('me', MeController::class)->name('me');
        });

        // Account deletion (FR-42)
        Route::delete('account', DeleteAccountController::class)->name('account.destroy');

        // Notes (FR-5..FR-11) — route model binding {note} по uuid (getRouteKeyName)
        Route::prefix('notes')->name('notes.')->group(function (): void {
            Route::get('/', NoteIndexController::class)->name('index');
            Route::post('/', NoteStoreController::class)->name('store');
            Route::get('{note}', NoteShowController::class)->name('show');
            Route::put('{note}', NoteUpdateController::class)->name('update');
            Route::delete('{note}', NoteDestroyController::class)->name('destroy');
            Route::post('{note}/pin', NotePinController::class)->name('pin');
            Route::post('{note}/archive', NoteArchiveController::class)->name('archive');
        });

        // Shopping Lists (FR-12..FR-18) — route model binding {shopping_list}/{item} по uuid
        Route::prefix('shopping-lists')->name('shopping-lists.')->group(function (): void {
            Route::get('/', ListIndexController::class)->name('index');
            Route::post('/', ListStoreController::class)->name('store');
            Route::get('{shopping_list}', ListShowController::class)->name('show');
            Route::put('{shopping_list}', ListUpdateController::class)->name('update');
            Route::delete('{shopping_list}', ListDestroyController::class)->name('destroy');

            // Вложенные элементы: scopeBindings гарантирует, что {item}
            // ищется внутри relation items() родительского {shopping_list}.
            Route::prefix('{shopping_list}/items')->name('items.')->scopeBindings()
                ->group(function (): void {
                    Route::get('/', ItemIndexController::class)->name('index');
                    Route::post('/', ItemStoreController::class)->name('store');
                    Route::put('{item}', ItemUpdateController::class)->name('update');
                    Route::delete('{item}', ItemDestroyController::class)->name('destroy');
                    Route::post('{item}/check', ItemCheckController::class)->name('check');
                });
        });

        // Reminders (FR-19..FR-25) — route model binding {reminder} по uuid (getRouteKeyName)
        Route::prefix('reminders')->name('reminders.')->group(function (): void {
            Route::get('/', ReminderIndexController::class)->name('index');
            Route::post('/', ReminderStoreController::class)->name('store');
            Route::get('{reminder}', ReminderShowController::class)->name('show');
            Route::put('{reminder}', ReminderUpdateController::class)->name('update');
            Route::delete('{reminder}', ReminderDestroyController::class)->name('destroy');
            Route::post('{reminder}/complete', ReminderCompleteController::class)->name('complete');
            Route::post('{reminder}/snooze', ReminderSnoozeController::class)->name('snooze');
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
