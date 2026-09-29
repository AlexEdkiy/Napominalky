<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reminders;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reminder\IndexReminderRequest;
use App\Http\Resources\ReminderResource;
use App\Models\Reminder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class IndexController extends Controller
{
    private const int DEFAULT_PER_PAGE = 15;

    private const string DEFAULT_SORT = 'remind_at';

    private const string DEFAULT_ORDER = 'asc';

    public function __invoke(IndexReminderRequest $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Reminder::class);

        $status = $request->string('filter.status', 'all')->toString();

        $query = $request->user()->reminders()
            ->when($status === 'pending', fn (Builder $q) => $q->pending())
            ->when($status === 'completed', fn (Builder $q) => $q->completed())
            ->orderBy($this->resolveSort($request), $this->resolveOrder($request));

        $reminders = $query->paginate($this->resolvePerPage($request));

        return ReminderResource::collection($reminders);
    }

    private function resolveSort(IndexReminderRequest $request): string
    {
        return $request->string('sort', self::DEFAULT_SORT)->toString();
    }

    private function resolveOrder(IndexReminderRequest $request): string
    {
        return $request->string('order', self::DEFAULT_ORDER)->toString();
    }

    private function resolvePerPage(IndexReminderRequest $request): int
    {
        return (int) ($request->integer('per_page') ?: self::DEFAULT_PER_PAGE);
    }
}
