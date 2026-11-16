<?php

use App\Http\Controllers\Auth\CustomerPasswordResetLinkController;
use App\Http\Controllers\Customer\CustomerPaymentController;
use App\Http\Controllers\Customer\CustomerProtectionCaseController;
use App\Http\Controllers\Customer\CustomerRelocationController;
use App\Http\Controllers\Customer\CustomerReviewController;
use App\Http\Controllers\Customer\CustomerSupportTicketController;
use App\Http\Controllers\Customer\DashboardController;
use App\Http\Controllers\Customer\NotificationController;
use App\Http\Controllers\Customer\ReservationCancellationController;
use App\Http\Controllers\Customer\ReservationController;
use App\Http\Controllers\Customer\RewardsController;
use App\Http\Controllers\Customer\WishlistController;
use App\Http\Controllers\Dev\DesignSystemController;
use App\Http\Controllers\Public\BlogController;
use App\Http\Controllers\Public\CategoryRedirectController;
use App\Http\Controllers\Public\CityLandingPageController;
use App\Http\Controllers\Public\CmsPageController;
use App\Http\Controllers\Public\MarketingTrackingController;
use App\Http\Controllers\Public\NewsletterSubscriptionController;
use App\Http\Controllers\Public\PropertyDetailController;
use App\Http\Controllers\Public\PropertySearchController;
use App\Http\Controllers\Public\PublicPageController;
use App\Http\Controllers\Public\ReferralRedirectController;
use App\Http\Controllers\Public\ReviewPolicyController;
use App\Http\Controllers\Shared\ReviewReportController;
use App\Http\Controllers\Webhooks\RazorpayWebhookController;
use App\Http\Controllers\Webhooks\SmsWebhookController;
use App\Http\Controllers\Webhooks\WhatsAppWebhookController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PublicPageController::class, 'home'])->name('home');
Route::get('/search', PropertySearchController::class)->name('public.search');
Route::get('/explore', PropertySearchController::class)->name('public.explore');
Route::get('/stays/{citySlug}/{property:slug}', PropertyDetailController::class)->name('public.properties.seo');
Route::get('/properties/{property:slug}', PropertyDetailController::class)->name('public.properties.show');
Route::get('/properties/{property:slug}/reserve', [ReservationController::class, 'create'])->name('reservations.create');
Route::get('/how-it-works', [PublicPageController::class, 'howItWorks'])->name('public.how-it-works');
Route::get('/about', [PublicPageController::class, 'about'])->name('public.about');
Route::get('/become-a-partner', [PublicPageController::class, 'becomeAPartner'])->name('public.become-a-partner');
Route::get('/faqs', [PublicPageController::class, 'faqs'])->name('public.faqs');
Route::get('/terms', [PublicPageController::class, 'terms'])->name('public.terms');
Route::get('/privacy', [PublicPageController::class, 'privacy'])->name('public.privacy');
Route::get('/grievance-redressal', [PublicPageController::class, 'grievanceRedressal'])->name('public.grievance-redressal');
Route::get('/sitemap.xml', [PublicPageController::class, 'sitemap'])->name('public.sitemap');
Route::get('/robots.txt', [PublicPageController::class, 'robots'])->name('public.robots');
Route::get('/review-policy', [ReviewPolicyController::class, 'show'])->name('review-policy');

// Module C: Blog & Content Hub
Route::get('/blog', [BlogController::class, 'index'])->name('public.blog.index');
Route::get('/blog/category/{category:slug}', [BlogController::class, 'category'])->name('public.blog.category');
Route::get('/blog/{article:slug}', [BlogController::class, 'show'])->name('public.blog.show');

// Module D: SEO City Landing Pages & Canonical Category Routes
Route::get('/stays-in-{citySlug}', [CityLandingPageController::class, 'show'])->name('public.cities.stays');
Route::get('/cities/{citySlug}', [CityLandingPageController::class, 'show'])->name('public.cities.landing');
Route::get('/hostels-in-{citySlug}', [CityLandingPageController::class, 'show'])->name('public.cities.show');
Route::get('/{category}-in-{citySlug}', [CategoryRedirectController::class, 'handleCity'])
    ->where('category', 'pgs|homestays|coliving|co-living|hostels-pg|hotels|lodges|guest-houses');

// Canonical Category Direct Routes & Legacy Redirects
Route::get('/api/referrals/validate', [ReferralRedirectController::class, 'validateCode'])->name('api.referrals.validate');
Route::get('/r/{code}', [ReferralRedirectController::class, 'handle'])->name('public.referral');
Route::get('/hostels', fn () => redirect()->route('public.search', ['category' => 'hostels-pg'], 301));
Route::get('/pg', fn () => redirect()->route('public.search', ['category' => 'hostels-pg'], 301));
Route::get('/pgs', fn () => redirect()->route('public.search', ['category' => 'hostels-pg'], 301));
Route::get('/homestays', fn () => redirect()->route('public.search', ['category' => 'homestays'], 301));
Route::get('/co-living', fn () => redirect()->route('public.search', ['category' => 'co-living'], 301));
Route::get('/coliving', fn () => redirect()->route('public.search', ['category' => 'co-living'], 301));
Route::get('/categories/{slug}', [CategoryRedirectController::class, 'handleCategory'])->name('public.categories.show');
Route::get('/category/{slug}', [CategoryRedirectController::class, 'handleCategory']);

// Customer Password Reset Link (supports Email or Phone)
Route::post('/forgot-password', [CustomerPasswordResetLinkController::class, 'store'])
    ->middleware(['guest:web', 'throttle:6,1'])
    ->name('password.email');

