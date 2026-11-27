<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\BannerStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Models\BlogArticle;
use App\Models\ContentFaq;
use App\Models\ContentPage;
use App\Models\MarketingBanner;
use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicContentController extends ApiController
{
    public function page(string $slug): JsonResponse
    {
        $page = ContentPage::query()
            ->published()
            ->where('slug', $slug)
            ->first();

        if ($page === null) {
            return $this->error("Page '{$slug}' not found.", 'PAGE_NOT_FOUND', 404);
        }

        return $this->success([
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'excerpt' => $page->summary,
            'featured_image_url' => $page->featured_image,
            'content_blocks' => $page->content_blocks,
            'published_at' => $page->published_at?->toIso8601String(),
        ]);
    }

    public function blogIndex(): JsonResponse
    {
        $articles = BlogArticle::query()
            ->published()
            ->with(['author', 'category'])
            ->latest('published_at')
            ->paginate(10);

        return $this->success(
            $articles->items(),
            'Blog articles retrieved',
            200,
            [
                'current_page' => $articles->currentPage(),
                'last_page' => $articles->lastPage(),
                'total' => $articles->total(),
            ]
        );
    }

    public function blogShow(string $slug): JsonResponse
    {
        $article = BlogArticle::query()
            ->published()
            ->where('slug', $slug)
            ->with(['author', 'category'])
            ->first();

        if ($article === null) {
            return $this->error("Article '{$slug}' not found.", 'ARTICLE_NOT_FOUND', 404);
        }

        return $this->success([
            'id' => $article->id,
            'title' => $article->title,
            'slug' => $article->slug,
            'excerpt' => $article->excerpt,
            'content' => $article->content,
            'cover_image_url' => $article->featured_image,
            'reading_time_minutes' => (int) $article->reading_time_minutes,
            'author' => $article->author ? ['name' => $article->author->name] : null,
            'category' => $article->category ? ['name' => $article->category->name] : null,
            'published_at' => $article->published_at?->toIso8601String(),
        ]);
    }

    public function faqs(): JsonResponse
    {
        $faqs = ContentFaq::query()
            ->where('is_published', true)
            ->orderBy('display_order')
            ->get(['id', 'question', 'answer', 'category', 'display_order']);

        return $this->success($faqs);
    }

    public function banners(): JsonResponse
    {
        $banners = MarketingBanner::query()
            ->where('status', BannerStatus::Active)
            ->orderBy('display_order')
            ->get();

        return $this->success($banners);
    }

    public function contact(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'mobile' => ['required', 'string', 'regex:/^[+0-9\s\-()]{10,20}$/'],
            'subject' => ['required', 'string', 'in:booking,partner,general'],
            'message' => ['required', 'string', 'max:3000'],
        ]);

        $subjectLabels = [
            'booking' => 'Stay / Booking Assistance',
            'partner' => 'List a Hostel/PG, Homestay, or Co-Living',
            'general' => 'General Inquiry or Feedback',
        ];

        $supportEmail = trim((string) PlatformSetting::get('general.support_email', ''))
            ?: (string) config('tijum.contact.email', 'support@tijum.com');
        $whatsappDesk = trim((string) PlatformSetting::get('general.support_phone', ''))
            ?: (string) config('tijum.contact.whatsapp', '8142334033');
        $whatsappDigits = preg_replace('/\D+/', '', $whatsappDesk);
        $whatsappRaw = (is_string($whatsappDigits) && $whatsappDigits !== '')
            ? (strlen($whatsappDigits) === 10 ? '91'.$whatsappDigits : $whatsappDigits)
            : (string) config('tijum.contact.whatsapp_raw', '918142334033');

        $whatsappText = urlencode(
            "Hi TIJUM Support,\n"
            ."Name: {$validated['name']}\n"
            ."Subject: {$subjectLabels[$validated['subject']]}\n"
            ."Mobile: {$validated['mobile']}\n"
            ."Email: {$validated['email']}\n"
            ."Message: {$validated['message']}"
        );

        $whatsappUrl = "https://wa.me/{$whatsappRaw}?text={$whatsappText}";

        return $this->success([
            'status' => 'received',
            'subject' => $validated['subject'],
            'subject_label' => $subjectLabels[$validated['subject']],
            'whatsapp_url' => $whatsappUrl,
            'channels' => [
                'support_email' => $supportEmail,
                'whatsapp_desk' => $whatsappDesk,
            ],
        ], 'Thank you for reaching out! Our team will contact you shortly.');
    }
}
