<?php

declare(strict_types=1);

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DesignSystemController extends Controller
{
    public function __invoke(): Response
    {
        abort_unless(app()->environment(['local', 'testing']), 404);

        return Inertia::render('dev/design-system');
    }
}
