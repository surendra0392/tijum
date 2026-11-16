<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Search;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Services\Admin\AdminGlobalSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSearchController extends Controller
{
    public function __construct(
        private readonly AdminGlobalSearchService $searchService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');

        $query = (string) $request->query('q', '');

        $results = $this->searchService->search($query, $admin);

        return response()->json([
            'query' => $query,
            'results' => $results,
        ]);
    }
}
