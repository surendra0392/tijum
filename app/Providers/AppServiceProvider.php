<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\PaymentGateway;
use App\Models\Amenity;
use App\Models\OwnerBusinessProfile;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;
use App\Models\PlatformSetting;
use App\Models\Property;
use App\Models\PropertyAmenity;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyMedia;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyRoomTypeAmenity;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\Reservation;
use App\Policies\AmenityPolicy;
use App\Policies\OwnerBusinessProfilePolicy;
use App\Policies\OwnerVerificationApplicationPolicy;
use App\Policies\OwnerVerificationDocumentPolicy;
use App\Policies\PropertyAmenityPolicy;
use App\Policies\PropertyAvailabilityBlockPolicy;
use App\Policies\PropertyMediaPolicy;
use App\Policies\PropertyPolicy;
use App\Policies\PropertyRoomPolicy;
use App\Policies\PropertyRoomTypeAmenityPolicy;
use App\Policies\PropertyRoomTypePolicy;
use App\Policies\PropertyVerificationApplicationPolicy;
use App\Policies\PropertyVerificationDocumentPolicy;
use App\Policies\ReservationPolicy;
use App\Services\Payments\RazorpayGateway;
use App\Services\Payments\RazorpayRouteService;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(PaymentGateway::class, function (): PaymentGateway {
            $keyId = (string) PlatformSetting::get('integrations.razorpay_key_id') ?: (string) config('tijum.payments.razorpay.key_id', '');
            $keySecret = (string) PlatformSetting::get('integrations.razorpay_key_secret') ?: (string) config('tijum.payments.razorpay.key_secret', '');
            $webhookSecret = (string) PlatformSetting::get('integrations.razorpay_webhook_secret') ?: (string) config('tijum.payments.razorpay.webhook_secret', '');

            return new RazorpayGateway(
                keyId: $keyId,
                keySecret: $keySecret,
                webhookSecret: $webhookSecret,
                liveEnabled: $this->razorpayLiveEnabled(),
            );
        });

        $this->app->singleton(RazorpayRouteService::class, function (): RazorpayRouteService {
            $keyId = (string) PlatformSetting::get('integrations.razorpay_key_id') ?: (string) config('tijum.payments.razorpay.key_id', '');
            $keySecret = (string) PlatformSetting::get('integrations.razorpay_key_secret') ?: (string) config('tijum.payments.razorpay.key_secret', '');

            return new RazorpayRouteService(
                keyId: $keyId,
                keySecret: $keySecret,
                routeEnabled: (bool) config('tijum.settlements.route_enabled', false),
                liveEnabled: $this->razorpayLiveEnabled(),
            );
        });
    }

    private function razorpayLiveEnabled(): bool
    {
        if (! (bool) config('tijum.payments.live_enabled', false)) {
            return false;
        }

        $adminMode = PlatformSetting::get('integrations.razorpay_mode');

        return $adminMode !== null ? $adminMode === 'live' : true;
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureRateLimiting();

        Gate::policy(Amenity::class, AmenityPolicy::class);
        Gate::policy(OwnerBusinessProfile::class, OwnerBusinessProfilePolicy::class);
        Gate::policy(OwnerVerificationApplication::class, OwnerVerificationApplicationPolicy::class);
        Gate::policy(OwnerVerificationDocument::class, OwnerVerificationDocumentPolicy::class);
        Gate::policy(Property::class, PropertyPolicy::class);
        Gate::policy(PropertyAmenity::class, PropertyAmenityPolicy::class);
        Gate::policy(PropertyAvailabilityBlock::class, PropertyAvailabilityBlockPolicy::class);
        Gate::policy(PropertyRoomType::class, PropertyRoomTypePolicy::class);
        Gate::policy(PropertyRoomTypeAmenity::class, PropertyRoomTypeAmenityPolicy::class);
        Gate::policy(PropertyRoom::class, PropertyRoomPolicy::class);
        Gate::policy(PropertyMedia::class, PropertyMediaPolicy::class);
        Gate::policy(PropertyVerificationApplication::class, PropertyVerificationApplicationPolicy::class);
        Gate::policy(PropertyVerificationDocument::class, PropertyVerificationDocumentPolicy::class);
        Gate::policy(Reservation::class, ReservationPolicy::class);
    }

    /**
     * Configure API rate limits for public, authenticated and authentication endpoints.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request): Limit {
            $user = $request->user('sanctum');

            if ($user !== null) {
                return Limit::perMinute(120)
                    ->by('api:user:'.$user::class.':'.$user->getAuthIdentifier());
            }

            return Limit::perMinute(60)->by('api:ip:'.$request->ip());
        });

        RateLimiter::for('api-auth', function (Request $request): Limit {
            return Limit::perMinute(10)
                ->by('api-auth:'.Str::lower(trim((string) $request->input('email', ''))).'|'.$request->ip());
        });

        RateLimiter::for('api-search', function (Request $request): Limit {
            return Limit::perMinute(120)->by('api:search:'.$request->ip());
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        // Surface lazy loading, missing attributes and discarded attributes everywhere except production.
        Model::shouldBeStrict(! app()->isProduction());

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
