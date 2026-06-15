<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware: EnsureAdmin
 *
 * Verifies that the authenticated user has admin rights (is_admin === true).
 * Applied to /api/v1/admin/* routes as alias "admin".
 *
 * Defense-in-depth: controllers additionally call $this->authorize('admin-access')
 * which resolves the Gate registered in AppServiceProvider.
 */
final class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->is_admin !== true) {
            abort(403, 'Forbidden.');
        }

        return $next($request);
    }
}
