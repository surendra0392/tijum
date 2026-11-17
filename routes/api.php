<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Auth\CustomerAuthController;
use App\Http\Controllers\Api\V1\Auth\OwnerAuthController;
use App\Http\Controllers\Api\V1\Customer\CustomerDeviceController;
use App\Http\Controllers\Api\V1\Customer\CustomerNotificationController;
use App\Http\Controllers\Api\V1\Customer\CustomerPaymentController;
use App\Http\Controllers\Api\V1\Customer\CustomerProfileController;
use App\Http\Controllers\Api\V1\Customer\CustomerProtectionController;
use App\Http\Controllers\Api\V1\Customer\CustomerReservationController;
use App\Http\Controllers\Api\V1\Customer\CustomerReviewController;
use App\Http\Controllers\Api\V1\Customer\CustomerRewardsController;
use App\Http\Controllers\Api\V1\Customer\CustomerWishlistController;
use App\Http\Controllers\Api\V1\Owner\OwnerDashboardController;
use App\Http\Controllers\Api\V1\Owner\OwnerDeviceController;
use App\Http\Controllers\Api\V1\Owner\OwnerFinancialController;
use App\Http\Controllers\Api\V1\Owner\OwnerNotificationController;
use App\Http\Controllers\Api\V1\Owner\OwnerPropertyController;
use App\Http\Controllers\Api\V1\Owner\OwnerReservationController;
use App\Http\Controllers\Api\V1\Public\PublicCategoryController;
use App\Http\Controllers\Api\V1\Public\PublicCityController;
use App\Http\Controllers\Api\V1\Public\PublicConfigController;
use App\Http\Controllers\Api\V1\Public\PublicContentController;
use App\Http\Controllers\Api\V1\Public\PublicGeocodeController;
use App\Http\Controllers\Api\V1\Public\PublicGuestContactValidationController;
use App\Http\Controllers\Api\V1\Public\PublicLocationController;
use App\Http\Controllers\Api\V1\Public\PublicPropertyController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    // 1. Public Marketplace Endpoints (Search & Catalog Rate-Limited to 120/min)
    Route::prefix('public')->middleware('throttle:api-search')->group(function (): void {
        Route::get('config', PublicConfigController::class)->name('api.v1.public.config');
        Route::get('categories', [PublicCategoryController::class, 'index'])->name('api.v1.public.categories.index');
        Route::get('cities', [PublicCityController::class, 'index'])->name('api.v1.public.cities.index');
        Route::get('cities/{slug}', [PublicCityController::class, 'show'])->name('api.v1.public.cities.show');
        Route::get('properties', [PublicPropertyController::class, 'index'])->name('api.v1.public.properties.index');
        Route::get('properties/{slug}', [PublicPropertyController::class, 'show'])->name('api.v1.public.properties.show');
        Route::get('properties/{slug}/reviews', [PublicPropertyController::class, 'reviews'])->name('api.v1.public.properties.reviews');
        Route::post('properties/{property}/quote', [PublicPropertyController::class, 'quote'])->name('api.v1.public.properties.quote');
        Route::get('geocode/reverse', [PublicGeocodeController::class, 'reverse'])
            ->middleware('throttle:30,1')
            ->name('api.v1.public.geocode.reverse');
        Route::match(['get', 'post'], 'validate-contact', PublicGuestContactValidationController::class)
            ->middleware('throttle:30,1')
            ->name('api.v1.public.validate-contact');
        Route::get('locations/autocomplete', PublicLocationController::class)
            ->middleware('throttle:30,1')
            ->name('api.v1.public.locations.autocomplete');

        // CMS Content
        Route::get('pages/{slug}', [PublicContentController::class, 'page'])->name('api.v1.public.pages.show');
        Route::get('blog', [PublicContentController::class, 'blogIndex'])->name('api.v1.public.blog.index');
        Route::get('blog/{slug}', [PublicContentController::class, 'blogShow'])->name('api.v1.public.blog.show');
        Route::get('faqs', [PublicContentController::class, 'faqs'])->name('api.v1.public.faqs');
        Route::get('banners', [PublicContentController::class, 'banners'])->name('api.v1.public.banners');
    });

    // 2. Authentication: Separate Customer & Owner flows
    Route::prefix('auth/customer')->group(function (): void {
        Route::post('register', [CustomerAuthController::class, 'register'])->middleware('throttle:api-auth')->name('api.v1.auth.customer.register');
        Route::post('login', [CustomerAuthController::class, 'login'])->middleware('throttle:api-auth')->name('api.v1.auth.customer.login');

        Route::middleware(['auth:sanctum', 'auth.customer'])->group(function (): void {
            Route::post('logout', [CustomerAuthController::class, 'logout'])->name('api.v1.auth.customer.logout');
            Route::post('revoke-all', [CustomerAuthController::class, 'revokeAll'])->name('api.v1.auth.customer.revoke-all');
            Route::get('tokens', [CustomerAuthController::class, 'tokens'])->name('api.v1.auth.customer.tokens');
            Route::delete('tokens/{tokenId}', [CustomerAuthController::class, 'deleteToken'])->name('api.v1.auth.customer.tokens.delete');
        });
    });

    Route::prefix('auth/owner')->group(function (): void {
        Route::post('register', [OwnerAuthController::class, 'register'])->middleware('throttle:api-auth')->name('api.v1.auth.owner.register');
        Route::post('login', [OwnerAuthController::class, 'login'])->middleware('throttle:api-auth')->name('api.v1.auth.owner.login');

        Route::middleware(['auth:sanctum', 'auth.owner'])->group(function (): void {
            Route::post('logout', [OwnerAuthController::class, 'logout'])->name('api.v1.auth.owner.logout');
            Route::post('revoke-all', [OwnerAuthController::class, 'revokeAll'])->name('api.v1.auth.owner.revoke-all');
            Route::get('tokens', [OwnerAuthController::class, 'tokens'])->name('api.v1.auth.owner.tokens');
            Route::delete('tokens/{tokenId}', [OwnerAuthController::class, 'deleteToken'])->name('api.v1.auth.owner.tokens.delete');
        });
    });

    // 3. Customer Authenticated Operations
    Route::prefix('customer')->middleware(['auth:sanctum', 'auth.customer'])->group(function (): void {
        // Profile
        Route::get('profile', [CustomerProfileController::class, 'show'])->name('api.v1.customer.profile.show');
        Route::put('profile', [CustomerProfileController::class, 'update'])->name('api.v1.customer.profile.update');
        Route::put('password', [CustomerProfileController::class, 'updatePassword'])->name('api.v1.customer.password.update');

        // Reservations
        Route::get('reservations', [CustomerReservationController::class, 'index'])->name('api.v1.customer.reservations.index');
        Route::post('reservations/quote/{property}', [CustomerReservationController::class, 'quote'])->name('api.v1.customer.reservations.quote');
        Route::post('reservations', [CustomerReservationController::class, 'store'])->name('api.v1.customer.reservations.store');
        Route::get('reservations/{reference}', [CustomerReservationController::class, 'show'])->name('api.v1.customer.reservations.show');
        Route::post('reservations/{reference}/cancel', [CustomerReservationController::class, 'cancel'])->name('api.v1.customer.reservations.cancel');

        // Payments (Authoritative backend verification)
        Route::post('reservations/{reference}/payment/initiate', [CustomerPaymentController::class, 'initiate'])->name('api.v1.customer.payment.initiate');
        Route::post('reservations/{reference}/payment/verify', [CustomerPaymentController::class, 'verify'])->name('api.v1.customer.payment.verify');
        Route::get('reservations/{reference}/payment/status', [CustomerPaymentController::class, 'status'])->name('api.v1.customer.payment.status');

        // Reviews
        Route::get('reviews', [CustomerReviewController::class, 'index'])->name('api.v1.customer.reviews.index');
        Route::get('reviews/eligible', [CustomerReviewController::class, 'eligible'])->name('api.v1.customer.reviews.eligible');
        Route::post('reviews/{reference}', [CustomerReviewController::class, 'store'])->name('api.v1.customer.reviews.store');

        // Customer Protection Cases
        Route::get('cases', [CustomerProtectionController::class, 'index'])->name('api.v1.customer.cases.index');
        Route::post('cases', [CustomerProtectionController::class, 'store'])->name('api.v1.customer.cases.store');
        Route::get('cases/{reference}', [CustomerProtectionController::class, 'show'])->name('api.v1.customer.cases.show');

        // In-App Notifications
        Route::get('notifications', [CustomerNotificationController::class, 'index'])->name('api.v1.customer.notifications.index');
        Route::get('notifications/unread-count', [CustomerNotificationController::class, 'unreadCount'])->name('api.v1.customer.notifications.unread-count');
        Route::post('notifications/{id}/read', [CustomerNotificationController::class, 'markRead'])->name('api.v1.customer.notifications.read');
        Route::post('notifications/mark-all-read', [CustomerNotificationController::class, 'markAllRead'])->name('api.v1.customer.notifications.mark-all-read');

        // Push Device Registration
        Route::post('devices/register', [CustomerDeviceController::class, 'register'])->name('api.v1.customer.devices.register');
        Route::delete('devices/unregister', [CustomerDeviceController::class, 'unregister'])->name('api.v1.customer.devices.unregister');

        // Wishlist
        Route::get('wishlist', [CustomerWishlistController::class, 'index'])->name('api.v1.customer.wishlist.index');
        Route::post('wishlist/{property}', [CustomerWishlistController::class, 'store'])->name('api.v1.customer.wishlist.store');
        Route::post('wishlist/{property}/toggle', [CustomerWishlistController::class, 'toggle'])->name('api.v1.customer.wishlist.toggle');
        Route::delete('wishlist/{property}', [CustomerWishlistController::class, 'destroy'])->name('api.v1.customer.wishlist.destroy');

        // Rewards & Loyalty Ecosystem
        Route::get('rewards/overview', [CustomerRewardsController::class, 'overview'])->name('api.v1.customer.rewards.overview');
        Route::get('rewards/points', [CustomerRewardsController::class, 'points'])->name('api.v1.customer.rewards.points');
        Route::get('rewards/points/ledger', [CustomerRewardsController::class, 'ledger'])->name('api.v1.customer.rewards.points.ledger');
        Route::get('rewards/referrals', [CustomerRewardsController::class, 'referrals'])->name('api.v1.customer.rewards.referrals');
        Route::get('rewards/coupons', [CustomerRewardsController::class, 'coupons'])->name('api.v1.customer.rewards.coupons');
        Route::get('coupons', [CustomerRewardsController::class, 'coupons'])->name('api.v1.customer.coupons.index');
        Route::post('coupons/validate', [CustomerRewardsController::class, 'validateCoupon'])->name('api.v1.customer.coupons.validate');
        Route::post('rewards/quote', [CustomerRewardsController::class, 'quotePromotions'])->name('api.v1.customer.rewards.quote');
    });

    Route::post('checkout/quote-promotions', [CustomerRewardsController::class, 'quotePromotions'])->middleware(['auth:sanctum', 'auth.customer'])->name('api.v1.checkout.quote-promotions');

    // 4. Owner / Partner Authenticated Operations
    Route::prefix('owner')->middleware(['auth:sanctum', 'auth.owner'])->group(function (): void {
        // Dashboard
        Route::get('dashboard', OwnerDashboardController::class)->name('api.v1.owner.dashboard');

        // Properties
        Route::get('properties', [OwnerPropertyController::class, 'index'])->name('api.v1.owner.properties.index');
        Route::get('properties/{id}', [OwnerPropertyController::class, 'show'])->name('api.v1.owner.properties.show');

        // Reservations
        Route::get('reservations', [OwnerReservationController::class, 'index'])->name('api.v1.owner.reservations.index');
        Route::get('reservations/{reference}', [OwnerReservationController::class, 'show'])->name('api.v1.owner.reservations.show');

        // Financial & Settlement statements (read-only)
        Route::get('financial/summary', [OwnerFinancialController::class, 'summary'])->name('api.v1.owner.financial.summary');
        Route::get('financial/settlements', [OwnerFinancialController::class, 'settlements'])->name('api.v1.owner.financial.settlements');

        // In-App Notifications
        Route::get('notifications', [OwnerNotificationController::class, 'index'])->name('api.v1.owner.notifications.index');
        Route::get('notifications/unread-count', [OwnerNotificationController::class, 'unreadCount'])->name('api.v1.owner.notifications.unread-count');
        Route::post('notifications/{id}/read', [OwnerNotificationController::class, 'markRead'])->name('api.v1.owner.notifications.read');
        Route::post('notifications/mark-all-read', [OwnerNotificationController::class, 'markAllRead'])->name('api.v1.owner.notifications.mark-all-read');

        // Push Device Registration
        Route::post('devices/register', [OwnerDeviceController::class, 'register'])->name('api.v1.owner.devices.register');
        Route::delete('devices/unregister', [OwnerDeviceController::class, 'unregister'])->name('api.v1.owner.devices.unregister');
    });
});
