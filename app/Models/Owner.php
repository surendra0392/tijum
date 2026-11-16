<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OwnerStatus;
use App\Notifications\Owner\ResetPasswordNotification;
use App\Notifications\Owner\VerifyEmailNotification;
use Database\Factories\OwnerFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Owner extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<OwnerFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
    ];

    /**
     * The model's default attribute values.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => OwnerStatus::PendingVerification->value,
        'email_verified_at' => null,
        'approved_at' => null,
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array{
     *     email_verified_at: 'datetime',
     *     password: 'hashed',
     *     status: 'App\\Enums\\OwnerStatus',
     *     approved_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => OwnerStatus::class,
            'approved_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function approvedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'approved_by_admin_id');
    }

    /**
     * @return HasOne<OwnerBusinessProfile, $this>
     */
    public function businessProfile(): HasOne
    {
        return $this->hasOne(OwnerBusinessProfile::class);
    }

    /**
     * @return BelongsToMany<City, $this, Pivot>
     */
    public function operatingCities(): BelongsToMany
    {
        return $this->belongsToMany(City::class, 'owner_operating_cities')
            ->withTimestamps()
            ->orderBy('sort_order')
            ->orderBy('name');
    }

    /**
     * @return HasMany<OwnerVerificationApplication, $this>
     */
    public function verificationApplications(): HasMany
    {
        return $this->hasMany(OwnerVerificationApplication::class)
            ->orderByDesc('id');
    }

    /**
     * @return HasOne<OwnerVerificationApplication, $this>
     */
    public function activeVerificationApplication(): HasOne
    {
        return $this->hasOne(OwnerVerificationApplication::class, 'active_owner_id', 'id');
    }

    /**
     * @return HasOne<OwnerVerificationApplication, $this>
     */
    public function latestVerificationApplication(): HasOne
    {
        return $this->hasOne(OwnerVerificationApplication::class)
            ->latestOfMany('id');
    }

    /**
     * @return HasMany<Property, $this>
     */
    public function properties(): HasMany
    {
        return $this->hasMany(Property::class)
            ->orderByDesc('id');
    }

    /**
     * @return HasManyThrough<Reservation, Property, $this>
     */
    public function reservations(): HasManyThrough
    {
        return $this->hasManyThrough(
            Reservation::class,
            Property::class,
            'owner_id',
            'property_id',
            'id',
            'id',
        )->orderByDesc('reservations.created_at')
            ->orderByDesc('reservations.id');
    }

    /**
     * @return HasOne<OwnerFinancialProfile, $this>
     */
    public function financialProfile(): HasOne
    {
        return $this->hasOne(OwnerFinancialProfile::class);
    }

    /**
     * @return HasMany<PartnerCommissionAgreement, $this>
     */
    public function commissionAgreements(): HasMany
    {
        return $this->hasMany(PartnerCommissionAgreement::class)->orderByDesc('id');
    }

    /**
     * @return HasMany<PartnerSettlement, $this>
     */
    public function settlements(): HasMany
    {
        return $this->hasMany(PartnerSettlement::class)->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyReview, $this>
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(PropertyReview::class)->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyReviewResponse, $this>
     */
    public function reviewResponses(): HasMany
    {
        return $this->hasMany(PropertyReviewResponse::class)->orderByDesc('id');
    }

    public function canSignIn(): bool
    {
        return $this->status->canSignIn();
    }

    public function canPublishProperties(): bool
    {
        return $this->status->canPublishProperties() && $this->hasVerifiedEmail();
    }

    /**
     * Mark the owner's email address as verified and advance initial onboarding status.
     */
    public function markEmailAsVerified(): bool
    {
        $attributes = [
            'email_verified_at' => $this->freshTimestamp(),
        ];

        if ($this->status === OwnerStatus::PendingVerification) {
            $attributes['status'] = OwnerStatus::PendingReview;
        }

        return $this->forceFill($attributes)->save();
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * Project safe owner attributes for Inertia shared props.
     *
     * @return array{
     *     id: int,
     *     name: string,
     *     email: string,
     *     phone: string|null,
     *     status: string,
     *     status_label: string,
     *     email_verified_at: string|null,
     *     approved_at: string|null,
     *     can_publish_properties: bool,
     *     created_at: string|null,
     *     updated_at: string|null,
     * }
     */
    public function toPortalArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'approved_at' => $this->approved_at?->toISOString(),
            'can_publish_properties' => $this->canPublishProperties(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * @return MorphMany<NotificationPreference, $this>
     */
    public function notificationPreferences(): MorphMany
    {
        return $this->morphMany(NotificationPreference::class, 'notifiable');
    }

    /**
     * @return MorphMany<NotificationConsentRecord, $this>
     */
    public function notificationConsentRecords(): MorphMany
    {
        return $this->morphMany(NotificationConsentRecord::class, 'notifiable');
    }

    /**
     * @return MorphMany<NotificationDelivery, $this>
     */
    public function notificationDeliveries(): MorphMany
    {
        return $this->morphMany(NotificationDelivery::class, 'notifiable');
    }

    /**
     * @return HasOne<MarketingSubscriber, $this>
     */
    public function marketingSubscriber(): HasOne
    {
        return $this->hasOne(MarketingSubscriber::class, 'email', 'email');
    }
}