// Module B: CMS Dynamic Pages
Route::get('/p/{slug}', [CmsPageController::class, 'show'])->name('public.content.show');

// Module H: Newsletter & Unsubscribe
Route::post('/newsletter/subscribe', [NewsletterSubscriptionController::class, 'subscribe'])
    ->middleware('throttle:10,1')
    ->name('public.newsletter.subscribe');
Route::match(['get', 'post'], '/unsubscribe/{token}', [NewsletterSubscriptionController::class, 'unsubscribe'])->name('public.newsletter.unsubscribe');

// Module I: First-Party Marketing Analytics
Route::post('/api/marketing/track', [MarketingTrackingController::class, 'track'])
    ->middleware('throttle:60,1')
    ->name('api.marketing.track');

Route::get('_dev/design-system', DesignSystemController::class)
    ->name('dev.design-system');

Route::post('webhooks/razorpay', RazorpayWebhookController::class)
    ->name('webhooks.razorpay');

Route::get('webhooks/whatsapp', [WhatsAppWebhookController::class, 'verify'])
    ->name('webhooks.whatsapp.verify');
Route::post('webhooks/whatsapp', [WhatsAppWebhookController::class, 'handle'])
    ->name('webhooks.whatsapp.handle');
Route::post('webhooks/sms', SmsWebhookController::class)
    ->name('webhooks.sms');

Route::middleware(['auth:web', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('reservations', [ReservationController::class, 'index'])->name('reservations.index');
    Route::post('reservations', [ReservationController::class, 'store'])->name('reservations.store');
    Route::get('reservations/{reservation}', [ReservationController::class, 'show'])->name('reservations.show');
    Route::post('reservations/{reservation}/cancel', [ReservationCancellationController::class, 'store'])->name('reservations.cancel');
    Route::post('reservations/{reservation}/pay', [CustomerPaymentController::class, 'initiate'])->name('reservations.pay');
    Route::post('reservations/{reservation}/verify-payment', [CustomerPaymentController::class, 'verify'])->name('reservations.verify-payment');
    Route::get('reservations/{reservation}/receipt', [CustomerPaymentController::class, 'receipt'])->name('reservations.receipt');

    Route::post('reservations/{reservation}/report-problem', [CustomerProtectionCaseController::class, 'store'])->name('reservations.report-problem');
    Route::get('my-support', [CustomerProtectionCaseController::class, 'index'])->name('support.cases.index');
    Route::get('my-support/{case:case_reference}', [CustomerProtectionCaseController::class, 'show'])->name('support.cases.show');
    Route::post('my-support/{case:case_reference}/messages', [CustomerProtectionCaseController::class, 'storeMessage'])->name('support.cases.messages.store');
    Route::get('my-support/{case:case_reference}/acknowledgement', [CustomerProtectionCaseController::class, 'acknowledgement'])->name('support.cases.acknowledgement');
    Route::post('relocations/{relocation}/decision', [CustomerRelocationController::class, 'decision'])->name('relocations.decision');

    // Customer Support Tickets
    Route::prefix('support/tickets')->name('support.tickets.')->group(function (): void {
        Route::get('/', [CustomerSupportTicketController::class, 'index'])->name('index');
        Route::post('/', [CustomerSupportTicketController::class, 'store'])->name('store');
        Route::get('{ticket:ticket_reference}', [CustomerSupportTicketController::class, 'show'])->name('show');
        Route::post('{ticket:ticket_reference}/messages', [CustomerSupportTicketController::class, 'storeMessage'])->name('messages.store');
        Route::post('{ticket:ticket_reference}/close', [CustomerSupportTicketController::class, 'close'])->name('close');
    });

    Route::get('reservations/{reservation}/review', [CustomerReviewController::class, 'create'])->name('reservations.review.create');
    Route::post('reservations/{reservation}/review', [CustomerReviewController::class, 'store'])->name('reservations.review.store');
    Route::get('reviews/{review}/edit', [CustomerReviewController::class, 'edit'])->name('reviews.edit');
    Route::put('reviews/{review}', [CustomerReviewController::class, 'update'])->name('reviews.update');
    Route::post('reviews/{review}/report', [ReviewReportController::class, 'store'])->name('reviews.report');

    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
    Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');

    // Customer Wishlist
    Route::get('wishlist', [WishlistController::class, 'index'])->name('customer.wishlist.index');
    Route::post('wishlist/{property}/toggle', [WishlistController::class, 'toggle'])->name('customer.wishlist.toggle');
    Route::post('wishlist/{property}', [WishlistController::class, 'store'])->name('customer.wishlist.store');
    Route::delete('wishlist/{property}', [WishlistController::class, 'destroy'])->name('customer.wishlist.destroy');
    Route::get('customer/wishlist', [WishlistController::class, 'index']);
    Route::post('customer/wishlist/{property}/toggle', [WishlistController::class, 'toggle']);

    // Customer Rewards & Loyalty Ecosystem
    Route::get('rewards', [RewardsController::class, 'index'])->name('customer.rewards.index');
    Route::get('rewards/points', [RewardsController::class, 'points'])->name('customer.rewards.points');
    Route::get('rewards/referrals', [RewardsController::class, 'referrals'])->name('customer.rewards.referrals');
    Route::get('rewards/coupons', [RewardsController::class, 'coupons'])->name('customer.rewards.coupons');
    Route::get('customer/rewards', [RewardsController::class, 'index']);
    Route::get('customer/rewards/points', [RewardsController::class, 'points']);
    Route::get('customer/rewards/referrals', [RewardsController::class, 'referrals']);
    Route::get('customer/rewards/coupons', [RewardsController::class, 'coupons']);
});

require __DIR__.'/settings.php';
