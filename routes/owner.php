<?php

declare(strict_types=1);

use App\Http\Controllers\Notifications\WebPushSubscriptionController;
use App\Http\Controllers\Owner\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Owner\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Owner\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Owner\Auth\NewPasswordController;
use App\Http\Controllers\Owner\Auth\PasswordResetLinkController;
use App\Http\Controllers\Owner\Auth\RegisteredOwnerController;
use App\Http\Controllers\Owner\Auth\VerifyEmailController;
use App\Http\Controllers\Owner\CustomerCases\OwnerRelocationController;
use App\Http\Controllers\Owner\DashboardController;
use App\Http\Controllers\Owner\Financial\OwnerCommissionAgreementController;
use App\Http\Controllers\Owner\Financial\OwnerFinancialProfileController;
use App\Http\Controllers\Owner\Financial\OwnerSettlementController;
use App\Http\Controllers\Owner\Onboarding\PartnerOnboardingController;
use App\Http\Controllers\Owner\Operations\OwnerAvailabilityPricingController;
use App\Http\Controllers\Owner\Operations\OwnerComplaintsController;
use App\Http\Controllers\Owner\Operations\OwnerFrontDeskController;
use App\Http\Controllers\Owner\OwnerNotificationController;
use App\Http\Controllers\Owner\OwnerReviewController;
use App\Http\Controllers\Owner\ProfileController;
use App\Http\Controllers\Owner\Properties\PropertyAmenityController;
use App\Http\Controllers\Owner\Properties\PropertyController;
use App\Http\Controllers\Owner\Properties\PropertyMediaController;
use App\Http\Controllers\Owner\Properties\PropertyPricingController;
use App\Http\Controllers\Owner\Properties\PropertyRoomController;
use App\Http\Controllers\Owner\Properties\PropertyRoomTypeController;
use App\Http\Controllers\Owner\Properties\PropertyVerificationController;
use App\Http\Controllers\Owner\Reservations\ReservationAllocationController;
use App\Http\Controllers\Owner\Reservations\ReservationCancellationController;
use App\Http\Controllers\Owner\Reservations\ReservationCheckInOutController;
use App\Http\Controllers\Owner\Reservations\ReservationController;
use App\Http\Controllers\Owner\Support\OwnerSupportTicketController;
use Illuminate\Support\Facades\Route;

