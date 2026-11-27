<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Rewards;

use App\Enums\CampaignStatus;
use App\Enums\CampaignType;
use App\Enums\CouponFundingSource;
use App\Enums\CouponOfferType;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\CouponCode;
use App\Models\CouponRedemption;
use App\Models\PromotionalCampaign;
use App\Models\Property;
use App\Models\PropertyCategory;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminCampaignController extends Controller
{
    public function index(): Response
    {
        $campaigns = PromotionalCampaign::query()
            ->withCount('couponCodes')
            ->with('couponCodes')
            ->latest('id')
            ->paginate(15);

        return Inertia::render('admin/rewards/campaigns/index', [
            'campaigns' => [
                'data' => collect($campaigns->items())->map(fn (PromotionalCampaign $c) => [
                    'id' => $c->id,
                    'reference' => $c->campaign_reference,
                    'name' => $c->name,
                    'type' => $c->type->label(),
                    'status' => $c->status->value,
                    'status_label' => $c->status->label(),
                    'starts_at' => $c->starts_at?->format('d M Y'),
                    'ends_at' => $c->ends_at?->format('d M Y'),
                    'budget_minor' => $c->budget_minor,
                    'spent_minor' => $c->spent_minor,
                    'coupons_count' => $c->coupon_codes_count,
                    'coupons' => $c->couponCodes->map(fn (CouponCode $code) => [
                        'code' => $code->code,
                        'offer_type' => $code->offer_type->label(),
                        'used_count' => $code->total_used_count,
                        'is_active' => $code->is_active,
                    ])->all(),
                ])->all(),
                'current_page' => $campaigns->currentPage(),
                'last_page' => $campaigns->lastPage(),
                'total' => $campaigns->total(),
            ],
        ]);
    }

    public function create(): Response
    {
        $categories = PropertyCategory::query()->where('is_active', true)->get(['id', 'name', 'slug']);
        $cities = City::query()->where('is_active', true)->get(['id', 'name', 'slug']);
        $properties = Property::query()->where('status', 'active')->limit(100)->get(['id', 'name']);

        return Inertia::render('admin/rewards/campaigns/create', [
            'categories' => $categories,
            'cities' => $cities,
            'properties' => $properties,
            'types' => array_map(fn ($t) => ['value' => $t->value, 'label' => $t->label()], CampaignType::cases()),
            'offerTypes' => array_map(fn ($t) => ['value' => $t->value, 'label' => $t->label()], CouponOfferType::cases()),
            'fundingSources' => array_map(fn ($f) => ['value' => $f->value, 'label' => $f->label()], CouponFundingSource::cases()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
            'type' => ['required', 'string'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'budget_inr' => ['nullable', 'numeric', 'min:0'],

            // Coupon parameters
            'code' => ['required', 'string', 'max:30', 'unique:coupon_codes,code'],
            'offer_type' => ['required', 'string'],
            'discount_amount_inr' => ['nullable', 'numeric', 'min:0'],
            'discount_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'max_discount_inr' => ['nullable', 'numeric', 'min:0'],
            'bonus_points' => ['nullable', 'integer', 'min:0'],
            'funding_source' => ['required', 'string'],
            'property_funding_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'min_booking_amount_inr' => ['nullable', 'numeric', 'min:0'],
            'min_stay_days' => ['nullable', 'integer', 'min:1'],
            'first_booking_only' => ['boolean'],
            'total_usage_limit' => ['nullable', 'integer', 'min:1'],
            'per_user_limit' => ['nullable', 'integer', 'min:1'],
            'category_ids' => ['nullable', 'array'],
            'city_ids' => ['nullable', 'array'],
            'property_ids' => ['nullable', 'array'],
        ]);

        $admin = $request->user('admin');

        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-'.date('Y').'-'.strtoupper(Str::random(6)),
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']).'-'.Str::random(4),
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'status' => CampaignStatus::Active,
            'starts_at' => ! empty($validated['starts_at']) ? CarbonImmutable::parse($validated['starts_at']) : null,
            'ends_at' => ! empty($validated['ends_at']) ? CarbonImmutable::parse($validated['ends_at']) : null,
            'budget_minor' => isset($validated['budget_inr']) ? (int) ($validated['budget_inr'] * 100) : null,
            'created_by_admin_id' => $admin?->id,
        ]);

        CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => strtoupper(trim($validated['code'])),
            'description' => $validated['description'] ?? "Promo {$validated['code']}",
            'offer_type' => $validated['offer_type'],
            'discount_amount_minor' => isset($validated['discount_amount_inr']) ? (int) ($validated['discount_amount_inr'] * 100) : 0,
            'discount_percentage' => (float) ($validated['discount_percentage'] ?? 0),
            'max_discount_amount_minor' => isset($validated['max_discount_inr']) ? (int) ($validated['max_discount_inr'] * 100) : null,
            'bonus_points' => (int) ($validated['bonus_points'] ?? 0),
            'funding_source' => $validated['funding_source'],
            'property_funding_percentage' => (float) ($validated['property_funding_percentage'] ?? 0),
            'min_booking_amount_minor' => isset($validated['min_booking_amount_inr']) ? (int) ($validated['min_booking_amount_inr'] * 100) : 0,
            'min_stay_days' => (int) ($validated['min_stay_days'] ?? 1),
            'first_booking_only' => (bool) ($validated['first_booking_only'] ?? false),
            'total_usage_limit' => isset($validated['total_usage_limit']) ? (int) $validated['total_usage_limit'] : null,
            'per_user_limit' => (int) ($validated['per_user_limit'] ?? 1),
            'applies_to_category_ids' => $validated['category_ids'] ?? null,
            'applies_to_city_ids' => $validated['city_ids'] ?? null,
            'applies_to_property_ids' => $validated['property_ids'] ?? null,
            'is_active' => true,
        ]);

        return redirect()->route('admin.rewards.campaigns.index')
            ->with('status', "Promotional campaign '{$campaign->name}' created successfully!");
    }

    public function show(PromotionalCampaign $campaign): Response
    {
        $campaign->load(['couponCodes', 'createdByAdmin']);

        $redemptions = CouponRedemption::query()
            ->with(['couponCode', 'user', 'reservation'])
            ->whereHas('couponCode', fn ($q) => $q->where('campaign_id', $campaign->id))
            ->latest('id')
            ->paginate(20);

        $statsRow = CouponRedemption::query()
            ->leftJoin('reservations', 'reservations.id', '=', 'coupon_redemptions.reservation_id')
            ->whereHas('couponCode', fn ($q) => $q->where('campaign_id', $campaign->id))
            ->where('coupon_redemptions.is_reverted', false)
            ->selectRaw(
                'COUNT(*) as total_redemptions, '.
                'COALESCE(SUM(coupon_redemptions.discount_amount_minor), 0) as total_discount_minor, '.
                'COALESCE(SUM(coupon_redemptions.platform_funded_amount_minor), 0) as platform_funded_minor, '.
                'COALESCE(SUM(coupon_redemptions.property_funded_amount_minor), 0) as property_funded_minor, '.
                'COALESCE(SUM(COALESCE(reservations.original_amount_minor, reservations.total_amount_minor, 0)), 0) as total_gmv_minor'
            )
            ->first();

        return Inertia::render('admin/rewards/campaigns/show', [
            'campaign' => [
                'id' => $campaign->id,
                'reference' => $campaign->campaign_reference,
                'name' => $campaign->name,
                'description' => $campaign->description,
                'type' => $campaign->type->label(),
                'status' => $campaign->status->value,
                'status_label' => $campaign->status->label(),
                'starts_at' => $campaign->starts_at?->format('d M Y'),
                'ends_at' => $campaign->ends_at?->format('d M Y'),
                'budget_minor' => $campaign->budget_minor,
                'spent_minor' => $campaign->spent_minor,
                'created_by' => $campaign->createdByAdmin !== null ? $campaign->createdByAdmin->name : 'System Admin',
                'coupons' => $campaign->couponCodes->map(fn (CouponCode $c) => [
                    'id' => $c->id,
                    'code' => $c->code,
                    'offer_type' => $c->offer_type->label(),
                    'discount_amount_minor' => $c->discount_amount_minor,
                    'discount_percentage' => $c->discount_percentage,
                    'max_discount_amount_minor' => $c->max_discount_amount_minor,
                    'min_booking_amount_minor' => $c->min_booking_amount_minor,
                    'min_stay_days' => $c->min_stay_days,
                    'bonus_points' => $c->bonus_points,
                    'funding_source' => $c->funding_source->value,
                    'funding_source_label' => $c->funding_source->label(),
                    'total_used_count' => $c->total_used_count,
                    'total_usage_limit' => $c->total_usage_limit,
                    'is_active' => $c->is_active,
                ])->all(),
            ],
            'stats' => [
                'total_redemptions' => (int) ($statsRow->total_redemptions ?? 0),
                'total_discount_minor' => (int) ($statsRow->total_discount_minor ?? 0),
                'platform_funded_minor' => (int) ($statsRow->platform_funded_minor ?? 0),
                'property_funded_minor' => (int) ($statsRow->property_funded_minor ?? 0),
                'total_gmv_minor' => (int) ($statsRow->total_gmv_minor ?? 0),
            ],
            'redemptions' => [
                'data' => collect($redemptions->items())->map(fn (CouponRedemption $r) => [
                    'id' => $r->id,
                    'coupon_code' => $r->couponCode !== null ? $r->couponCode->code : 'N/A',
                    'customer_name' => $r->user !== null ? $r->user->name : 'Guest',
                    'booking_reference' => $r->reservation !== null ? $r->reservation->booking_reference : 'N/A',
                    'booking_amount_minor' => $r->reservation !== null
                        ? (int) ($r->reservation->original_amount_minor ?? $r->reservation->total_amount_minor)
                        : 0,
                    'discount_minor' => $r->discount_amount_minor,
                    'platform_share_minor' => $r->platform_funded_amount_minor,
                    'property_share_minor' => $r->property_funded_amount_minor,
                    'redeemed_at' => $r->redeemed_at?->format('d M Y, h:i A'),
                ])->all(),
                'current_page' => $redemptions->currentPage(),
                'last_page' => $redemptions->lastPage(),
                'total' => $redemptions->total(),
            ],
        ]);
    }

    public function toggleStatus(Request $request, PromotionalCampaign $campaign): RedirectResponse
    {
        $status = $request->input('status');
        if (in_array($status, [CampaignStatus::Active->value, CampaignStatus::Paused->value, CampaignStatus::Archived->value], true)) {
            $campaign->update(['status' => $status]);
        }

        return back()->with('status', 'Campaign status updated.');
    }
}
