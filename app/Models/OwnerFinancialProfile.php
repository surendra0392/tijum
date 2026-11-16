<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OwnerFinancialProfile extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'owner_id',
        'legal_business_name',
        'business_constitution',
        'pan_number',
        'pan_verified_at',
        'gst_registered',
        'gstin',
        'supplier_legal_classification',
        'razorpay_account_id',
        'linked_account_status',
        'bank_beneficiary_name',
        'bank_account_number_masked',
        'bank_ifsc',
        'bank_name',
        'beneficiary_verified_at',
        'onboarding_status',
        'verified_by_admin_id',
        'verified_at',
        'rejection_reason',
    ];

    /**
     * @return array{
     *     pan_verified_at: 'datetime',
     *     gst_registered: 'boolean',
     *     beneficiary_verified_at: 'datetime',
     *     verified_at: 'datetime',
     *     onboarding_status: 'App\\Enums\\FinancialOnboardingStatus',
     *     linked_account_status: 'App\\Enums\\LinkedAccountStatus',
     * }
     */
    protected function casts(): array
    {
        return [
            'pan_verified_at' => 'datetime',
            'gst_registered' => 'boolean',
            'beneficiary_verified_at' => 'datetime',
            'verified_at' => 'datetime',
            'onboarding_status' => FinancialOnboardingStatus::class,
            'linked_account_status' => LinkedAccountStatus::class,
        ];
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function verifiedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'verified_by_admin_id');
    }

    /**
     * @return HasMany<PartnerSettlement, $this>
     */
    public function settlements(): HasMany
    {
        return $this->hasMany(PartnerSettlement::class);
    }

    public function isSettlementEligible(): bool
    {
        return $this->onboarding_status === FinancialOnboardingStatus::Active
            && $this->linked_account_status === LinkedAccountStatus::Active
            && ! blank($this->razorpay_account_id);
    }

    public function isVerified(): bool
    {
        return $this->onboarding_status === FinancialOnboardingStatus::Active
            && $this->verified_at !== null;
    }
}
