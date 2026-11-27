<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Enums\CampaignType;
use App\Enums\CouponFundingSource;
use App\Enums\CouponOfferType;
use App\Enums\ReferralStatus;
use App\Models\Admin;
use App\Models\City;
use App\Models\ContentFaq;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerReferral;
use App\Models\PlatformSetting;
use App\Models\PromotionalCampaign;
use App\Models\RewardsSetting;
use App\Models\SeoSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminManagementWiringTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): Admin
    {
        return Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();
    }

    public function test_admin_rewards_overview_points_and_referrals_align_with_ui_contracts(): void
    {
        $admin = $this->superAdmin();
        $customer = User::factory()->create(['email' => 'guest@tijum.test']);
        $referrer = User::factory()->create(['email' => 'referrer@tijum.test']);
        $referredOne = User::factory()->create(['email' => 'friend1@tijum.test']);
        $referredTwo = User::factory()->create(['email' => 'friend2@tijum.test']);

        // 1. Campaign creation records admin guard ID
        $this->actingAs($admin, 'admin')
            ->post(route('admin.rewards.campaigns.store'), [
                'name' => 'Monsoon Welcome',
                'description' => 'Seasonal student offer',
                'type' => CampaignType::Standard->value,
                'code' => 'MONSOON15',
                'offer_type' => CouponOfferType::Percentage->value,
                'discount_percentage' => 15,
                'max_discount_inr' => 500,
                'funding_source' => CouponFundingSource::Platform->value,
                'min_booking_amount_inr' => 1000,
                'min_stay_days' => 1,
                'per_user_limit' => 1,
            ])
            ->assertRedirect(route('admin.rewards.campaigns.index'));

        $campaign = PromotionalCampaign::query()->where('name', 'Monsoon Welcome')->firstOrFail();
        $this->assertSame($admin->id, $campaign->created_by_admin_id);

        // 2. Points engine settings & manual adjustment via UI payload
        $this->actingAs($admin, 'admin')
            ->post(route('admin.rewards.points.settings'), [
                'points_earn_per_hundred_inr' => 8,
                'points_to_inr_multiplier' => 1.5,
                'points_expiry_days' => 180,
                'max_redemption_percent_of_subtotal' => 25,
                'min_points_to_redeem' => 50,
                'referrer_points_per_stay' => 300,
                'referred_points_per_stay' => 200,
            ])
            ->assertRedirect();

        $this->assertSame(800, (int) RewardsSetting::get('points_earning_rate_bps'));
        $this->assertSame(150, (int) RewardsSetting::get('points_redemption_rate_paise'));

        $this->actingAs($admin, 'admin')
            ->post(route('admin.rewards.points.adjust'), [
                'customer_identifier' => 'guest@tijum.test',
                'adjustment_type' => 'manual_credit',
                'points' => 250,
                'audit_reason' => 'Goodwill credit for verified check-in delay',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $entry = CustomerPointsLedger::query()->where('user_id', $customer->id)->firstOrFail();
        $this->assertSame(250, $entry->points);
        $this->assertSame($admin->id, $entry->admin_id);

        // Over-debit returns clean validation error rather than 500
        $this->actingAs($admin, 'admin')
            ->post(route('admin.rewards.points.adjust'), [
                'customer_identifier' => (string) $customer->id,
                'adjustment_type' => 'manual_debit',
                'points' => 9999,
                'audit_reason' => 'Testing over-debit guard',
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('points');

        $this->actingAs($admin, 'admin')
            ->get(route('admin.rewards.points.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/rewards/points/index')
                ->where('config.points_earn_per_hundred_inr', 8)
                ->where('config.points_to_inr_multiplier', 1.5)
                ->has('ledger', 1)
            );

        // 3. Referrals anti-fraud detection + disqualify + clear
        $refOne = CustomerReferral::query()->create([
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $referredOne->id,
            'referral_code_used' => 'REFSHARE1',
            'status' => ReferralStatus::Registered,
            'attribution_ip' => '203.0.113.10',
            'referrer_reward_points' => 300,
            'referred_reward_points' => 200,
        ]);

        CustomerReferral::query()->create([
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $referredTwo->id,
            'referral_code_used' => 'REFSHARE1',
            'status' => ReferralStatus::Registered,
            'attribution_ip' => '203.0.113.10',
            'referrer_reward_points' => 300,
            'referred_reward_points' => 200,
        ]);

        $this->actingAs($admin, 'admin')
            ->get(route('admin.rewards.referrals.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/rewards/referrals/index')
                ->where('kpis.total_invitations', 2)
                ->where('kpis.flagged_cases_count', 2)
                ->has('fraudQueue', 2)
                ->has('referralLedger', 2)
            );

        $this->actingAs($admin, 'admin')
            ->post(route('admin.rewards.referrals.disqualify', $refOne))
            ->assertRedirect();
        $this->assertSame(ReferralStatus::Disqualified, $refOne->fresh()->status);

        $this->actingAs($admin, 'admin')
            ->post(route('admin.rewards.referrals.clear', $refOne))
            ->assertRedirect();
        $this->assertSame(ReferralStatus::Registered, $refOne->fresh()->status);
        $this->assertNull($refOne->fresh()->disqualification_reason);

        // 4. Rewards overview receives aligned dashboard props
        $this->actingAs($admin, 'admin')
            ->get(route('admin.rewards.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/rewards/index')
                ->where('metrics.active_campaigns_count', 1)
                ->where('metrics.active_loyalty_points_outstanding', 250)
                ->where('metrics.referral_fraud_alerts_count', 2)
                ->has('topCampaigns', 1)
                ->where('topCampaigns.0.id', $campaign->id)
                ->where('topCampaigns.0.code', 'MONSOON15')
                ->has('recentAdjustments', 1)
            );
    }

    public function test_admin_faqs_platform_settings_seo_and_cities_propagate_to_public_frontend(): void
    {
        $admin = $this->superAdmin();

        // 1. Admin FAQs -> /faqs (published visible, draft hidden)
        ContentFaq::query()->create([
            'question' => 'Can I switch room sharing mid-month?',
            'answer' => 'Yes, coordinate with the partner desk for prorated room changes.',
            'category' => 'Stay Flexibility',
            'display_order' => 1,
            'is_published' => true,
        ]);

        ContentFaq::query()->create([
            'question' => 'Internal draft FAQ not for guests',
            'answer' => 'Hidden draft content.',
            'category' => 'Stay Flexibility',
            'display_order' => 2,
            'is_published' => false,
        ]);

        $faqResponse = $this->get(route('public.faqs'));
        $faqResponse->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/faqs')
                ->has('cmsFaqGroups', 1)
                ->where('cmsFaqGroups.0.category', 'Stay Flexibility')
                ->where('cmsFaqGroups.0.items.0.question', 'Can I switch room sharing mid-month?')
            )
            ->assertSee('Can I switch room sharing mid-month?', false)
            ->assertDontSee('Internal draft FAQ not for guests', false);

        // 2. Admin Platform Settings (General + Grievance + SEO) -> public pages
        PlatformSetting::set('general.support_email', 'desk@tijum.test', 'general', null, $admin->id, false, true);
        PlatformSetting::set('general.support_phone', '+91 40 1122 3344', 'general', null, $admin->id, false, true);
        PlatformSetting::set('grievance.officer_name', 'Meera Rao', 'grievance', null, $admin->id, false, true);
        PlatformSetting::set('grievance.sla_acknowledgement_hours', 24, 'grievance', null, $admin->id, false, true, 'integer');

        $this->get(route('public.contact'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/contact')
                ->where('contact.email', 'desk@tijum.test')
                ->where('contact.phone', '+91 40 1122 3344')
            );

        $this->get(route('public.grievance-redressal'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/grievance-redressal')
                ->where('grievanceOfficer.name', 'Meera Rao')
                ->where('slas.acknowledgement_hours', 24)
            );

        // 3. SEO settings saved via POST /admin/seo/settings render verification meta tags in SSR HTML
        $this->actingAs($admin, 'admin')
            ->post(route('admin.seo.settings.update'), [
                'site_name' => 'TIJUM',
                'title_template' => '%s | TIJUM',
                'default_meta_description' => 'Food-inclusive stays.',
                'default_og_image' => '/images/public/og-tijum-cover.jpg',
                'default_robots' => 'index, follow',
                'google_site_verification' => 'gsc-verify-token-999',
                'bing_site_verification' => 'bing-verify-token-888',
            ])
            ->assertRedirect();

        $this->assertSame('gsc-verify-token-999', SeoSetting::current()->google_site_verification);

        $this->get(route('home'))
            ->assertOk()
            ->assertSee('name="google-site-verification" content="gsc-verify-token-999"', false)
            ->assertSee('name="msvalidate.01" content="bing-verify-token-888"', false);

        // 4. Admin-added active city appears in shared publicCities and dynamic city landing page
        City::query()->create([
            'name' => 'Tirupati',
            'slug' => 'tirupati',
            'state' => 'Andhra Pradesh',
            'state_code' => 'AP',
            'country_code' => 'IN',
            'sort_order' => 5,
            'is_active' => true,
        ]);

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('publicCities', fn ($cities) => collect($cities)->contains(
                    fn ($c) => ($c['slug'] ?? null) === 'tirupati' && ($c['name'] ?? null) === 'Tirupati',
                ))
            );

        $this->get('/stays-in-tirupati')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/cities/show')
                ->where('city.name', 'Tirupati')
                ->where('editorial.tagline', 'Verified Hostels/PG, Homestays & Co-Living in Tirupati')
            );
    }
}
