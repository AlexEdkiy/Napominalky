<?php

declare(strict_types=1);

namespace App\Http\Controllers\Account;

use App\Actions\User\DeleteAccountAction;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class DeleteAccountController extends Controller
{
    public function __construct(
        private readonly DeleteAccountAction $deleteAccount,
    ) {}

    public function __invoke(Request $request): Response
    {
        ($this->deleteAccount)($request->user());

        return response()->noContent();
    }
}
