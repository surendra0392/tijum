<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReviewPolicyController extends Controller
{
    public function show(Request $request): Response
    {
        return Inertia::render('public/review-policy', [
            'submissionWindowDays' => (int) config('tijum.reviews.submission_window_days', 30),
            'editWindowDays' => (int) config('tijum.reviews.edit_window_days', 7),
            'maxContentLength' => (int) config('tijum.reviews.max_content_length', 3000),
            'grievanceOfficer' => config('tijum.customer_protection.grievance_officer'),
        ]);
    }
}
