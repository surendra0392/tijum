<?php

declare(strict_types=1);

namespace Tests\Feature\SeoAndMarketing;

use App\Enums\ContentStatus;
use App\Models\Admin;
use App\Models\BlogArticle;
use App\Models\BlogCategory;
use App\Models\ContentAuthor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BlogPlatformTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_article_and_reading_time_is_automatically_calculated(): void
    {
        $admin = Admin::factory()->withTwoFactor()->create();
        $author = ContentAuthor::query()->create([
            'name' => 'Aditya Varma',
            'slug' => 'aditya-varma',
            'is_active' => true,
        ]);
        $category = BlogCategory::query()->create([
            'name' => 'Student Living',
            'slug' => 'student-living',
            'is_active' => true,
        ]);

        $longContent = str_repeat('South Indian food inclusive accommodation provides daily breakfast, lunch, and dinner. ', 40); // ~440 words -> 3 min read

        $response = $this->actingAs($admin, 'admin')->post(route('admin.content.blog.store'), [
            'title' => 'The Complete Hyderabad Student Living Guide',
            'slug' => 'complete-hyderabad-student-guide',
            'excerpt' => 'Practical advice for moving to Hyderabad for education.',
            'content' => $longContent,
            'author_id' => $author->id,
            'category_id' => $category->id,
            'status' => ContentStatus::Published->value,
            'tags' => ['Hyderabad', 'Students', 'Food'],
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('blog_articles', [
            'slug' => 'complete-hyderabad-student-guide',
            'status' => 'published',
        ]);

        $article = BlogArticle::query()->where('slug', 'complete-hyderabad-student-guide')->first();
        $this->assertNotNull($article);
        $this->assertGreaterThanOrEqual(2, $article->reading_time_minutes);
        $this->assertCount(3, $article->tags);
    }

    public function test_blog_index_displays_published_articles_and_filters_by_category(): void
    {
        $author = ContentAuthor::query()->create([
            'name' => 'Priya Sharma',
            'slug' => 'priya-sharma',
            'is_active' => true,
        ]);

        $category1 = BlogCategory::query()->create([
            'name' => 'Food Standards',
            'slug' => 'food-standards',
            'is_active' => true,
        ]);

        $category2 = BlogCategory::query()->create([
            'name' => 'Living Costs',
            'slug' => 'living-costs',
            'is_active' => true,
        ]);

        $article1 = BlogArticle::query()->create([
            'title' => 'Article One Food',
            'slug' => 'article-one-food',
            'excerpt' => 'Food details',
            'content' => '<p>Content</p>',
            'author_id' => $author->id,
            'category_id' => $category1->id,
            'status' => ContentStatus::Published,
            'published_at' => now(),
        ]);

        $article2 = BlogArticle::query()->create([
            'title' => 'Article Two Costs',
            'slug' => 'article-two-costs',
            'excerpt' => 'Costs details',
            'content' => '<p>Content</p>',
            'author_id' => $author->id,
            'category_id' => $category2->id,
            'status' => ContentStatus::Published,
            'published_at' => now(),
        ]);

        // General index
        $response = $this->get(route('public.blog.index'));
        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/blog/index')
                ->has('articles.data', 2)
            );

        // Filter by category 1
        $responseCat = $this->get(route('public.blog.category', $category1->slug));
        $responseCat->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/blog/index')
                ->has('articles.data', 1)
                ->where('articles.data.0.id', $article1->id)
            );
    }

    public function test_draft_articles_are_not_publicly_visible(): void
    {
        $author = ContentAuthor::query()->create([
            'name' => 'Secret Author',
            'slug' => 'secret-author',
            'is_active' => true,
        ]);

        $draft = BlogArticle::query()->create([
            'title' => 'Unpublished Secret Article',
            'slug' => 'unpublished-secret-article',
            'excerpt' => 'Draft excerpt',
            'content' => '<p>Draft body</p>',
            'author_id' => $author->id,
            'status' => ContentStatus::Draft,
        ]);

        $response = $this->get('/blog/unpublished-secret-article');
        $response->assertNotFound();
    }
}
