<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\PropertyCategoryResource;
use App\Models\PropertyCategory;
use Illuminate\Http\JsonResponse;

class PublicCategoryController extends ApiController
{
    /**
     * Return all active canonical accommodation categories.
     */
    public function index(): JsonResponse
    {
        $categories = PropertyCategory::query()
            ->active()
            ->ordered()
            ->get();

        return $this->success(
            PropertyCategoryResource::collection($categories),
            'Accommodation categories retrieved successfully',
        );
    }
}
