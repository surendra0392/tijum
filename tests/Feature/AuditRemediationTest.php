<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Actions\Reservations\CreateReservation;
use App\Actions\Reservations\ReservationLifecycle;
use App\Enums\AdminRole;
use App\Enums\CampaignStatus;
use App\Enums\CampaignType;
use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\ContentStatus;
use App\Enums\CouponFundingSource;
use App\Enums\CouponOfferType;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyAvailabilityBlockType;
use App\Enums\PropertyOperationalStatus;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use App\Enums\ReviewStatus;
use App\Models\Admin;
use App\Models\BlogArticle;
use App\Models\BlogCategory;
use App\Models\ContentPage;
use App\Models\CouponCode;
use App\Models\CustomerPointsWallet;
use App\Models\CustomerProtectionCase;
use App\Models\CustomerProtectionCaseMessage;
use App\Models\NotificationDelivery;
use App\Models\OwnerFinancialProfile;
use App\Models\PlatformSetting;
use App\Models\PromotionalCampaign;
use App\Models\Property;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyRatingSummary;
use App\Models\PropertyReview;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\RewardsSetting;
use App\Models\SeoRedirect;
use App\Models\User;
use App\Services\Content\ContentBlockSanitizer;
use App\Services\Notifications\WebhookProcessingService;
use App\Services\Seo\SeoService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class AuditRemediationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_canonical_seo_stay_detail_route_renders_with_structured_data(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType, '101');

        PropertyRatingSummary::query()->updateOrCreate(
            ['property_id' => $property->id],
            [
                'published_review_count' => 3,
                'average_rating' => 4.6,
                'cleanliness_average' => 4.7,
                'food_average' => 4.5,
                'communication_average' => 4.8,
                'value_average' => 4.4,
                'last_recalculated_at' => now(),
            ],
        );

        $citySlug = $property->city->slug;

        $response = $this->get(route('public.properties.seo', [
            'citySlug' => $citySlug,
            'property' => $property->slug,
        ]));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/properties/show')
                ->where('property.slug', $property->slug)
                ->has('seo.structuredData.@graph')
            );

        $response->assertSee('LodgingBusiness', false)
            ->assertSee('AggregateRating', false);
    }

    public function test_owner_property_edit_succeeds_without_verification_application(): void
    {
        $owner = $this->createActiveOwner();
        $property = Property::factory()->create([
            'owner_id' => $owner->id,
            'status' => PropertyOperationalStatus::Draft,
        ]);

        $response = $this->actingAs($owner, 'owner')
            ->get(route('owner.properties.edit', $property));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('owner/properties/edit')
                ->where('property.id', $property->id)
                ->where('property.ownership_arrangement', 'owner_operator')
            );
    }

    public function test_admin_pricing_restriction_can_be_created_and_cancelled(): void
    {
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $start = CarbonImmutable::now('Asia/Kolkata')->addDays(10)->toDateString();
        $end = CarbonImmutable::now('Asia/Kolkata')->addDays(12)->toDateString();

        $storeResponse = $this->actingAs($admin, 'admin')
            ->post(route('admin.pricing.restrictions.store', $property), [
                'scope' => PropertyAvailabilityBlockScope::Property->value,
                'block_type' => PropertyAvailabilityBlockType::StopSell->value,
                'start_date' => $start,
                'end_date' => $end,
                'reason' => 'Compliance inspection window',
            ]);

        $storeResponse->assertRedirect()
            ->assertSessionHas('status', 'restriction-created');

        $block = PropertyAvailabilityBlock::query()
            ->where('property_id', $property->id)
            ->where('is_admin_restriction', true)
            ->firstOrFail();

        $this->assertSame(PropertyAvailabilityBlockStatus::Active, $block->status);

        $cancelResponse = $this->actingAs($admin, 'admin')
            ->post(route('admin.pricing.restrictions.cancel', [$property, $block]));

        $cancelResponse->assertRedirect();
        $this->assertSame(PropertyAvailabilityBlockStatus::Cancelled, $block->fresh()->status);
    }

    public function test_admin_global_search_succeeds_without_sql_error(): void
    {
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();
        $owner = $this->createActiveOwner(['name' => 'Audit Global Owner']);
        $this->createBookableProperty($owner);

        $response = $this->actingAs($admin, 'admin')
            ->getJson(route('admin.search', ['q' => 'Audit']));

        $response->assertOk()
            ->assertJsonStructure([
                'results' => [
                    'reservations',
                    'cases',
                    'settlements',
                    'payments',
                    'partners',
                    'properties',
                    'customers',
                    'reviews',
                ],
            ]);
    }

    public function test_admin_seo_redirect_rejects_open_redirects_and_allows_internal_paths(): void
    {
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();

        foreach (['//evil.example/phish', '/\evil.example', 'javascript:alert(1)', 'https://evil.example/'] as $unsafeTarget) {
            $response = $this->actingAs($admin, 'admin')
                ->post(route('admin.seo.redirects.store'), [
                    'source_path' => '/old-promo',
                    'destination_url' => $unsafeTarget,
                    'http_status' => 301,
                    'is_active' => true,
                ]);

            $response->assertRedirect()
                ->assertSessionHas('error');
        }

        $this->assertSame(0, SeoRedirect::query()->count());

        $validResponse = $this->actingAs($admin, 'admin')
            ->post(route('admin.seo.redirects.store'), [
                'source_path' => '/old-hyderabad-stays',
                'destination_url' => '/stays-in-hyderabad',
                'http_status' => 301,
                'is_active' => true,
            ]);

        $validResponse->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('seo_redirects', [
            'source_path' => '/old-hyderabad-stays',
            'destination_url' => '/stays-in-hyderabad',
        ]);
    }

    public function test_customer_review_edit_blocks_cross_user_access(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $author = $this->createCustomerUser();
        $otherCustomer = $this->createCustomerUser();

        $reservation = $this->createBasicReservation($author, $property, $roomType, ReservationStatus::Confirmed);

        $review = PropertyReview::query()->create([
            'property_id' => $property->id,
            'reservation_id' => $reservation->id,
            'user_id' => $author->id,
            'owner_id' => $owner->id,
            'customer_display_name' => $author->name,
            'verified_booking' => true,
            'overall_rating' => 5,
            'cleanliness_rating' => 5,
            'food_quality_rating' => 5,
            'communication_rating' => 5,
            'value_rating' => 5,
            'title' => 'Clean and welcoming stay',
            'content' => 'Great hospitality and reliable meals throughout the week.',
            'status' => ReviewStatus::Published,
            'published_at' => now(),
            'submitted_at' => now(),
        ]);

        $this->actingAs($otherCustomer, 'web')
            ->get(route('reviews.edit', $review))
            ->assertForbidden();
    }

    public function test_unpaid_reservation_receipt_returns_not_found(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $customer = $this->createCustomerUser();

        $reservation = $this->createBasicReservation($customer, $property, $roomType, ReservationStatus::AwaitingPayment);

        $this->actingAs($customer, 'web')
            ->get(route('reservations.receipt', $reservation))
            ->assertNotFound();
    }

    public function test_protection_case_attachment_rejects_html_and_authorizes_download(): void
    {
        Storage::fake('local');

        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $customer = $this->createCustomerUser();
        $otherCustomer = $this->createCustomerUser();
        $reservation = $this->createBasicReservation($customer, $property, $roomType, ReservationStatus::Confirmed);

        $case = CustomerProtectionCase::query()->create([
            'case_reference' => 'CASE-AUDIT-'.strtoupper(Str::random(6)),
            'reservation_id' => $reservation->id,
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'owner_id' => $owner->id,
            'category' => CaseCategory::FoodNotProvided,
            'priority' => CasePriority::High,
            'status' => CaseStatus::Open,
            'description' => 'Dinner was not served on the first evening.',
            'sla_due_at' => now()->addDays(7),
        ]);

        $token = $customer->createToken('test')->plainTextToken;

        $maliciousUpload = UploadedFile::fake()->create('exploit.html', 12, 'text/html');
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/customer/cases/{$case->case_reference}/messages", [
                'message' => 'Trying unsafe upload',
                'attachment' => $maliciousUpload,
            ])
            ->assertUnprocessable();

        $validPdf = UploadedFile::fake()->create('evidence.pdf', 100, 'application/pdf');
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/customer/cases/{$case->case_reference}/messages", [
                'message' => 'Attached PDF receipt evidence',
                'attachment' => $validPdf,
            ])
            ->assertCreated();

        $message = CustomerProtectionCaseMessage::query()
            ->where('customer_protection_case_id', $case->id)
            ->whereNotNull('attachment_path')
            ->latest('id')
            ->firstOrFail();

        $this->actingAs($customer, 'web')
            ->get(route('support.cases.messages.attachment', ['case' => $case->case_reference, 'message' => $message->id]))
            ->assertOk();

        $this->actingAs($otherCustomer, 'web')
            ->get(route('support.cases.messages.attachment', ['case' => $case->case_reference, 'message' => $message->id]))
            ->assertForbidden();
    }

    public function test_partner_financial_profile_rejects_updates_when_active_or_under_review(): void
    {
        foreach ([FinancialOnboardingStatus::Active, FinancialOnboardingStatus::UnderReview] as $lockedStatus) {
            $owner = $this->createActiveOwner();
            $profile = OwnerFinancialProfile::query()->create([
                'owner_id' => $owner->id,
                'legal_business_name' => 'Original Legal Name',
                'business_constitution' => 'individual',
                'pan_number' => 'ABCDE1234F',
                'gst_registered' => false,
                'supplier_legal_classification' => 'unregistered',
                'bank_beneficiary_name' => 'Original Beneficiary',
                'bank_account_number_masked' => '•••• •••• 4321',
                'bank_ifsc' => 'HDFC0001234',
                'bank_name' => 'HDFC Bank',
                'onboarding_status' => $lockedStatus,
            ]);

            $response = $this->actingAs($owner, 'owner')
                ->put(route('owner.financial-profile.update'), [
                    'legal_business_name' => 'Tampered Business Name',
                    'business_constitution' => 'individual',
                    'pan_number' => 'ZZZZZ9999Z',
                    'gst_registered' => false,
                    'supplier_legal_classification' => 'unregistered',
                    'bank_beneficiary_name' => 'Tampered Account',
                    'bank_account_number' => '999999999999',
                    'bank_ifsc' => 'SBIN0000123',
                    'bank_name' => 'SBI',
                ]);

            $response->assertSessionHasErrors('onboarding_status');
            $this->assertSame('Original Legal Name', $profile->fresh()->legal_business_name);
            $this->assertSame('ABCDE1234F', $profile->fresh()->pan_number);
        }
    }

    public function test_loyalty_and_coupon_holds_are_isolated_and_restored_on_zero_payable_cancellation(): void
    {
        RewardsSetting::set('points_redemption_min_balance', 100, 'integer', 'points');
        RewardsSetting::set('points_redemption_max_percentage', 100, 'integer', 'points');
        RewardsSetting::set('points_redemption_rate_paise', 100, 'integer', 'points');

        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType, '101');
        $this->createActiveRoom($property, $roomType, '102');
        $customer = $this->createCustomerUser();

        $wallet = CustomerPointsWallet::query()->create([
            'user_id' => $customer->id,
            'available_points' => 1000,
            'pending_points' => 0,
            'reserved_points' => 0,
            'redeemed_points' => 0,
            'expired_points' => 0,
            'total_points_earned' => 1000,
        ]);

        $campaign = PromotionalCampaign::query()->create([
            'campaign_reference' => 'CMP-AUDIT-'.strtoupper(Str::random(6)),
            'name' => 'Audit Promo',
            'slug' => 'audit-promo-'.strtolower(Str::random(6)),
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDays(10),
        ]);

        $coupon = CouponCode::query()->create([
            'campaign_id' => $campaign->id,
            'code' => 'AUDIT500',
            'description' => 'Flat 500 off',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 50000,
            'funding_source' => CouponFundingSource::Platform,
            'min_booking_amount_minor' => 50000,
            'is_active' => true,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(10),
            'total_usage_limit' => 5,
            'per_user_limit' => 1,
            'total_used_count' => 0,
        ]);

        $creator = app(CreateReservation::class);

        $first = $creator->execute($customer, $this->validReservationPayload(
            $property,
            $roomType,
            overrides: [
                'coupon_code' => 'AUDIT500',
                'points_to_redeem' => 300,
            ],
        ));

        $this->assertSame(ReservationStatus::AwaitingPayment, $first->status);
        $this->assertSame(20000, $first->total_amount_minor);
        $this->assertSame(700, $wallet->fresh()->available_points);
        $this->assertSame(300, $wallet->fresh()->reserved_points);

        try {
            $creator->execute($customer, $this->validReservationPayload(
                $property,
                $roomType,
                overrides: [
                    'coupon_code' => 'AUDIT500',
                ],
            ));
            $this->fail('Expected second checkout to reject held coupon code.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('coupon_code', $e->errors());
        }

        $this->assertSame(300, $wallet->fresh()->reserved_points);

        $lifecycle = app(ReservationLifecycle::class);
        $lifecycle->cancel($customer, $first, 'Changing stay dates');

        $this->assertSame(1000, $wallet->fresh()->available_points);
        $this->assertSame(0, $wallet->fresh()->reserved_points);

        $zeroPayable = $creator->execute($customer, $this->validReservationPayload(
            $property,
            $roomType,
            overrides: [
                'coupon_code' => 'AUDIT500',
                'points_to_redeem' => 500,
            ],
        ));

        $this->assertSame(ReservationStatus::Confirmed, $zeroPayable->status);
        $this->assertSame(0, $zeroPayable->total_amount_minor);
        $this->assertSame(500, $wallet->fresh()->available_points);
        $this->assertSame(1, $coupon->fresh()->total_used_count);

        $lifecycle->cancel($customer, $zeroPayable, 'Plans changed');

        $this->assertSame(ReservationStatus::Cancelled, $zeroPayable->fresh()->status);
        $this->assertSame(1000, $wallet->fresh()->available_points);
        $this->assertSame(0, $coupon->fresh()->total_used_count);
    }

    public function test_public_contact_form_and_web_checkout_promotion_quote_validate_and_respond(): void
    {
        $this->post(route('public.contact.store'), [])
            ->assertSessionHasErrors(['name', 'email', 'mobile', 'subject', 'message']);

        $this->post(route('public.contact.store'), [
            'name' => 'Asha Reddy',
            'email' => 'asha@example.com',
            'mobile' => '9876543210',
            'subject' => 'booking',
            'message' => 'I have a question about monthly hostel booking check-in timings.',
        ])->assertRedirect()
            ->assertSessionHas('status');

        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $customer = $this->createCustomerUser();

        $campaign = PromotionalCampaign::query()->create([
            'campaign_reference' => 'CMP-QUOTE-'.strtoupper(Str::random(6)),
            'name' => 'Quote Promo',
            'slug' => 'quote-promo-'.strtolower(Str::random(6)),
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDays(10),
        ]);

        CouponCode::query()->create([
            'campaign_id' => $campaign->id,
            'code' => 'VALID200',
            'description' => 'Flat ₹200 off',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 20000,
            'funding_source' => CouponFundingSource::Platform,
            'min_booking_amount_minor' => 50000,
            'is_active' => true,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(10),
            'total_usage_limit' => 10,
            'per_user_limit' => 1,
            'total_used_count' => 0,
        ]);

        $this->actingAs($customer, 'web')
            ->postJson(route('reservations.quote-promotions'), [
                'property_id' => $property->id,
                'booking_amount_minor' => 100000,
                'stay_days' => 2,
                'coupon_code' => 'TIJUM10',
                'points_to_redeem' => 0,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('valid', false);

        $this->actingAs($customer, 'web')
            ->postJson(route('reservations.quote-promotions'), [
                'property_id' => $property->id,
                'booking_amount_minor' => 100000,
                'stay_days' => 2,
                'coupon_code' => 'VALID200',
                'points_to_redeem' => 0,
            ])
            ->assertOk()
            ->assertJsonPath('valid', true)
            ->assertJsonPath('coupon_code', 'VALID200')
            ->assertJsonPath('coupon_discount_minor', 20000)
            ->assertJsonPath('final_payable_minor', 80000);
    }

    public function test_public_content_api_and_blog_hide_future_scheduled_and_inactive_records(): void
    {
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->create();

        ContentPage::query()->create([
            'slug' => 'future-launch-guide',
            'title' => 'Future Launch Guide',
            'internal_name' => 'Future Launch Guide',
            'summary' => 'Scheduled for next week',
            'content_blocks' => [],
            'status' => ContentStatus::Published,
            'published_at' => now()->addDays(5),
            'author_admin_id' => $admin->id,
            'robots_directive' => 'index, follow',
        ]);

        ContentPage::query()->create([
            'slug' => 'live-stay-guide',
            'title' => 'Live Stay Guide',
            'internal_name' => 'Live Stay Guide',
            'summary' => 'Published yesterday',
            'content_blocks' => [],
            'status' => ContentStatus::Published,
            'published_at' => now()->subDay(),
            'author_admin_id' => $admin->id,
            'robots_directive' => 'index, follow',
        ]);

        $inactiveCategory = BlogCategory::query()->create([
            'name' => 'Archived Notes',
            'slug' => 'archived-notes',
            'is_active' => false,
            'display_order' => 10,
        ]);

        $activeCategory = BlogCategory::query()->create([
            'name' => 'Student Living',
            'slug' => 'student-living',
            'is_active' => true,
            'display_order' => 1,
        ]);

        BlogArticle::query()->create([
            'title' => 'Future Scheduled Article',
            'slug' => 'future-scheduled-article',
            'excerpt' => 'Coming soon',
            'content' => '<p>Future content</p>',
            'category_id' => $activeCategory->id,
            'reading_time_minutes' => 2,
            'status' => ContentStatus::Published,
            'published_at' => now()->addDays(3),
            'admin_id' => $admin->id,
        ]);

        BlogArticle::query()->create([
            'title' => 'Published Living Article',
            'slug' => 'published-living-article',
            'excerpt' => 'Live guide',
            'content' => '<p>Live content</p>',
            'category_id' => $activeCategory->id,
            'reading_time_minutes' => 3,
            'status' => ContentStatus::Published,
            'published_at' => now()->subDay(),
            'admin_id' => $admin->id,
        ]);

        $this->getJson('/api/v1/public/pages/future-launch-guide')->assertNotFound();
        $this->getJson('/api/v1/public/pages/live-stay-guide')
            ->assertOk()
            ->assertJsonPath('data.slug', 'live-stay-guide');

        $this->getJson('/api/v1/public/blog/future-scheduled-article')->assertNotFound();
        $this->getJson('/api/v1/public/blog/published-living-article')
            ->assertOk()
            ->assertJsonPath('data.slug', 'published-living-article');

        $this->get(route('public.blog.category', ['category' => $inactiveCategory->slug]))->assertNotFound();
        $this->get(route('public.blog.category', ['category' => $activeCategory->slug]))->assertOk();

        PlatformSetting::set('general.support_email', 'desk@tijum.example', 'general');
        PlatformSetting::set('general.support_phone', '9123456789', 'general');

        $this->postJson('/api/v1/public/contact', [
            'name' => 'Ravi Kumar',
            'email' => 'ravi@example.com',
            'mobile' => '9876543210',
            'subject' => 'partner',
            'message' => 'Want to onboard our co-living residence.',
        ])->assertOk()
            ->assertJsonPath('data.subject_label', 'List a Hostel/PG, Homestay, or Co-Living')
            ->assertJsonPath('data.channels.support_email', 'desk@tijum.example')
            ->assertJsonPath('data.channels.whatsapp_desk', '9123456789');
    }

    public function test_whatsapp_webhook_without_timestamp_and_malformed_canonical_page_query_do_not_crash(): void
    {
        $customer = $this->createCustomerUser();

        $delivery = NotificationDelivery::query()->create([
            'event_id' => 'evt-wa-audit-1',
            'idempotency_key' => 'idem-wa-audit-1',
            'notifiable_type' => User::class,
            'notifiable_id' => $customer->id,
            'channel' => NotificationChannel::WhatsApp,
            'category' => NotificationCategory::EssentialTransactional,
            'template_code' => 'booking.confirmed',
            'recipient_destination' => '+919876543210',
            'status' => NotificationDeliveryStatus::Sending,
            'provider' => 'meta_whatsapp',
            'provider_message_id' => 'wamid.audit.notimestamp',
            'attempts' => 1,
            'payload' => [],
        ]);

        $payload = [
            'entry' => [[
                'changes' => [[
                    'value' => [
                        'statuses' => [[
                            'id' => 'wamid.audit.notimestamp',
                            'status' => 'delivered',
                        ]],
                    ],
                ]],
            ]],
        ];

        $result = app(WebhookProcessingService::class)->processWhatsAppWebhook(
            $payload,
            json_encode($payload, JSON_THROW_ON_ERROR),
            null,
        );

        $this->assertTrue($result['success']);
        $this->assertSame(NotificationDeliveryStatus::Delivered, $delivery->fresh()->status);
        $this->assertNotNull($delivery->fresh()->delivered_at);

        $canonical = app(SeoService::class)->cleanCanonicalUrl('https://tijum.com/search?page[]=1&utm_source=test&city=hyderabad');
        $this->assertStringContainsString('city=hyderabad', $canonical);
        $this->assertStringNotContainsString('utm_source', $canonical);
    }

    public function test_admin_protection_case_attachment_download_is_authorized_and_scoped(): void
    {
        Storage::fake('local');

        $admin = Admin::factory()->role(AdminRole::CustomerSupport)->withTwoFactor()->create();
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $customer = $this->createCustomerUser();
        $reservation = $this->createBasicReservation($customer, $property, $roomType, ReservationStatus::Confirmed);

        $caseA = CustomerProtectionCase::query()->create([
            'case_reference' => 'CASE-ADMA-'.strtoupper(Str::random(6)),
            'reservation_id' => $reservation->id,
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'owner_id' => $owner->id,
            'category' => CaseCategory::FoodNotProvided,
            'priority' => CasePriority::High,
            'status' => CaseStatus::Open,
            'description' => 'Case A attachment test.',
            'sla_due_at' => now()->addDays(5),
        ]);

        $caseB = CustomerProtectionCase::query()->create([
            'case_reference' => 'CASE-ADMB-'.strtoupper(Str::random(6)),
            'reservation_id' => $reservation->id,
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'owner_id' => $owner->id,
            'category' => CaseCategory::CustomerOther,
            'priority' => CasePriority::Low,
            'status' => CaseStatus::Open,
            'description' => 'Case B isolation test.',
            'sla_due_at' => now()->addDays(5),
        ]);

        $diskName = (string) config('tijum.customer_protection.attachments.disk', 'local');
        $storedPath = 'protection-cases/attachments/admin-evidence-check.pdf';
        Storage::disk($diskName)->put($storedPath, '%PDF-1.4 test evidence');

        $message = CustomerProtectionCaseMessage::query()->create([
            'customer_protection_case_id' => $caseA->id,
            'sender_type' => 'customer',
            'sender_id' => $customer->id,
            'sender_name' => $customer->name,
            'message' => 'Internal review evidence attached.',
            'attachment_path' => $storedPath,
            'attachment_name' => 'admin-evidence-check.pdf',
            'is_internal_note' => true,
        ]);

        $expectedUrl = route('admin.customer-cases.messages.attachment', [
            'case' => $caseA->case_reference,
            'message' => $message->id,
        ]);

        $this->actingAs($admin, 'admin')
            ->get(route('admin.customer-cases.show', $caseA->case_reference))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/cases/show')
                ->where('messages.0.attachment_url', $expectedUrl)
                ->missing('messages.0.attachment_path')
            );

        $downloadResponse = $this->actingAs($admin, 'admin')
            ->get($expectedUrl);

        $downloadResponse->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->actingAs($admin, 'admin')
            ->get(route('admin.customer-cases.messages.attachment', [
                'case' => $caseB->case_reference,
                'message' => $message->id,
            ]))
            ->assertNotFound();
    }

    public function test_cms_block_sanitizer_preserves_canonical_and_legacy_block_fields(): void
    {
        $sanitizer = app(ContentBlockSanitizer::class);

        $cleaned = $sanitizer->sanitizeBlocks([
            [
                'type' => 'hero',
                'data' => [
                    'headline' => 'Verified Stays Guide',
                    'subheadline' => 'Daily meal clarity across cities',
                    'cta_text' => 'Browse Stays',
                    'cta_url' => 'javascript:alert(1)',
                ],
            ],
            [
                'type' => 'text',
                'data' => [
                    'heading' => 'House Standards',
                    'body' => '<p>Safe summary</p><script>alert(1)</script>',
                ],
            ],
            [
                'type' => 'benefits',
                'data' => [
                    'title' => 'Resident Advantages',
                    'items' => [
                        ['title' => 'Meals', 'description' => 'Breakfast, lunch & dinner', 'badge' => 'Verified'],
                    ],
                ],
            ],
            [
                'type' => 'cta',
                'data' => [
                    'heading' => 'Book With Confidence',
                    'description' => 'Transparent tariff breakdown',
                    'button_label' => 'Search Stays',
                    'button_url' => '/search',
                ],
            ],
        ]);

        $this->assertSame('Verified Stays Guide', $cleaned[0]['data']['title']);
        $this->assertSame('Daily meal clarity across cities', $cleaned[0]['data']['subtitle']);
        $this->assertSame('#', $cleaned[0]['data']['cta_url']);
        $this->assertSame('House Standards', $cleaned[1]['data']['heading']);
        $this->assertStringNotContainsString('<script>', $cleaned[1]['data']['body']);
        $this->assertSame('Resident Advantages', $cleaned[2]['data']['heading']);
        $this->assertSame('Book With Confidence', $cleaned[3]['data']['heading']);
        $this->assertSame('Search Stays', $cleaned[3]['data']['button_text']);
    }

    public function test_canonical_city_redirect_no_store_headers_and_contact_api_rate_limiting(): void
    {
        RateLimiter::clear('contact');

        $this->get('/pgs-in-hyderabad')
            ->assertStatus(301)
            ->assertRedirect(route('public.cities.stays', ['citySlug' => 'hyderabad']));

        $loginResponse = $this->postJson('/api/v1/auth/customer/login', [
            'login' => 'nonexistent@example.com',
            'password' => 'WrongPassword123!',
            'device_name' => 'qa-test',
        ]);
        $this->assertStringContainsString('no-store', (string) $loginResponse->headers->get('Cache-Control'));

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/public/contact', [
                'name' => 'Rate Check',
                'email' => "ratecheck{$i}@example.com",
                'mobile' => '9876543210',
                'subject' => 'booking',
                'message' => 'Testing API contact rate limit cleanly.',
            ])->assertOk();
        }

        $this->postJson('/api/v1/public/contact', [
            'name' => 'Rate Check',
            'email' => 'ratecheck6@example.com',
            'mobile' => '9876543210',
            'subject' => 'booking',
            'message' => 'Sixth attempt should trigger 429 throttle.',
        ])->assertStatus(429);
    }

    private function createBasicReservation(
        User $customer,
        Property $property,
        PropertyRoomType $roomType,
        ReservationStatus $status,
    ): Reservation {
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(2);
        $checkOut = $checkIn->addDays(2);

        return Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'AUD-'.strtoupper(Str::random(8)),
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => $status,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 2,
            'duration_type' => 'daily',
            'duration_quantity' => 2,
            'quantity' => 1,
            'quantity_basis' => ReservationQuantityBasis::GuestPlaces->value,
            'rate_unit' => ReservationRateUnit::PerGuest->value,
            'guest_count' => 1,
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => $customer->name,
            'contact_email' => $customer->email,
            'contact_phone' => '+919999999999',
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'total_amount_minor' => 200000,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => 'Hostels/PG',
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => true,
            'snapshot_food_provided' => true,
            'snapshot_breakfast_included' => true,
            'snapshot_lunch_included' => true,
            'snapshot_dinner_included' => true,
            'submitted_at' => now(),
            'confirmed_at' => $status === ReservationStatus::Confirmed ? now() : null,
            'payment_deadline_at' => $status === ReservationStatus::AwaitingPayment ? now()->addMinutes(15) : null,
        ]);
    }
}
