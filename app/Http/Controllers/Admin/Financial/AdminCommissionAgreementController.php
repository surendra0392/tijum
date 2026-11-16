<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Financial;

use App\Enums\CommissionAgreementStatus;
use App\Enums\CommissionBaseType;
use App\Enums\CommissionGstType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCommissionAgreementRequest;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\PartnerCommissionAgreement;
use App\Models\Property;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminCommissionAgreementController extends Controller
{
    public function index(Request $request): Response
    {
        $query = PartnerCommissionAgreement::query()->with(['owner', 'property', 'createdByAdmin']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $agreements = $query->latest('id')->paginate(20)->withQueryString();

        return Inertia::render('admin/commissions/index', [
            'agreements' => [
                'data' => $agreements->getCollection()->map(fn (PartnerCommissionAgreement $a): array => [
                    'id' => $a->id,
                    'agreement_reference' => $a->agreement_reference,
                    'owner_name' => $a->owner->name,
                    'owner_email' => $a->owner->email,
                    'property_name' => $a->property?->name ?? 'All Properties (Owner-Wide)',
                    'commission_rate_bps' => $a->commission_rate_bps,
                    'commission_rate_percentage' => $a->getCommissionPercentage(),
                    'commission_base_type' => $a->commission_base_type->value,
                    'commission_base_label' => $a->commission_base_type->label(),
                    'commission_gst_type' => $a->commission_gst_type->value,
                    'commission_gst_label' => $a->commission_gst_type->label(),
                    'status' => $a->status->value,
                    'status_label' => $a->status->label(),
                    'effective_from' => $a->effective_from->toDateString(),
                    'effective_until' => $a->effective_until?->toDateString(),
                    'accepted_at' => $a->accepted_at?->toIso8601String(),
                    'created_by' => $a->createdByAdmin?->name,
                ]),
                'current_page' => $agreements->currentPage(),
                'last_page' => $agreements->lastPage(),
                'per_page' => $agreements->perPage(),
                'total' => $agreements->total(),
            ],
            'filters' => [
                'status' => $request->query('status'),
            ],
        ]);
    }

    public function create(): Response
    {
        $partners = Owner::query()
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        $properties = Property::query()
            ->orderBy('name')
            ->get(['id', 'owner_id', 'name']);

        return Inertia::render('admin/commissions/create', [
            'partners' => $partners,
            'properties' => $properties,
        ]);
    }

    public function store(
        StoreCommissionAgreementRequest $request,
    ): RedirectResponse {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        $validated = $request->validated();

        $now = CarbonImmutable::now();
        $ref = 'TCA-'.$now->format('Y').'-'.strtoupper(Str::ulid()->toBase32());

        $status = ($validated['send_for_acceptance'] ?? false)
            ? CommissionAgreementStatus::PendingAcceptance
            : CommissionAgreementStatus::Draft;

        $agreement = PartnerCommissionAgreement::create([
            'agreement_reference' => $ref,
            'owner_id' => $validated['owner_id'],
            'property_id' => $validated['property_id'] ?? null,
            'commission_rate_bps' => (int) $validated['commission_rate_bps'],
            'commission_base_type' => CommissionBaseType::from($validated['commission_base_type']),
            'commission_gst_type' => CommissionGstType::from($validated['commission_gst_type']),
            'terms_version' => '1.0',
            'status' => $status,
            'effective_from' => $validated['effective_from'],
            'effective_until' => $validated['effective_until'] ?? null,
            'admin_notes' => $validated['admin_notes'] ?? null,
            'created_by_admin_id' => $admin->id,
            'approved_by_admin_id' => $admin->id,
        ]);

        return redirect()->route('admin.partner-commissions.index')
            ->with('success', "Commission agreement {$agreement->agreement_reference} created successfully.");
    }

    public function activate(
        PartnerCommissionAgreement $agreement,
        Request $request,
    ): RedirectResponse {
        /** @var Admin $admin */
        $admin = $request->user('admin');

        $agreement->forceFill([
            'status' => CommissionAgreementStatus::Active,
            'approved_by_admin_id' => $admin->id,
        ])->save();

        return back()->with('success', "Agreement {$agreement->agreement_reference} activated.");
    }
}
