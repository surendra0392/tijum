<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\BannerPlacement;
use App\Enums\BannerStatus;
use App\Enums\CampaignStatus;
use App\Enums\ContentStatus;
use App\Models\Admin;
use App\Models\BlogArticle;
use App\Models\BlogCategory;
use App\Models\BlogTag;
use App\Models\ContentAuthor;
use App\Models\ContentFaq;
use App\Models\ContentPage;
use App\Models\MarketingBanner;
use App\Models\MarketingCampaign;
use App\Models\SeoSetting;
use Illuminate\Database\Seeder;

class Phase19ContentSeeder extends Seeder
{
    public function run(): void
    {
        $admin = Admin::query()->first();
        $adminId = $admin?->id;

        // 1. Global SEO Settings
        SeoSetting::current();

        // 2. Authors
        $aditya = ContentAuthor::query()->firstOrCreate(
            ['slug' => 'aditya-varma'],
            [
                'name' => 'Aditya Varma',
                'designation' => 'Accommodation & Community Lead',
                'bio' => 'Aditya oversees community operations and student hospitality at TIJUM, helping young professionals find safe, food-inclusive stays.',
                'avatar_url' => '/images/public/partner-hospitality.jpg',
                'is_active' => true,
            ]
        );

        $priya = ContentAuthor::query()->firstOrCreate(
            ['slug' => 'priya-sharma'],
            [
                'name' => 'Priya Sharma',
                'designation' => 'Student Living Editor',
                'bio' => 'Priya writes about affordable living, student wellness, and stress-free relocation across South India.',
                'avatar_url' => '/images/public/hero-stay.jpg',
                'is_active' => true,
            ]
        );

        // 3. Categories & Tags
        $catFood = BlogCategory::query()->firstOrCreate(['slug' => 'food-nutrition'], [
            'name' => 'Food & Nutrition',
            'description' => 'Nutritious homestyle meals, hostel food quality, and dining in food-inclusive stays.',
            'display_order' => 1,
            'is_active' => true,
        ]);

        $catLiving = BlogCategory::query()->firstOrCreate(['slug' => 'hostel-living'], [
            'name' => 'Hostel Living',
            'description' => 'Tips, hacks, and etiquette for comfortable PG and hostel living.',
            'display_order' => 2,
            'is_active' => true,
        ]);

        $catRelocation = BlogCategory::query()->firstOrCreate(['slug' => 'city-relocation'], [
            'name' => 'City Relocation',
            'description' => 'Local neighborhood insights, transit advice, and shifting guides for Hyderabad, Guntur, Vijayawada, and Visakhapatnam.',
            'display_order' => 3,
            'is_active' => true,
        ]);

        $tagFood = BlogTag::query()->firstOrCreate(['slug' => 'meals-included'], ['name' => 'Meals Included']);
        $tagBudget = BlogTag::query()->firstOrCreate(['slug' => 'budget-friendly'], ['name' => 'Budget Friendly']);
        $tagHyd = BlogTag::query()->firstOrCreate(['slug' => 'hyderabad'], ['name' => 'Hyderabad']);
        $tagGuntur = BlogTag::query()->firstOrCreate(['slug' => 'guntur'], ['name' => 'Guntur']);

        // 4. Baseline Published Blog Articles
        if (! BlogArticle::query()->where('slug', 'why-food-inclusive-hostels-are-saving-students-thousands')->exists()) {
            $art1 = BlogArticle::query()->create([
                'title' => 'Why Food-Inclusive Hostels Are Saving Students Thousands Every Month',
                'slug' => 'why-food-inclusive-hostels-are-saving-students-thousands',
                'excerpt' => 'Managing college coursework while organizing three daily meals can drain your budget and energy. Here is why food-inclusive accommodations are revolutionizing student living.',
                'content' => '<p>For thousands of students moving to major educational hubs like Hyderabad or Guntur, accommodation is only half the battle. The true, hidden drain on a student budget is food: daily takeaway charges, unreliable tiffin boxes, and the unpredictable costs of dining out.</p><h3>The Unseen Cost of Separate Meal Services</h3><p>A typical student paying Rs. 7,000 for rent often ends up spending another Rs. 5,000 to Rs. 7,000 on meals and grocery runs. At TIJUM, we bundle fresh breakfast, lunch, and dinner directly into the accommodation rate. That means zero separate food bills, no surprise end-of-month grocery crunches, and guaranteed hot meals every single day.</p><h3>Focus on Studies, Not Cooking</h3><p>When you arrive home from intensive coaching or university lectures, having hot, hygienic South Indian meals waiting for you restores your focus. TIJUM partner properties undergo regular hygiene reviews to maintain quality dining standards.</p>',
                'featured_image' => '/images/public/food-dining.jpg',
                'author_id' => $aditya->id,
                'category_id' => $catFood->id,
                'reading_time_minutes' => 4,
                'status' => ContentStatus::Published,
                'published_at' => now()->subDays(5),
                'admin_id' => $adminId,
                'seo_title' => 'Why Food-Inclusive Hostels Save Students Money | TIJUM',
                'seo_description' => 'Discover how food-inclusive hostel stays cut living expenses and eliminate daily meal stress for students in Hyderabad, Guntur, and Vijayawada.',
            ]);
            $art1->tags()->sync([$tagFood->id, $tagBudget->id]);
        }

        if (! BlogArticle::query()->where('slug', 'complete-guide-to-finding-pgs-in-guntur-coaching-hub')->exists()) {
            $art2 = BlogArticle::query()->create([
                'title' => 'A Complete Guide to Finding Student PGs in Guntur’s Coaching Hub',
                'slug' => 'complete-guide-to-finding-pgs-in-guntur-coaching-hub',
                'excerpt' => 'Moving to Guntur for medical or engineering coaching? Explore the best neighborhoods, transit tips, and food-inclusive accommodation options in Brodipet and Arundalpet.',
                'content' => '<p>Guntur has long been recognized as Andhra Pradesh’s top destination for medical entrance and engineering coaching. Thousands of aspirants land in Arundalpet and Brodipet every academic year searching for comfortable rooms with reliable amenities.</p><h3>Top Neighborhoods for Students in Guntur</h3><ul><li><strong>Arundalpet:</strong> Centrally positioned with libraries, coaching academies, and quiet study streets.</li><li><strong>Brodipet:</strong> Bustling with student stationery stores, study halls, and quick transit connectivity.</li><li><strong>Lakshmipuram:</strong> A peaceful residential quarter ideal for long-term aspirants requiring distraction-free environments.</li></ul><h3>What to Look For in a Guntur Stay</h3><p>Ensure your chosen accommodation provides high-speed Wi-Fi, power backup for study lamps, and hot homestyle Andhra meals. TIJUM’s verified booking platform lets you review room sharing, AC options, and meal schedules before paying a single rupee.</p>',
                'featured_image' => '/images/public/city-guntur.jpg',
                'author_id' => $priya->id,
                'category_id' => $catRelocation->id,
                'reading_time_minutes' => 5,
                'status' => ContentStatus::Published,
                'published_at' => now()->subDays(2),
                'admin_id' => $adminId,
                'seo_title' => 'Student PG Guide in Guntur Coaching Belt | TIJUM',
                'seo_description' => 'Essential tips for students moving to Guntur for coaching academies. Compare neighborhood amenities, food quality, and verified stays.',
            ]);
            $art2->tags()->sync([$tagGuntur->id, $tagBudget->id]);
        }

        // 5. Baseline CMS Pages
        $aboutBlocks = [
            [
                'type' => 'hero',
                'data' => [
                    'badge' => 'Welcome to TIJUM',
                    'title' => 'Stay easy. Eat well. Spend less.',
                    'subtitle' => 'The dedicated marketplace for Hostels/PG, Homestays, and Co-Living spaces with property-specific food flags across South India.',
                    'cta_text' => 'Explore Stays',
                    'cta_url' => '/search',
                    'background_image' => '/images/public/og-tijum-cover.jpg',
                ],
            ],
            [
                'type' => 'text',
                'data' => [
                    'heading' => 'Our Core Mission',
                    'body' => '<p>TIJUM was founded on a simple observation: finding good accommodation in Indian cities is stressful enough, but finding healthy, transparent food options is even harder. Traditional listings hide extra meal charges or leave guests guessing about dining arrangements.</p><p>We changed the equation. Every bookable room on TIJUM features transparent property-specific food flags. We partner directly with verified independent Hostels/PG, Homestays, and Co-Living operators across Hyderabad, Vijayawada, Guntur, and Visakhapatnam to deliver transparent pricing and verified customer protection.</p>',
                ],
            ],
            [
                'type' => 'benefits',
                'data' => [
                    'heading' => 'Why Guests Love TIJUM',
                    'items' => [
                        ['title' => 'Property-Specific Food Flags', 'description' => 'See exactly which meals (Breakfast, Lunch, Dinner) are included in every stay without surprise fees.', 'badge' => 'Food Flags'],
                        ['title' => 'Verified Accommodation Categories', 'description' => 'Compare Hostels/PG, Homestays, and Co-Living spaces with verified amenities and genuine pricing.', 'badge' => '3 Canonical Categories'],
                        ['title' => 'Customer Protection', 'description' => 'Fair relocation assistance and prompt refund support if room or food fails to meet commitments.', 'badge' => 'Zero Hassle'],
                    ],
                ],
            ],
            [
                'type' => 'cta',
                'data' => [
                    'heading' => 'Ready to find your next home away from home?',
                    'description' => 'Search verified Hostels/PG, Homestays, and Co-Living spaces with property-specific food flags.',
                    'button_text' => 'Find Accommodation',
                    'button_url' => '/search',
                    'secondary_button_text' => 'Partner With Us',
                    'secondary_button_url' => '/become-a-partner',
                ],
            ],
        ];

        if (! ContentPage::query()->where('slug', 'about')->exists()) {
            ContentPage::query()->create([
                'slug' => 'about',
                'title' => 'About TIJUM — Hostels/PG, Homestays & Co-Living Marketplace',
                'internal_name' => 'About Us Main Page',
                'summary' => 'Discover our mission to provide affordable Hostels/PG, Homestays, and Co-Living accommodation with property-specific food flags across Hyderabad, Guntur, Vijayawada, and Visakhapatnam.',
                'content_blocks' => $aboutBlocks,
                'featured_image' => '/images/public/hero-stay.jpg',
                'status' => ContentStatus::Published,
                'published_at' => now(),
                'author_admin_id' => $adminId,
                'seo_title' => 'About TIJUM — Stay Easy. Eat Well. Spend Less.',
                'seo_description' => 'Learn how TIJUM simplifies affordable Hostels/PG, Homestays, and Co-Living accommodation with property-specific food flags.',
            ]);
        }

        // 6. Marketing Campaigns & Banners
        $welcomeCampaign = MarketingCampaign::query()->firstOrCreate(
            ['slug' => 'launch-2026'],
            [
                'name' => 'TIJUM Marketplace Launch Campaign',
                'description' => 'Initial awareness campaign promoting food-inclusive stays in Andhra Pradesh and Telangana launch cities.',
                'objective' => 'awareness',
                'utm_source' => 'tijum_marketing',
                'utm_medium' => 'onsite_banner',
                'utm_campaign' => 'launch-2026',
                'utm_content' => 'hero_strip',
                'target_landing_url' => '/search',
                'status' => CampaignStatus::Active,
                'starts_at' => now()->subDays(10),
                'admin_id' => $adminId,
            ]
        );

        MarketingBanner::query()->firstOrCreate(
            ['name' => 'Food Included Hero Banner'],
            [
                'campaign_id' => $welcomeCampaign->id,
                'headline' => 'Stay easy. Eat well. Spend less.',
                'description' => 'Verified Hostels/PG, Homestays, and Co-Living spaces in Hyderabad, Guntur, Vijayawada, and Vizag with property-specific food flags.',
                'image_url' => '/images/public/hero-meal.png',
                'cta_text' => 'Search Stays',
                'cta_url' => '/search?utm_campaign=launch-2026&utm_medium=onsite_banner',
                'placement' => BannerPlacement::HomepageHero,
                'display_order' => 1,
                'status' => BannerStatus::Active,
                'admin_id' => $adminId,
            ]
        );

        MarketingBanner::query()->firstOrCreate(
            ['name' => 'Zero Broker Fee Strip'],
            [
                'campaign_id' => $welcomeCampaign->id,
                'headline' => '🍲 Property-Specific Food Flags on Every Stay — No Hidden Meal Surprises',
                'description' => 'Hostels/PG, Homestays, and Co-Living spaces with verified breakfast, lunch, and dinner inclusions.',
                'cta_text' => 'View Stays',
                'cta_url' => '/search?utm_campaign=launch-2026&utm_medium=onsite_strip',
                'placement' => BannerPlacement::HomepageStrip,
                'display_order' => 1,
                'status' => BannerStatus::Active,
                'admin_id' => $adminId,
            ]
        );

        // 7. General FAQs
        $faqs = [
            ['question' => 'Is food guaranteed in every accommodation on TIJUM?', 'answer' => 'Search-eligible stays on TIJUM provide food and highlight property-specific food flags. Exact meal inclusions (Breakfast, Lunch, Dinner) are clearly declared on each property card and detail page.'],
            ['question' => 'What accommodation categories are available on TIJUM?', 'answer' => 'TIJUM consolidates accommodation into three canonical categories: Hostels/PG (hostel and paying guest accommodation with room options and meal arrangements shown per property), Homestays (accommodation in residential homes with property details and available services shown per property), and Co-Living (shared-living accommodation with room options and amenities shown per space).'],
            ['question' => 'What are property-specific food flags?', 'answer' => 'Property-specific food flags indicate whether meals are included and identify each offered meal separately (Breakfast, Lunch, Dinner) so you know the exact dining arrangement before booking.'],
            ['question' => 'What are the check-in and checkout timings?', 'answer' => 'Standard check-in is at 09:00 AM and checkout is at 08:00 AM. Early check-in starting at 07:00 AM is available upon host confirmation at zero surcharge.'],
            ['question' => 'How does TIJUM verify customer reviews?', 'answer' => 'Reviews can only be submitted by customers who have completed a paid stay on TIJUM after checkout, earning a Verified Booking badge.'],
            ['question' => 'What happens if the property differs from what was booked?', 'answer' => 'TIJUM Customer Protection provides dedicated problem reporting, alternative accommodation assistance, and refund support under our customer protection policy.'],
        ];

        foreach ($faqs as $idx => $faq) {
            ContentFaq::query()->firstOrCreate(
                ['question' => $faq['question']],
                [
                    'answer' => $faq['answer'],
                    'category' => 'general',
                    'display_order' => $idx + 1,
                    'is_published' => true,
                ]
            );
        }
    }
}
