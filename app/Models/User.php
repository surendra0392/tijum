<?php

declare(strict_types=1);

namespace App\Models;

use App\Notifications\Customer\ResetPasswordNotification;
use App\Notifications\Customer\VerifyEmailNotification;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string|null $phone
 * @property Carbon|null $phone_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'phone', 'password', 'terms_accepted_at', 'referred_by_user_id'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'phone', 'phone_verified_at'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'terms_accepted_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * Minimal authenticated customer fields safe for global shared navigation.
     *
     * @return array{
     *     id: int,
     *     name: string,
     *     email: string,
     *     phone: string|null,
     *     email_verified_at: string|null,
     *     two_factor_enabled: bool,
     * }
     */
    public function toSharedAuthArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'two_factor_enabled' => $this->hasEnabledTwoFactorAuthentication(),
            'referral_code' => $this->referralProfile?->referral_code,
        ];
    }

    /**
     * @return HasMany<Reservation, $this>
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class)
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyReview, $this>
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(PropertyReview::class)
            ->orderByDesc('created_at');
    }

    /**
     * Page-scoped customer account projection including authorized personal contact fields.
     *
     * @return array{
     *     id: int,
     *     name: string,
     *     email: string,
     *     phone: string|null,
     *     email_verified_at: string|null,
     *     phone_verified_at: string|null,
     *     two_factor_enabled: bool,
     *     created_at: string|null,
     *     updated_at: string|null,
     * }
     */
    public function toCustomerAccountArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'phone_verified_at' => $this->phone_verified_at?->toISOString(),
            'two_factor_enabled' => $this->hasEnabledTwoFactorAuthentication(),
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

    /**
     * @return HasMany<CustomerWishlist, $this>
     */
    public function wishlists(): HasMany
    {
        return $this->hasMany(CustomerWishlist::class);
    }

    /**
     * @return BelongsToMany<Property, $this>
     */
    public function wishlistedProperties(): BelongsToMany
    {
        return $this->belongsToMany(Property::class, 'customer_wishlists', 'user_id', 'property_id')->withTimestamps();
    }

    /**
     * @return HasOne<CustomerPointsWallet, $this>
     */
    public function pointsWallet(): HasOne
    {
        return $this->hasOne(CustomerPointsWallet::class);
    }

    /**
     * @return HasMany<CustomerPointsLedger, $this>
     */
    public function pointsLedger(): HasMany
    {
        return $this->hasMany(CustomerPointsLedger::class)->orderByDesc('created_at');
    }

    /**
     * @return HasOne<CustomerReferralProfile, $this>
     */
    public function referralProfile(): HasOne
    {
        return $this->hasOne(CustomerReferralProfile::class);
    }

    /**
     * @return HasMany<CustomerReferral, $this>
     */
    public function referralsGiven(): HasMany
    {
        return $this->hasMany(CustomerReferral::class, 'referrer_user_id');
    }

    /**
     * @return HasOne<CustomerReferral, $this>
     */
    public function referralReceived(): HasOne
    {
        return $this->hasOne(CustomerReferral::class, 'referred_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function referredBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'referred_by_user_id');
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }
}
