<?php

declare(strict_types=1);

namespace App\Http\Controllers\Search;

use App\Http\Controllers\Controller;
use App\Http\Requests\Search\SearchRequest;
use App\Http\Resources\SearchResultResource;
use App\Services\Search\SearchService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class IndexController extends Controller
{
    public function __invoke(SearchRequest $request, SearchService $search): AnonymousResourceCollection
    {
        return SearchResultResource::collection($search->search(
            $request->user()->id,
            $request->string('q')->toString(),
            $request->string('type', 'all')->toString(),
            $request->integer('per_page', 20),
        ));
    }
}