Route::prefix('owner')
    ->name('owner.')
    ->group(function (): void {
        Route::get('/', fn () => redirect()->route('owner.dashboard'));

        Route::middleware('guest:owner')->group(function (): void {
            Route::get('login', [AuthenticatedSessionController::class, 'create'])
                ->name('login');
            Route::post('login', [AuthenticatedSessionController::class, 'store'])
                ->middleware('throttle:owner-login')
                ->name('login.store');

            Route::get('register', [RegisteredOwnerController::class, 'create'])
                ->name('register');
            Route::post('register', [RegisteredOwnerController::class, 'store'])
                ->middleware('throttle:owner-register')
                ->name('register.store');

            Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
                ->name('password.request');
            Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
                ->middleware('throttle:owner-password-reset')
                ->name('password.email');

            Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
                ->name('password.reset');
            Route::post('reset-password', [NewPasswordController::class, 'store'])
                ->middleware('throttle:owner-password-reset')
                ->name('password.update');
        });

        Route::middleware(['auth:owner', 'owner.active'])->group(function (): void {
            Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
                ->name('logout');

            Route::get('verify-email', EmailVerificationPromptController::class)
                ->name('verification.notice');
            Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
                ->middleware(['signed', 'throttle:owner-verification'])
                ->name('verification.verify');
            Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
                ->middleware('throttle:owner-verification')
                ->name('verification.send');

            Route::get('dashboard', DashboardController::class)
                ->name('dashboard');

            // Operations: Availability & Pricing
            Route::prefix('availability')->name('availability.')->group(function (): void {
                Route::get('/', [OwnerAvailabilityPricingController::class, 'index'])->name('index');
                Route::put('{property}/pricing', [OwnerAvailabilityPricingController::class, 'updatePricing'])->name('pricing.update');
                Route::post('{property}/blocks', [OwnerAvailabilityPricingController::class, 'storeBlock'])->name('blocks.store');
                Route::delete('{property}/blocks/{block}', [OwnerAvailabilityPricingController::class, 'cancelBlock'])->name('blocks.cancel');
            });

            // Operations: Check-ins & Check-outs (Front Desk)
            Route::prefix('front-desk')->name('front-desk.')->group(function (): void {
                Route::get('/', [OwnerFrontDeskController::class, 'index'])->name('index');
                Route::post('{reservation}/check-in', [ReservationCheckInOutController::class, 'checkIn'])->name('check-in');
                Route::post('{reservation}/check-out', [ReservationCheckInOutController::class, 'checkOut'])->name('check-out');
            });

            // Operations: Complaints
            Route::prefix('complaints')->name('complaints.')->group(function (): void {
                Route::get('/', [OwnerComplaintsController::class, 'index'])->name('index');
                Route::get('{case:case_reference}', [OwnerComplaintsController::class, 'show'])->name('show');
                Route::post('{case:case_reference}/messages', [OwnerComplaintsController::class, 'storeMessage'])->name('messages.store');
                Route::get('{case:case_reference}/messages/{message}/attachment', [OwnerComplaintsController::class, 'downloadAttachment'])
                    ->whereNumber('message')
                    ->name('messages.attachment');
            });

            Route::prefix('reservations')->name('reservations.')->group(function (): void {
                Route::get('/', [ReservationController::class, 'index'])->name('index');
                Route::get('{reservation}', [ReservationController::class, 'show'])->name('show');
                Route::post('{reservation}/cancel', ReservationCancellationController::class)->name('cancel');
                Route::put('{reservation}/allocations', [ReservationAllocationController::class, 'update'])->name('allocations');
                Route::post('{reservation}/check-in', [ReservationCheckInOutController::class, 'checkIn'])->name('check-in');
                Route::post('{reservation}/check-out', [ReservationCheckInOutController::class, 'checkOut'])->name('check-out');
            });

            Route::prefix('cases')->name('cases.')->group(function (): void {
                Route::get('/', fn () => redirect()->route('owner.complaints.index'))->name('index');
                Route::get('{case:case_reference}', fn (string $case) => redirect()->route('owner.complaints.show', $case))->name('show');
                Route::post('{case:case_reference}/messages', [OwnerComplaintsController::class, 'storeMessage'])->name('messages.store');
            });

            Route::post('relocations/{relocation}/respond', [OwnerRelocationController::class, 'respond'])->name('relocations.respond');

            // Partner Support
            Route::prefix('support')->name('support.')->group(function (): void {
                Route::get('/', [OwnerSupportTicketController::class, 'index'])->name('index');
                Route::post('/', [OwnerSupportTicketController::class, 'store'])->name('store');
                Route::get('{ticket:ticket_reference}', [OwnerSupportTicketController::class, 'show'])->name('show');
                Route::post('{ticket:ticket_reference}/messages', [OwnerSupportTicketController::class, 'storeMessage'])->name('messages.store');
                Route::post('{ticket:ticket_reference}/close', [OwnerSupportTicketController::class, 'close'])->name('close');
            });

            Route::prefix('notifications')->name('notifications.')->controller(OwnerNotificationController::class)->group(function (): void {
                Route::get('/', 'index')->name('index');
                Route::get('/unread-count', 'unreadCount')->name('unread-count');
                Route::post('/{id}/read', 'markAsRead')->name('mark-read');
                Route::post('/mark-all-read', 'markAllAsRead')->name('mark-all-read');
                Route::post('/push-subscriptions', [WebPushSubscriptionController::class, 'store'])->name('push-subscriptions.store');
                Route::delete('/push-subscriptions', [WebPushSubscriptionController::class, 'destroy'])->name('push-subscriptions.destroy');
            });

            Route::get('settings/notifications', [OwnerNotificationController::class, 'preferences'])->name('settings.notifications');
            Route::put('settings/notifications', [OwnerNotificationController::class, 'updatePreferences'])->name('settings.notifications.update');

            // Phase 15: Partner Settlements, Commissions & Financial Profile
            Route::prefix('financial-profile')->name('financial-profile.')->group(function (): void {
                Route::get('/', [OwnerFinancialProfileController::class, 'show'])->name('show');
                Route::put('/', [OwnerFinancialProfileController::class, 'update'])->name('update');
            });

            Route::prefix('commission-agreements')->name('commission-agreements.')->group(function (): void {
                Route::get('/', [OwnerCommissionAgreementController::class, 'index'])->name('index');
                Route::post('{agreement}/accept', [OwnerCommissionAgreementController::class, 'accept'])->name('accept');
            });

            Route::prefix('settlements')->name('settlements.')->group(function (): void {
                Route::get('/', [OwnerSettlementController::class, 'index'])->name('index');
                Route::get('{settlement:settlement_reference}', [OwnerSettlementController::class, 'show'])->name('show');
                Route::get('{settlement:settlement_reference}/statement', [OwnerSettlementController::class, 'statement'])->name('statement');
                Route::get('{settlement:settlement_reference}/export-csv', [OwnerSettlementController::class, 'exportCsv'])->name('export-csv');
            });

            // Phase 17: Customer Reviews & Public Responses
            Route::prefix('reviews')->name('reviews.')->group(function (): void {
                Route::get('/', [OwnerReviewController::class, 'index'])->name('index');
                Route::post('{review}/response', [OwnerReviewController::class, 'storeResponse'])->name('response.store');
                Route::put('{review}/response', [OwnerReviewController::class, 'updateResponse'])->name('response.update');
                Route::post('{review}/report', [OwnerReviewController::class, 'reportReview'])->name('report');
            });

            Route::get('profile', [ProfileController::class, 'edit'])
                ->name('profile.edit');
            Route::patch('profile', [ProfileController::class, 'update'])
                ->name('profile.update');
            Route::put('profile/password', [ProfileController::class, 'updatePassword'])
                ->middleware('throttle:6,1')
                ->name('profile.password.update');

            Route::prefix('onboarding')
                ->name('onboarding.')
                ->controller(PartnerOnboardingController::class)
                ->group(function (): void {
                    Route::get('/', 'index')->name('index');
                    Route::get('business-profile', 'businessProfile')->name('business-profile');
                    Route::put('business-profile', 'updateBusinessProfile')->name('business-profile.update');
                    Route::get('cities', 'cities')->name('cities');
                    Route::put('cities', 'updateCities')->name('cities.update');
                    Route::get('documents', 'documents')->name('documents');
                    Route::post('documents', 'uploadDocument')->name('documents.store');
                    Route::get('documents/{document}', 'showDocument')
                        ->whereNumber('document')
                        ->name('documents.show');
                    Route::delete('documents/{document}', 'deleteDocument')
                        ->whereNumber('document')
                        ->name('documents.destroy');
                    Route::get('review', 'review')->name('review');
                    Route::post('submit', 'submit')->name('submit');
                    Route::get('status', 'status')->name('status');
                    Route::post('withdraw', 'withdraw')->name('withdraw');
                    Route::post('start-revision', 'startRevision')->name('start-revision');
                });

            Route::prefix('properties')
                ->name('properties.')
                ->group(function (): void {
                    Route::get('/', [PropertyController::class, 'index'])->name('index');
                    Route::get('create', [PropertyController::class, 'create'])->name('create');
                    Route::post('/', [PropertyController::class, 'store'])->name('store');

                    Route::prefix('{property}')
                        ->whereNumber('property')
                        ->group(function (): void {
                            Route::get('/', [PropertyController::class, 'show'])->name('show');
                            Route::get('edit', [PropertyController::class, 'edit'])->name('edit');
                            Route::put('/', [PropertyController::class, 'update'])->name('update');
                            Route::patch('operational-status', [PropertyController::class, 'updateOperationalStatus'])
                                ->name('operational-status.update');
                            Route::post('amendment/start', [PropertyController::class, 'startAmendment'])
                                ->name('amendment.start');
                            Route::post('amendment/cancel', [PropertyController::class, 'cancelAmendment'])
                                ->name('amendment.cancel');

                            Route::prefix('room-types')
                                ->name('room-types.')
                                ->controller(PropertyRoomTypeController::class)
                                ->group(function (): void {
                                    Route::get('/', 'index')->name('index');
                                    Route::get('create', 'create')->name('create');
                                    Route::post('/', 'store')->name('store');
                                    Route::get('{roomType}/edit', 'edit')
                                        ->whereNumber('roomType')
                                        ->name('edit');
                                    Route::put('{roomType}', 'update')
                                        ->whereNumber('roomType')
                                        ->name('update');
                                    Route::delete('{roomType}', 'destroy')
                                        ->whereNumber('roomType')
                                        ->name('destroy');
                                });

                            Route::prefix('rooms')
                                ->name('rooms.')
                                ->controller(PropertyRoomController::class)
                                ->group(function (): void {
                                    Route::get('/', 'index')->name('index');
                                    Route::get('create', 'create')->name('create');
                                    Route::post('/', 'store')->name('store');
                                    Route::get('{room}/edit', 'edit')
                                        ->whereNumber('room')
                                        ->name('edit');
                                    Route::put('{room}', 'update')
                                        ->whereNumber('room')
                                        ->name('update');
                                    Route::patch('{room}/status', 'updateStatus')
                                        ->whereNumber('room')
                                        ->name('status.update');
                                    Route::delete('{room}', 'destroy')
                                        ->whereNumber('room')
                                        ->name('destroy');
                                });

                            Route::prefix('media')
                                ->name('media.')
                                ->controller(PropertyMediaController::class)
                                ->group(function (): void {
                                    Route::get('/', 'index')->name('index');
                                    Route::post('/', 'store')->name('store');
                                    Route::patch('reorder', 'reorder')->name('reorder');
                                    Route::patch('{media}', 'update')
                                        ->whereNumber('media')
                                        ->name('update');
                                    Route::delete('{media}', 'destroy')
                                        ->whereNumber('media')
                                        ->name('destroy');
                                    Route::get('{media}/preview', 'preview')
                                        ->whereNumber('media')
                                        ->name('preview');
                                });

                            Route::prefix('amenities')
                                ->name('amenities.')
                                ->controller(PropertyAmenityController::class)
                                ->group(function (): void {
                                    Route::get('/', 'index')->name('index');
                                    Route::put('/sync', 'sync')->name('sync');
                                    Route::post('/property', 'storeProperty')->name('property.store');
                                    Route::patch('/property/{amenity}', 'updateProperty')
                                        ->whereNumber('amenity')
                                        ->name('property.update');
                                    Route::post('/property/{amenity}/submit', 'submitProperty')
                                        ->whereNumber('amenity')
                                        ->name('property.submit');
                                    Route::post('/room-type', 'storeRoomType')->name('room-type.store');
                                    Route::patch('/room-type/{amenity}', 'updateRoomType')
                                        ->whereNumber('amenity')
                                        ->name('room-type.update');
                                    Route::post('/room-type/{amenity}/submit', 'submitRoomType')
                                        ->whereNumber('amenity')
                                        ->name('room-type.submit');
                                });

                            Route::prefix('pricing')
                                ->name('pricing.')
                                ->controller(PropertyPricingController::class)
                                ->group(function (): void {
                                    Route::get('/', 'index')->name('index');
                                    Route::put('/', 'update')->name('update');
                                    Route::post('/availability-blocks', 'storeAvailabilityBlock')->name('availability-blocks.store');
                                    Route::post('/availability-blocks/{block}/cancel', 'cancelAvailabilityBlock')
                                        ->whereNumber('block')
                                        ->name('availability-blocks.cancel');
                                });

                            Route::prefix('verification')
                                ->name('verification.')
                                ->controller(PropertyVerificationController::class)
                                ->group(function (): void {
                                    Route::get('/', 'show')->name('show');
                                    Route::post('documents', 'uploadDocument')->name('documents.store');
                                    Route::get('documents/{document}', 'showDocument')
                                        ->whereNumber('document')
                                        ->name('documents.show');
                                    Route::delete('documents/{document}', 'deleteDocument')
                                        ->whereNumber('document')
                                        ->name('documents.destroy');
                                    Route::post('submit', 'submit')->name('submit');
                                    Route::post('withdraw', 'withdraw')->name('withdraw');
                                    Route::post('start-revision', 'startRevision')->name('start-revision');
                                });
                        });
                });
        });
    });
