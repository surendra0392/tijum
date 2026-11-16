<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\BlogArticle;
use App\Models\BlogCategory;
use App\Services\Seo\SeoService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BlogController extends Controller
{
    public function __construct(
        private readonly SeoService $seoService,
    ) {}

    public function index(Request $request): Response
    {
        $query = BlogArticle::query()
            ->published()
            ->with(['author', 'category', 'tags'])
            ->latest('published_at');

        $searchTerm = $request->query('q');
        if (is_string($searchTerm) && trim($searchTerm) !== '') {
            $term = trim($searchTerm);
            $query->where(static function ($q) use ($term): void {
                $q->where('title', 'like', "%{$term}%")
                    ->orWhere('excerpt', 'like', "%{$term}%");
            });
        }

        $articles = $query->paginate(9)->withQueryString();

        $featured = null;
        if (! $request->has('page') || (int) $request->query('page') === 1) {
            $featured = BlogArticle::query()
                ->published()
                ->with(['author', 'category'])
                ->latest('published_at')
                ->first();
        }

        $categories = BlogCategory::query()
            ->active()
            ->withCount(['articles' => static function ($q): void {
                $q->published();
            }])
            ->get();

        $title = 'Blog & Living Guides | TIJUM';
        $description = 'Essential guides on student accommodation, PG living, food-inclusive hostels, and city relocation in Hyderabad, Guntur, Vijayawada, and Visakhapatnam.';
        $canonical = route('public.blog.index');

        $seo = $this->seoService->buildPayload(
            title: $title,
            description: $description,
            canonical: $canonical,
            structuredData: [
                '@context' => 'https://schema.org',
                '@graph' => [
                    $this->seoService->organizationSchema(),
                    $this->seoService->breadcrumbSchema([
                        ['name' => 'Blog', 'url' => $canonical],
                    ]),
                ],
            ],
        );

        return Inertia::render('public/blog/index', [
            'articles' => $articles,
            'featured' => $featured,
            'categories' => $categories,
            'searchTerm' => $searchTerm,
            'seo' => $seo,
        ]);
    }

    public function show(string $slug): Response
    {
        /** @var BlogArticle $article */
        $article = BlogArticle::query()
            ->published()
            ->where('slug', $slug)
            ->with(['author', 'category', 'tags'])
            ->firstOrFail();

        $article->increment('view_count');

        $related = BlogArticle::query()
            ->published()
            ->where('id', '!=', $article->id)
            ->where('category_id', $article->category_id)
            ->with(['author', 'category'])
            ->latest('published_at')
            ->take(3)
            ->get();

        $canonical = $article->canonical_override ?: route('public.blog.show', ['article' => $article->slug]);
        $title = $article->seo_title ?: $article->title;
        $description = $article->seo_description ?: $article->excerpt;

        $crumbs = [
            ['name' => 'Blog', 'url' => route('public.blog.index')],
        ];
        if ($article->category) {
            $crumbs[] = [
                'name' => $article->category->name,
                'url' => route('public.blog.category', ['category' => $article->category->slug]),
            ];
        }
        $crumbs[] = ['name' => $article->title, 'url' => $canonical];

        $seo = $this->seoService->buildPayload(
            title: $title,
            description: $description,
            canonical: $canonical,
            ogType: 'article',
            ogImage: $article->og_image ?: $article->featured_image,
            structuredData: [
                '@context' => 'https://schema.org',
                '@graph' => [
                    $this->seoService->organizationSchema(),
                    $this->seoService->breadcrumbSchema($crumbs),
                    $this->seoService->articleSchema($article),
                ],
            ],
        );

        return Inertia::render('public/blog/show', [
            'article' => $article,
            'related' => $related,
            'seo' => $seo,
        ]);
    }

    public function category(string $slug): Response
    {
        /** @var BlogCategory $category */
        $category = BlogCategory::query()->where('slug', $slug)->firstOrFail();

        $articles = BlogArticle::query()
            ->published()
            ->where('category_id', $category->id)
            ->with(['author', 'category', 'tags'])
            ->latest('published_at')
            ->paginate(9)
            ->withQueryString();

        $categories = BlogCategory::query()
            ->active()
            ->withCount(['articles' => static function ($q): void {
                $q->published();
            }])
            ->get();

        $canonical = route('public.blog.category', ['category' => $category->slug]);
        $title = $category->seo_title ?: "{$category->name} Articles | TIJUM Blog";
        $description = $category->seo_description ?: ($category->description ?: "Read our latest articles and practical guides on {$category->name} for food-inclusive accommodation.");

        $crumbs = [
            ['name' => 'Blog', 'url' => route('public.blog.index')],
            ['name' => $category->name, 'url' => $canonical],
        ];

        $seo = $this->seoService->buildPayload(
            title: $title,
            description: $description,
            canonical: $canonical,
            structuredData: [
                '@context' => 'https://schema.org',
                '@graph' => [
                    $this->seoService->organizationSchema(),
                    $this->seoService->breadcrumbSchema($crumbs),
                ],
            ],
        );

        return Inertia::render('public/blog/index', [
            'articles' => $articles,
            'currentCategory' => $category,
            'categories' => $categories,
            'seo' => $seo,
        ]);
    }
}
