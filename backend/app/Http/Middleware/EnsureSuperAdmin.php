<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware: EnsureSuperAdmin
 *
 * Verifies that the authenticated user has super-admin rights (is_super_admin === true).
 * Applied to mutating /api/v1/admin/* routes as alias "superadmin".
 *
 * Defense-in-depth: controllers additionally perform action-level guard validation
 * via Form Request authorize() methods.
 */
final class EnsureSuperAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->is_super_admin !== true) {
            abort(403, 'Forbidden.');
        }

        return $next($request);
    }
}
