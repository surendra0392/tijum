<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Financial;

use App\Enums\RelocationSubsidyStatus;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\PlatformRelocationSubsidy;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminRelocationSubsidyController extends Controller
{
    public function index(Request $request): Response
    {
        $query = PlatformRelocationSubsidy::query()->with([
            'sourceReservation.property',
            'replacementReservation.property',
            'case',
            'approvedByAdmin',
        ]);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $subsidies = $query->latest('id')->paginate(20)->withQueryString();

        $all = PlatformRelocationSubsidy::all();
        $totalSubsidized = (int) $all->where('status', RelocationSubsidyStatus::Approved)->sum('subsidy_amount_minor')
            + (int) $all->where('status', RelocationSubsidyStatus::Funded)->sum('subsidy_amount_minor');

        return Inertia::render('admin/relocations/subsidies', [
            'subsidies' => [
                'data' => $subsidies->getCollection()->map(fn (PlatformRelocationSubsidy $sub): array => [
                    'id' => $sub->id,
                    'subsidy_reference' => $sub->subsidy_reference,
                    'source_booking_reference' => $sub->sourceReservation->booking_reference,
                    'source_property_name' => $sub->sourceReservation->property?->name,
                    'replacement_booking_reference' => $sub->replacementReservation->booking_reference,
                    'replacement_property_name' => $sub->replacementReservation->property?->name,
                    'case_reference' => $sub->case?->case_reference,
                    'source_amount_minor' => $sub->source_amount_minor,
                    'destination_amount_minor' => $sub->destination_amount_minor,
                    'subsidy_amount_minor' => $sub->subsidy_amount_minor,
                    'currency' => $sub->currency,
                    'status' => $sub->status->value,
                    'status_label' => $sub->status->label(),
                    'approved_by' => $sub->approvedByAdmin?->name,
                    'approved_at' => $sub->approved_at?->toIso8601String(),
                    'created_at' => $sub->created_at?->toIso8601String(),
                ]),
                'current_page' => $subsidies->currentPage(),
                'last_page' => $subsidies->lastPage(),
                'per_page' => $subsidies->perPage(),
                'total' => $subsidies->total(),
            ],
            'metrics' => [
                'total_subsidized_minor' => $totalSubsidized,
                'count' => $all->count(),
            ],
            'filters' => [
                'status' => $request->query('status'),
            ],
        ]);
    }

    public function approve(PlatformRelocationSubsidy $subsidy, Request $request): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        abort_unless($admin->hasPermission('relocations.subsidies.manage'), 403);

        $subsidy->forceFill([
            'status' => RelocationSubsidyStatus::Approved,
            'approved_by_admin_id' => $admin->id,
            'approved_at' => CarbonImmutable::now(),
        ])->save();

        return back()->with('success', "Relocation subsidy {$subsidy->subsidy_reference} approved.");
    }
}
