<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureAccountEmailVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->user()?->ensureEmailVerified();

        return $next($request);
    }
}
