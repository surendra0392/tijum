<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AdminProfileController;
use App\Http\Controllers\Admin\Amenities\AdminAmenityController;
use App\Http\Controllers\Admin\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Admin\Auth\NewPasswordController;
use App\Http\Controllers\Admin\Auth\PasswordResetLinkController;
use App\Http\Controllers\Admin\Auth\TwoFactorChallengeController;
use App\Http\Controllers\Admin\Content\AdminBlogArticleController;
use App\Http\Controllers\Admin\Content\AdminBlogCategoryController;
use App\Http\Controllers\Admin\Content\AdminContentAuthorController;
use App\Http\Controllers\Admin\Content\AdminContentFaqController;
use App\Http\Controllers\Admin\Content\AdminContentPageController;
use App\Http\Controllers\Admin\Content\AdminMediaController;
use App\Http\Controllers\Admin\CustomerCases\AdminCustomerCaseController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\Financial\AdminCommissionAgreementController;
use App\Http\Controllers\Admin\Financial\AdminFinancialProfileController;
use App\Http\Controllers\Admin\Financial\AdminFinancialReconciliationController;
use App\Http\Controllers\Admin\Financial\AdminRelocationSubsidyController;
use App\Http\Controllers\Admin\Financial\AdminSettlementController;
use App\Http\Controllers\Admin\Marketing\AdminMarketingBannerController;
use App\Http\Controllers\Admin\Marketing\AdminMarketingCampaignController;
use App\Http\Controllers\Admin\Marketing\AdminMarketingDashboardController;
use App\Http\Controllers\Admin\Marketing\AdminMarketingEmailCampaignController;
use App\Http\Controllers\Admin\Marketing\AdminMarketingSubscriberController;
use App\Http\Controllers\Admin\Notifications\AdminNotificationController;
use App\Http\Controllers\Admin\Notifications\AdminNotificationProviderController;
use App\Http\Controllers\Admin\Notifications\AdminNotificationTemplateController;
use App\Http\Controllers\Admin\Operations\AdminCheckInController;
use App\Http\Controllers\Admin\Operations\AdminCheckOutController;
use App\Http\Controllers\Admin\PartnerVerification\PartnerVerificationController;
use App\Http\Controllers\Admin\PartnerVerification\PartnerVerificationDocumentController;
use App\Http\Controllers\Admin\Payments\AdminPaymentController;
use App\Http\Controllers\Admin\Pricing\AdminPricingController;
use App\Http\Controllers\Admin\Properties\AdminPropertyController;
use App\Http\Controllers\Admin\Properties\AdminPropertyDocumentController;
use App\Http\Controllers\Admin\Relocations\AdminRelocationController;
use App\Http\Controllers\Admin\Reports\AdminReportExportController;
use App\Http\Controllers\Admin\Reservations\ReservationController;
use App\Http\Controllers\Admin\Reviews\AdminReviewController;
use App\Http\Controllers\Admin\Reviews\AdminReviewReportController;
use App\Http\Controllers\Admin\Rewards\AdminCampaignController;
use App\Http\Controllers\Admin\Rewards\AdminPointsController;
use App\Http\Controllers\Admin\Rewards\AdminReferralController;
use App\Http\Controllers\Admin\Rewards\AdminRewardsOverviewController;
use App\Http\Controllers\Admin\Search\AdminSearchController;
use App\Http\Controllers\Admin\Security\TwoFactorSetupController;
use App\Http\Controllers\Admin\Seo\AdminSeoOverviewController;
use App\Http\Controllers\Admin\Seo\AdminSeoRedirectController;
use App\Http\Controllers\Admin\Seo\AdminSitemapController;
use App\Http\Controllers\Admin\Support\AdminCustomerSupportController;
use App\Http\Controllers\Admin\Support\AdminPartnerSupportController;
use App\Http\Controllers\Admin\System\AdminAccountController;
use App\Http\Controllers\Admin\System\AdminCategoryController;
use App\Http\Controllers\Admin\System\AdminCityController;
use App\Http\Controllers\Admin\System\AdminPlatformSettingController;
use App\Http\Controllers\Admin\System\AdminRoleController;
use App\Http\Controllers\Notifications\WebPushSubscriptionController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')
    ->name('admin.')
    ->group(function (): void {
        Route::get('/', fn () => redirect()->route('admin.dashboard'));

        Route::middleware('guest:admin')->group(function (): void {
            Route::get('login', [AuthenticatedSessionController::class, 'create'])
                ->name('login');
            Route::post('login', [AuthenticatedSessionController::class, 'store'])
                ->middleware('throttle:admin-login')
                ->name('login.store');

            Route::get('two-factor-challenge', [TwoFactorChallengeController::class, 'create'])
                ->name('two-factor.challenge');
            Route::post('two-factor-challenge', [TwoFactorChallengeController::class, 'store'])
                ->middleware('throttle:admin-two-factor')
                ->name('two-factor.challenge.verify');

            Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
                ->name('password.request');
            Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
                ->middleware('throttle:admin-password-reset')
                ->name('password.email');

            Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
                ->name('password.reset');
            Route::post('reset-password', [NewPasswordController::class, 'store'])
                ->middleware('throttle:admin-password-reset')
                ->name('password.update');
        });

        Route::middleware(['auth:admin', 'admin.active'])->group(function (): void {
            Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
                ->name('logout');

            Route::get('security/two-factor', [TwoFactorSetupController::class, 'show'])
                ->name('two-factor.setup');
            Route::post('security/two-factor', [TwoFactorSetupController::class, 'enable'])
                ->name('two-factor.enable');
            Route::post('security/two-factor/confirm', [TwoFactorSetupController::class, 'confirm'])
                ->middleware('throttle:admin-two-factor')
                ->name('two-factor.confirm');
            Route::post('security/two-factor/recovery-codes', [TwoFactorSetupController::class, 'regenerateRecoveryCodes'])
                ->middleware('throttle:admin-two-factor')
                ->name('two-factor.recovery-codes');
        });

        Route::middleware(['auth:admin', 'admin.active', 'admin.two-factor'])->group(function (): void {
            Route::get('dashboard', DashboardController::class)
                ->name('dashboard');

            Route::get('profile', [AdminProfileController::class, 'edit'])
                ->name('profile.edit');
            Route::patch('profile', [AdminProfileController::class, 'update'])
                ->name('profile.update');
            Route::put('profile/password', [AdminProfileController::class, 'updatePassword'])
                ->name('profile.password.update');

            Route::get('search', AdminSearchController::class)
                ->name('search');

            Route::get('reports/export', [AdminReportExportController::class, 'export'])
                ->name('reports.export');

            Route::middleware('admin.role:super_admin,operations,customer_support')
                ->prefix('reservations')
                ->name('reservations.')
                ->group(function (): void {
                    Route::get('/', [ReservationController::class, 'index'])->name('index');
                    Route::get('{reservation}', [ReservationController::class, 'show'])->name('show');
                });

            Route::middleware('admin.role:super_admin,operations,customer_support')
                ->prefix('payments')
                ->name('payments.')
                ->group(function (): void {
                    Route::get('/', [AdminPaymentController::class, 'index'])->name('index');
                    Route::get('{payment}', [AdminPaymentController::class, 'show'])->name('show');
                    Route::post('{payment}/refunds', [AdminPaymentController::class, 'refund'])->name('refund');
                });

            Route::middleware('admin.role:super_admin,operations,customer_support')
                ->prefix('customer-cases')
                ->name('customer-cases.')
                ->group(function (): void {
                    Route::get('/', [AdminCustomerCaseController::class, 'index'])->name('index');
                    Route::get('{case:case_reference}', [AdminCustomerCaseController::class, 'show'])->name('show');
                    Route::post('{case:case_reference}/messages', [AdminCustomerCaseController::class, 'storeMessage'])->name('messages.store');
                    Route::patch('{case:case_reference}/status', [AdminCustomerCaseController::class, 'updateStatus'])->name('status');
                    Route::post('{case:case_reference}/resolve', [AdminCustomerCaseController::class, 'resolve'])->name('resolve');
                });

            Route::middleware('admin.role:super_admin,operations,customer_support')
                ->prefix('relocations')
                ->name('relocations.')
                ->group(function (): void {
                    Route::get('/', [AdminRelocationController::class, 'index'])->name('index');
                    Route::get('search-alternatives', [AdminRelocationController::class, 'searchAlternatives'])->name('search-alternatives');
                    Route::post('/', [AdminRelocationController::class, 'store'])->name('store');
                    Route::post('{relocation}/cancel', [AdminRelocationController::class, 'cancel'])->name('cancel');
                });

            // Marketplace Operations
            Route::middleware('admin.role:super_admin,operations,customer_support')
                ->prefix('operations')
                ->name('operations.')
                ->group(function (): void {
                    Route::get('check-ins', [AdminCheckInController::class, 'index'])->name('check-ins.index');
                    Route::post('check-ins/{reservation}', [AdminCheckInController::class, 'markCheckIn'])->name('check-ins.mark');
                    Route::post('check-ins/{reservation}/undo', [AdminCheckInController::class, 'undoCheckIn'])->name('check-ins.undo');

                    Route::get('check-outs', [AdminCheckOutController::class, 'index'])->name('check-outs.index');
                    Route::post('check-outs/{reservation}', [AdminCheckOutController::class, 'markCheckOut'])->name('check-outs.mark');
                    Route::post('check-outs/{reservation}/undo', [AdminCheckOutController::class, 'undoCheckOut'])->name('check-outs.undo');
                });

            // Support: Customer Support Desk & Partner Support Desk
            Route::middleware('admin.role:super_admin,operations,customer_support')
                ->prefix('support')
                ->name('support.')
                ->group(function (): void {
                    // Customer Support
                    Route::prefix('customers')->name('customers.')->group(function (): void {
                        Route::get('/', [AdminCustomerSupportController::class, 'index'])->name('index');
                        Route::get('{ticket:ticket_reference}', [AdminCustomerSupportController::class, 'show'])->name('show');
                        Route::post('{ticket:ticket_reference}/messages', [AdminCustomerSupportController::class, 'storeMessage'])->name('messages.store');
                        Route::patch('{ticket:ticket_reference}/status', [AdminCustomerSupportController::class, 'updateStatus'])->name('status');
                        Route::patch('{ticket:ticket_reference}/assign', [AdminCustomerSupportController::class, 'assign'])->name('assign');
                        Route::post('{ticket:ticket_reference}/resolve', [AdminCustomerSupportController::class, 'resolve'])->name('resolve');
                    });

                    // Partner Support
                    Route::prefix('partners')->name('partners.')->group(function (): void {
                        Route::get('/', [AdminPartnerSupportController::class, 'index'])->name('index');
                        Route::get('{ticket:ticket_reference}', [AdminPartnerSupportController::class, 'show'])->name('show');
                        Route::post('{ticket:ticket_reference}/messages', [AdminPartnerSupportController::class, 'storeMessage'])->name('messages.store');
                        Route::patch('{ticket:ticket_reference}/status', [AdminPartnerSupportController::class, 'updateStatus'])->name('status');
                        Route::patch('{ticket:ticket_reference}/assign', [AdminPartnerSupportController::class, 'assign'])->name('assign');
                        Route::post('{ticket:ticket_reference}/resolve', [AdminPartnerSupportController::class, 'resolve'])->name('resolve');
                    });
                });

            // Phase 17: Reviews & Review Reports
            Route::middleware('admin.role:super_admin,operations,customer_support')
                ->prefix('reviews')
                ->name('reviews.')
                ->group(function (): void {
                    Route::get('/', [AdminReviewController::class, 'index'])->name('index');
                    Route::get('{review}', [AdminReviewController::class, 'show'])->name('show');
                    Route::post('{review}/moderate', [AdminReviewController::class, 'moderate'])->name('moderate');
                    Route::post('{review}/moderate-response', [AdminReviewController::class, 'moderateResponse'])->name('moderate-response');
                });

            Route::middleware('admin.role:super_admin,operations,customer_support')
                ->prefix('review-reports')
                ->name('review-reports.')
                ->group(function (): void {
                    Route::get('/', [AdminReviewReportController::class, 'index'])->name('index');
                    Route::get('{report}', [AdminReviewReportController::class, 'show'])->name('show');
                    Route::post('{report}/resolve', [AdminReviewReportController::class, 'resolve'])->name('resolve');
                });

            // Phase 18: Notification Operations & Delivery Monitor
            Route::middleware('admin.role:super_admin,operations,customer_support')
                ->prefix('notifications')
                ->name('notifications.')
                ->group(function (): void {
                    Route::get('/', [AdminNotificationController::class, 'index'])->name('index');
                    Route::get('/templates', [AdminNotificationTemplateController::class, 'index'])->name('templates');
                    Route::post('/templates/preview', [AdminNotificationTemplateController::class, 'preview'])->name('templates.preview');
                    Route::get('/providers', [AdminNotificationProviderController::class, 'index'])->name('providers');
                    Route::post('/providers/email/verify', [AdminNotificationProviderController::class, 'verifyEmailConnection'])->name('providers.email.verify');
                    Route::post('/providers/email/test-send', [AdminNotificationProviderController::class, 'sendTestEmail'])->name('providers.email.test-send');
                    Route::post('/push-subscriptions', [WebPushSubscriptionController::class, 'store'])->name('push-subscriptions.store');
                    Route::delete('/push-subscriptions', [WebPushSubscriptionController::class, 'destroy'])->name('push-subscriptions.destroy');
                    Route::get('/{delivery}', [AdminNotificationController::class, 'show'])->name('show');
                    Route::post('/{delivery}/retry', [AdminNotificationController::class, 'retry'])->name('retry');
                });

            // Phase 19: Content Management System (CMS)
            Route::middleware('admin.role:super_admin,operations')
                ->prefix('content')
                ->name('content.')
                ->group(function (): void {
                    // Pages
                    Route::get('pages', [AdminContentPageController::class, 'index'])->name('pages.index');
                    Route::get('pages/create', [AdminContentPageController::class, 'create'])->name('pages.create');
                    Route::post('pages', [AdminContentPageController::class, 'store'])->name('pages.store');
                    Route::get('pages/{page}/edit', [AdminContentPageController::class, 'edit'])->name('pages.edit');
                    Route::put('pages/{page}', [AdminContentPageController::class, 'update'])->name('pages.update');
                    Route::delete('pages/{page}', [AdminContentPageController::class, 'destroy'])->name('pages.destroy');
                    Route::post('pages/{page}/revisions/{revision}/restore', [AdminContentPageController::class, 'restoreRevision'])->name('pages.revisions.restore');

                    // Blog Articles
                    Route::get('blog', [AdminBlogArticleController::class, 'index'])->name('blog.index');
                    Route::get('blog/create', [AdminBlogArticleController::class, 'create'])->name('blog.create');
                    Route::post('blog', [AdminBlogArticleController::class, 'store'])->name('blog.store');
                    Route::get('blog/{article}/edit', [AdminBlogArticleController::class, 'edit'])->name('blog.edit');
                    Route::put('blog/{article}', [AdminBlogArticleController::class, 'update'])->name('blog.update');
                    Route::delete('blog/{article}', [AdminBlogArticleController::class, 'destroy'])->name('blog.destroy');

                    // Blog Categories
                    Route::get('categories', [AdminBlogCategoryController::class, 'index'])->name('categories.index');
                    Route::post('categories', [AdminBlogCategoryController::class, 'store'])->name('categories.store');
                    Route::put('categories/{category}', [AdminBlogCategoryController::class, 'update'])->name('categories.update');
                    Route::delete('categories/{category}', [AdminBlogCategoryController::class, 'destroy'])->name('categories.destroy');

                    // Authors
                    Route::get('authors', [AdminContentAuthorController::class, 'index'])->name('authors.index');
                    Route::post('authors', [AdminContentAuthorController::class, 'store'])->name('authors.store');
                    Route::put('authors/{author}', [AdminContentAuthorController::class, 'update'])->name('authors.update');
                    Route::delete('authors/{author}', [AdminContentAuthorController::class, 'destroy'])->name('authors.destroy');

                    // FAQs
                    Route::get('faqs', [AdminContentFaqController::class, 'index'])->name('faqs.index');
                    Route::post('faqs', [AdminContentFaqController::class, 'store'])->name('faqs.store');
                    Route::put('faqs/{faq}', [AdminContentFaqController::class, 'update'])->name('faqs.update');
                    Route::delete('faqs/{faq}', [AdminContentFaqController::class, 'destroy'])->name('faqs.destroy');

                    // Media Library
                    Route::get('media', [AdminMediaController::class, 'index'])->name('media.index');
                    Route::post('media', [AdminMediaController::class, 'store'])->name('media.store');
                    Route::put('media/{media}', [AdminMediaController::class, 'update'])->name('media.update');
                    Route::delete('media/{media}', [AdminMediaController::class, 'destroy'])->name('media.destroy');
                });

            // Phase 19: SEO Management
            Route::middleware('admin.role:super_admin,operations')
                ->prefix('seo')
                ->name('seo.')
                ->group(function (): void {
                    Route::get('/', [AdminSeoOverviewController::class, 'index'])->name('index');
                    Route::post('settings', [AdminSeoOverviewController::class, 'updateSettings'])->name('settings.update');

                    // Redirects
                    Route::get('redirects', [AdminSeoRedirectController::class, 'index'])->name('redirects.index');
                    Route::post('redirects', [AdminSeoRedirectController::class, 'store'])->name('redirects.store');
                    Route::put('redirects/{redirect}', [AdminSeoRedirectController::class, 'update'])->name('redirects.update');
                    Route::delete('redirects/{redirect}', [AdminSeoRedirectController::class, 'destroy'])->name('redirects.destroy');

                    // Sitemap
                    Route::get('sitemap', [AdminSitemapController::class, 'index'])->name('sitemap.index');
                    Route::post('sitemap/clear-cache', [AdminSitemapController::class, 'clearCache'])->name('sitemap.clear-cache');
                });

            // Phase 19: Marketing Tools
            Route::middleware('admin.role:super_admin,operations')
                ->prefix('marketing')
                ->name('marketing.')
                ->group(function (): void {
                    Route::get('/', [AdminMarketingDashboardController::class, 'index'])->name('index');

                    // Campaigns
                    Route::get('campaigns', [AdminMarketingCampaignController::class, 'index'])->name('campaigns.index');
                    Route::get('campaigns/create', [AdminMarketingCampaignController::class, 'create'])->name('campaigns.create');
                    Route::post('campaigns', [AdminMarketingCampaignController::class, 'store'])->name('campaigns.store');
                    Route::get('campaigns/{campaign}/edit', [AdminMarketingCampaignController::class, 'edit'])->name('campaigns.edit');
                    Route::put('campaigns/{campaign}', [AdminMarketingCampaignController::class, 'update'])->name('campaigns.update');
                    Route::delete('campaigns/{campaign}', [AdminMarketingCampaignController::class, 'destroy'])->name('campaigns.destroy');

                    // Promotional Banners
                    Route::get('banners', [AdminMarketingBannerController::class, 'index'])->name('banners.index');
                    Route::get('banners/create', [AdminMarketingBannerController::class, 'create'])->name('banners.create');
                    Route::post('banners', [AdminMarketingBannerController::class, 'store'])->name('banners.store');
                    Route::get('banners/{banner}/edit', [AdminMarketingBannerController::class, 'edit'])->name('banners.edit');
                    Route::put('banners/{banner}', [AdminMarketingBannerController::class, 'update'])->name('banners.update');
                    Route::delete('banners/{banner}', [AdminMarketingBannerController::class, 'destroy'])->name('banners.destroy');

                    // Subscribers
                    Route::get('subscribers', [AdminMarketingSubscriberController::class, 'index'])->name('subscribers.index');
                    Route::post('subscribers/{subscriber}/unsubscribe', [AdminMarketingSubscriberController::class, 'unsubscribe'])->name('subscribers.unsubscribe');

                    // Email Campaigns
                    Route::get('emails', [AdminMarketingEmailCampaignController::class, 'index'])->name('emails.index');
                    Route::get('emails/create', [AdminMarketingEmailCampaignController::class, 'create'])->name('emails.create');
                    Route::post('emails', [AdminMarketingEmailCampaignController::class, 'store'])->name('emails.store');
                    Route::get('emails/{emailCampaign}/edit', [AdminMarketingEmailCampaignController::class, 'edit'])->name('emails.edit');
                    Route::put('emails/{emailCampaign}', [AdminMarketingEmailCampaignController::class, 'update'])->name('emails.update');
                    Route::post('emails/{emailCampaign}/test', [AdminMarketingEmailCampaignController::class, 'sendTest'])->name('emails.test');
                    Route::post('emails/{emailCampaign}/send', [AdminMarketingEmailCampaignController::class, 'send'])->name('emails.send');
                });

            // Phase 15: Finance & Settlement Routes
            Route::middleware('admin.role:super_admin,finance,operations')
                ->group(function (): void {
                    // Partner Financial Onboarding
                    Route::prefix('partners/financial')->name('partners.financial.')->group(function (): void {
                        Route::get('/', [AdminFinancialProfileController::class, 'index'])->name('index');
                        Route::get('{owner}', [AdminFinancialProfileController::class, 'show'])->name('show');
                        Route::post('{owner}/verify', [AdminFinancialProfileController::class, 'verify'])->name('verify');
                        Route::post('{owner}/reject', [AdminFinancialProfileController::class, 'reject'])->name('reject');
                    });

                    // Commission Agreements
                    Route::prefix('partner-commissions')->name('partner-commissions.')->group(function (): void {
                        Route::get('/', [AdminCommissionAgreementController::class, 'index'])->name('index');
                        Route::get('create', [AdminCommissionAgreementController::class, 'create'])->name('create');
                        Route::post('/', [AdminCommissionAgreementController::class, 'store'])->name('store');
                        Route::post('{agreement}/activate', [AdminCommissionAgreementController::class, 'activate'])->name('activate');
                    });

                    // Settlements
                    Route::prefix('settlements')->name('settlements.')->group(function (): void {
                        Route::get('/', [AdminSettlementController::class, 'index'])->name('index');
                        Route::get('candidates', [AdminSettlementController::class, 'candidates'])->name('candidates');
                        Route::post('/', [AdminSettlementController::class, 'store'])->name('store');
                        Route::get('{settlement}', [AdminSettlementController::class, 'show'])->name('show');
                        Route::post('{settlement}/approve', [AdminSettlementController::class, 'approve'])->name('approve');
                        Route::post('{settlement}/release', [AdminSettlementController::class, 'release'])->name('release');
                        Route::post('{settlement}/hold', [AdminSettlementController::class, 'hold'])->name('hold');
                        Route::get('{settlement}/export-csv', [AdminSettlementController::class, 'exportCsv'])->name('export-csv');
                    });

                    // Relocation Subsidies
                    Route::prefix('relocation-subsidies')->name('relocation-subsidies.')->group(function (): void {
                        Route::get('/', [AdminRelocationSubsidyController::class, 'index'])->name('index');
                        Route::post('{subsidy}/approve', [AdminRelocationSubsidyController::class, 'approve'])->name('approve');
                    });

                    // Financial Reconciliation & Exports
                    Route::prefix('financial-reconciliation')->name('financial-reconciliation.')->group(function (): void {
                        Route::get('/', [AdminFinancialReconciliationController::class, 'index'])->name('index');
                        Route::post('{settlement}/resolve', [AdminFinancialReconciliationController::class, 'resolve'])->name('resolve');
                        Route::get('export', [AdminFinancialReconciliationController::class, 'export'])->name('export');
                    });
                });

            Route::middleware('admin.role:super_admin,property_verification,operations')
                ->prefix('partners')
                ->name('partners.')
                ->controller(PartnerVerificationController::class)
                ->group(function (): void {
                    Route::get('/', 'index')->name('index');
                    Route::get('{application}', 'show')
                        ->whereNumber('application')
                        ->name('show');
                    Route::get('{application}/history', 'history')
                        ->whereNumber('application')
                        ->name('history');
                });

            Route::middleware('admin.role:super_admin,property_verification')
                ->name('partners.')
                ->group(function (): void {
                    Route::prefix('partners/{application}')
                        ->whereNumber('application')
                        ->controller(PartnerVerificationController::class)
                        ->group(function (): void {
                            Route::post('assign', 'assign')->name('assign');
                            Route::post('start-review', 'startReview')->name('start-review');
                            Route::post('request-information', 'requestInformation')->name('request-information');
                            Route::post('approve', 'approve')->name('approve');
                            Route::post('reject', 'reject')->name('reject');
                        });

                    Route::get('partner-verification-documents/{document}', PartnerVerificationDocumentController::class)
                        ->whereNumber('document')
                        ->name('documents.show');
                });

            Route::middleware('admin.role:super_admin,property_verification,operations')
                ->prefix('properties')
                ->name('properties.')
                ->controller(AdminPropertyController::class)
                ->group(function (): void {
                    Route::get('/', 'index')->name('index');
                    Route::get('{property}', 'show')
                        ->whereNumber('property')
                        ->name('show');
                    Route::get('{property}/history', 'history')
                        ->whereNumber('property')
                        ->name('history');
                    Route::get('{property}/media/{media}/preview', 'previewMedia')
                        ->whereNumber(['property', 'media'])
                        ->name('media.preview');
                });

            Route::middleware('admin.role:super_admin,property_verification,operations,finance,customer_support')
                ->prefix('amenities')
                ->name('amenities.')
                ->controller(AdminAmenityController::class)
                ->group(function (): void {
                    Route::get('/', 'index')->name('index');
                    Route::get('property/{assignment}', 'showProperty')
                        ->whereNumber('assignment')
                        ->name('property.show');
                    Route::get('room-type/{assignment}', 'showRoomType')
                        ->whereNumber('assignment')
                        ->name('room-type.show');
                });

            Route::middleware('admin.role:super_admin,property_verification')
                ->prefix('amenities')
                ->name('amenities.')
                ->controller(AdminAmenityController::class)
                ->group(function (): void {
                    Route::post('categories', 'storeCategory')->name('categories.store');
                    Route::patch('categories/{category}', 'updateCategory')->whereNumber('category')->name('categories.update');
                    Route::post('items', 'storeAmenity')->name('items.store');
                    Route::patch('items/{amenity}', 'updateAmenity')->whereNumber('amenity')->name('items.update');

                    Route::post('property/{assignment}/assign', 'assignProperty')->whereNumber('assignment')->name('property.assign');
                    Route::post('property/{assignment}/start-review', 'startReviewProperty')->whereNumber('assignment')->name('property.start-review');
                    Route::post('property/{assignment}/request-information', 'requestInformationProperty')->whereNumber('assignment')->name('property.request-information');
                    Route::post('property/{assignment}/approve', 'approveProperty')->whereNumber('assignment')->name('property.approve');
                    Route::post('property/{assignment}/reject', 'rejectProperty')->whereNumber('assignment')->name('property.reject');

                    Route::post('room-type/{assignment}/assign', 'assignRoomType')->whereNumber('assignment')->name('room-type.assign');
                    Route::post('room-type/{assignment}/start-review', 'startReviewRoomType')->whereNumber('assignment')->name('room-type.start-review');
                    Route::post('room-type/{assignment}/request-information', 'requestInformationRoomType')->whereNumber('assignment')->name('room-type.request-information');
                    Route::post('room-type/{assignment}/approve', 'approveRoomType')->whereNumber('assignment')->name('room-type.approve');
                    Route::post('room-type/{assignment}/reject', 'rejectRoomType')->whereNumber('assignment')->name('room-type.reject');
                });

            Route::middleware('admin.role:super_admin,property_verification,operations,finance,customer_support')
                ->prefix('pricing')
                ->name('pricing.')
                ->controller(AdminPricingController::class)
                ->group(function (): void {
                    Route::get('/', 'index')->name('index');
                    Route::get('{property}', 'show')
                        ->whereNumber('property')
                        ->name('show');
                });

            Route::middleware('admin.role:super_admin,operations')
                ->prefix('pricing/{property}')
                ->whereNumber('property')
                ->name('pricing.')
                ->controller(AdminPricingController::class)
                ->group(function (): void {
                    Route::post('restrictions', 'storeRestriction')->name('restrictions.store');
                    Route::post('restrictions/{block}/cancel', 'cancelRestriction')
                        ->whereNumber('block')
                        ->name('restrictions.cancel');
                });

            Route::middleware('admin.role:super_admin,operations')
                ->prefix('properties/{property}')
                ->whereNumber('property')
                ->name('properties.')
                ->controller(AdminPropertyController::class)
                ->group(function (): void {
                    Route::post('operational-status', 'updateStatus')->name('operational-status');
                });

            Route::middleware('admin.role:super_admin,property_verification')
                ->name('properties.')
                ->group(function (): void {
                    Route::prefix('properties/{property}')
                        ->whereNumber('property')
                        ->controller(AdminPropertyController::class)
                        ->group(function (): void {
                            Route::post('assign', 'assign')->name('assign');
                            Route::post('start-review', 'startReview')->name('start-review');
                            Route::post('media/{media}/moderate', 'moderateMedia')
                                ->whereNumber('media')
                                ->name('media.moderate');
                            Route::post('request-information', 'requestInformation')->name('request-information');
                            Route::post('approve', 'approve')->name('approve');
                            Route::post('reject', 'reject')->name('reject');
                        });

                    Route::get('property-verification-documents/{document}', AdminPropertyDocumentController::class)
                        ->whereNumber('document')
                        ->name('documents.show');
                });

            // Rewards & Loyalty Ecosystem
            Route::middleware('admin.role:super_admin,operations,finance')
                ->prefix('rewards')
                ->name('rewards.')
                ->group(function (): void {
                    Route::get('/', [AdminRewardsOverviewController::class, 'index'])->name('index');

                    // Campaigns & Coupons
                    Route::get('campaigns', [AdminCampaignController::class, 'index'])->name('campaigns.index');
                    Route::get('campaigns/create', [AdminCampaignController::class, 'create'])->name('campaigns.create');
                    Route::post('campaigns', [AdminCampaignController::class, 'store'])->name('campaigns.store');
                    Route::get('campaigns/{campaign}', [AdminCampaignController::class, 'show'])->name('campaigns.show');
                    Route::post('campaigns/{campaign}/status', [AdminCampaignController::class, 'toggleStatus'])->name('campaigns.status');

                    // Referrals
                    Route::get('referrals', [AdminReferralController::class, 'index'])->name('referrals.index');
                    Route::post('referrals/{referral}/disqualify', [AdminReferralController::class, 'disqualify'])->name('referrals.disqualify');
                    Route::post('referrals/profiles/{profile}/toggle-block', [AdminReferralController::class, 'toggleProfileBlock'])->name('referrals.toggle-block');

                    // Points & Settings
                    Route::get('points', [AdminPointsController::class, 'index'])->name('points.index');
                    Route::post('points/adjust', [AdminPointsController::class, 'adjust'])->name('points.adjust');
                    Route::post('points/settings', [AdminPointsController::class, 'updateSettings'])->name('points.settings');
                });

            // Phase: System Management
            Route::middleware('admin.role:super_admin')
                ->prefix('system')
                ->name('system.')
                ->group(function (): void {
                    // Admin Accounts
                    Route::get('admins', [AdminAccountController::class, 'index'])->name('admins.index');
                    Route::post('admins', [AdminAccountController::class, 'store'])->name('admins.store');
                    Route::put('admins/{admin}', [AdminAccountController::class, 'update'])->name('admins.update');
                    Route::post('admins/{admin}/toggle-status', [AdminAccountController::class, 'toggleStatus'])->name('admins.toggle-status');
                    Route::post('admins/{admin}/reset-2fa', [AdminAccountController::class, 'resetTwoFactor'])->name('admins.reset-2fa');

                    // Roles & Permissions
                    Route::get('roles', [AdminRoleController::class, 'index'])->name('roles.index');

                    // Cities
                    Route::get('cities', [AdminCityController::class, 'index'])->name('cities.index');
                    Route::post('cities', [AdminCityController::class, 'store'])->name('cities.store');
                    Route::put('cities/{city}', [AdminCityController::class, 'update'])->name('cities.update');
                    Route::post('cities/{city}/toggle-status', [AdminCityController::class, 'toggleStatus'])->name('cities.toggle-status');
                    Route::delete('cities/{city}', [AdminCityController::class, 'destroy'])->name('cities.destroy');

                    // Categories
                    Route::get('categories', [AdminCategoryController::class, 'index'])->name('categories.index');
                    Route::post('categories', [AdminCategoryController::class, 'store'])->name('categories.store');
                    Route::put('categories/{category}', [AdminCategoryController::class, 'update'])->name('categories.update');
                    Route::post('categories/{category}/toggle-status', [AdminCategoryController::class, 'toggleStatus'])->name('categories.toggle-status');
                    Route::delete('categories/{category}', [AdminCategoryController::class, 'destroy'])->name('categories.destroy');

                    // Platform Settings
                    Route::get('settings', [AdminPlatformSettingController::class, 'index'])->name('settings.index');
                    Route::post('settings', [AdminPlatformSettingController::class, 'update'])->name('settings.update');
                    Route::post('settings/test-integration', [AdminPlatformSettingController::class, 'testIntegration'])->name('settings.test-integration');
                    Route::post('settings/upload-asset', [AdminPlatformSettingController::class, 'uploadAsset'])->name('settings.upload-asset');
                });
        });
    });
