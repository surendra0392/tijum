import { Link, router } from '@inertiajs/react';
import { ArrowRight, BookOpen, Clock, Search, User } from 'lucide-react';
import { useState } from 'react';
import { PublicPageHero } from '@/components/public/public-page-hero';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { Pagination, type PaginationLink } from '@/components/shared/pagination';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    isGenericPublicPlaceholder,
    resolveLegacyPublicImage,
} from '@/lib/public-images';
import {
    category as blogCategory,
    index as blogIndex,
    show as blogShow,
} from '@/routes/public/blog';
import { subscribe } from '@/routes/public/newsletter';
import type { SeoMetadata } from '@/types';
import type { BlogArticle, BlogCategory } from '@/types/cms';

interface Props {
    articles: {
        data: BlogArticle[];
        current_page: number;
        last_page: number;
        total: number;
        links?: PaginationLink[];
    };
    featured?: BlogArticle | null;
    categories: BlogCategory[];
    currentCategory?: BlogCategory | null;
    searchTerm?: string | null;
    seo?: SeoMetadata;
}

export default function BlogIndex({
    articles,
    featured,
    categories,
    currentCategory = null,
    searchTerm,
    seo,
}: Props) {
    const [search, setSearch] = useState(searchTerm || '');
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [subscribing, setSubscribing] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(blogIndex.url(), search ? { q: search } : {}, {
            preserveState: true,
        });
    };

    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle="TIJUM Insights & Guides | Student and Professional Living"
                fallbackDescription="Explore guides on living costs, meal arrangements, and accommodation across Hyderabad, Guntur, Vijayawada, and Visakhapatnam."
            />

            <PublicPageHero
                eyebrow="TIJUM Editorial & Guides"
                title="Stay easy. Eat well. Spend less."
                description="Practical guides to hostel and PG living, meal arrangements, neighbourhoods, and city moves for students and working professionals."
                breadcrumbs={[
                    { label: 'Living Guides', href: blogIndex.url() },
                    ...(currentCategory
                        ? [
                              {
                                  label: currentCategory.name,
                                  current: true,
                              },
                          ]
                        : []),
                ]}
                badges={<Badge variant="peach">Marketplace Editorial</Badge>}
            >
                <div className="flex flex-col justify-between gap-4 border-t border-tijum-surface pt-6 md:flex-row md:items-center">
                    <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0">
                        <Link
                            href={blogIndex()}
                            aria-current={
                                !currentCategory && !searchTerm
                                    ? 'page'
                                    : undefined
                            }
                            className={`inline-flex min-h-10 items-center rounded-full px-4 font-heading text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none ${
                                !currentCategory && !searchTerm
                                    ? 'bg-tijum-plum text-tijum-cream'
                                    : 'border border-tijum-surface bg-white text-tijum-plum hover:border-tijum-peach hover:bg-tijum-peach/20'
                            }`}
                        >
                            All Stories
                            {!currentCategory && !searchTerm
                                ? ` (${articles.total})`
                                : ''}
                        </Link>
                        {categories.map((cat) => {
                            const isCategoryActive =
                                currentCategory?.id === cat.id;

                            return (
                                <Link
                                    key={cat.id}
                                    href={blogCategory(cat.slug)}
                                    aria-current={
                                        isCategoryActive ? 'page' : undefined
                                    }
                                    className={`inline-flex min-h-10 items-center rounded-full px-4 font-heading text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none ${
                                        isCategoryActive
                                            ? 'bg-tijum-plum text-tijum-cream'
                                            : 'border border-tijum-surface bg-white text-tijum-plum hover:border-tijum-peach hover:bg-tijum-peach/20'
                                    }`}
                                >
                                    {cat.name}
                                    {cat.articles_count != null
                                        ? ` (${cat.articles_count})`
                                        : ''}
                                </Link>
                            );
                        })}
                    </div>

                    <form
                        onSubmit={handleSearch}
                        className="flex w-full items-center gap-2 md:w-80"
                    >
                        <div className="relative flex-1">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-lavender"
                                aria-hidden="true"
                            />
                            <Input
                                name="q"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search guides & advice…"
                                aria-label="Search guides and advice"
                                autoComplete="off"
                                spellCheck={false}
                                className="h-11 rounded-xl bg-white pl-10 text-sm"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="default"
                            variant="plum"
                            className="h-11 shrink-0"
                        >
                            Search
                        </Button>
                    </form>
                </div>
            </PublicPageHero>

            <section className="bg-tijum-cream py-12 sm:py-14">
                <ResponsiveContainer width="wide" className="space-y-12">
                    {/* Featured Hero Article */}
                    {featured && !searchTerm && (
                        <article className="grid grid-cols-1 overflow-hidden rounded-[28px] border border-tijum-surface bg-white shadow-tijum-soft transition-colors hover:border-tijum-peach lg:grid-cols-12">
                            {featured.featured_image && (
                                <div className="relative aspect-[16/10] overflow-hidden bg-tijum-surface/40 lg:col-span-7 lg:aspect-auto lg:min-h-[380px]">
                                    <img
                                        src={
                                            resolveLegacyPublicImage(
                                                featured.featured_image,
                                            ) ?? ''
                                        }
                                        alt={featured.title}
                                        width={1200}
                                        height={675}
                                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <Badge className="border-0 bg-tijum-coral font-bold text-white shadow-sm">
                                            Featured Guide
                                        </Badge>
                                    </div>
                                </div>
                            )}

                            <div
                                className={`flex flex-col justify-between space-y-6 p-7 sm:p-9 lg:p-10 ${featured.featured_image ? 'lg:col-span-5' : 'lg:col-span-12'}`}
                            >
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-tijum-lavender">
                                        {featured.category && (
                                            <Badge variant="peach">
                                                {featured.category.name}
                                            </Badge>
                                        )}
                                        <span className="flex items-center gap-1 font-medium tabular-nums">
                                            <Clock
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />{' '}
                                            {featured.reading_time_minutes} min
                                            read
                                        </span>
                                    </div>

                                    <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight text-tijum-plum lg:text-3xl text-balance">
                                        <Link
                                            href={blogShow(featured.slug)}
                                            className="transition-colors hover:text-tijum-coral"
                                        >
                                            {featured.title}
                                        </Link>
                                    </h2>

                                    <p className="line-clamp-3 text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                        {featured.excerpt}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between gap-4 border-t border-tijum-surface pt-5">
                                    <div className="flex items-center gap-2.5">
                                        {featured.author?.avatar_url &&
                                        !isGenericPublicPlaceholder(
                                            featured.author.avatar_url,
                                        ) ? (
                                            <img
                                                src={featured.author.avatar_url}
                                                alt={featured.author.name}
                                                width={96}
                                                height={96}
                                                className="size-9 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-9 items-center justify-center rounded-full bg-tijum-peach/30 text-xs font-bold text-tijum-plum">
                                                <User
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                        )}
                                        <div className="text-xs">
                                            <div className="font-heading font-semibold text-tijum-plum">
                                                {featured.author?.name ||
                                                    'TIJUM Editorial'}
                                            </div>
                                            <div className="text-tijum-lavender">
                                                {featured.published_at
                                                    ? new Date(
                                                          featured.published_at,
                                                      ).toLocaleDateString()
                                                    : ''}
                                            </div>
                                        </div>
                                    </div>

                                    <Button variant="plum" size="sm" asChild>
                                        <Link href={blogShow(featured.slug)}>
                                            <span>Read Article</span>
                                            <ArrowRight
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </article>
                    )}

                    {/* Article Grid */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="flex items-center gap-2.5 font-heading text-xl font-bold tracking-tight text-tijum-plum sm:text-2xl">
                                <BookOpen
                                    className="size-5 text-tijum-plum"
                                    aria-hidden="true"
                                />
                                <span>
                                    {searchTerm
                                        ? `Search Results for "${searchTerm}"`
                                        : currentCategory
                                          ? `${currentCategory.name} Articles`
                                          : 'Latest Articles & Living Guides'}
                                </span>
                            </h2>
                            {(searchTerm || currentCategory) && (
                                <Link
                                    href={blogIndex()}
                                    className="font-heading text-xs font-semibold text-tijum-plum underline decoration-tijum-coral underline-offset-4 hover:text-tijum-coral"
                                >
                                    View all articles
                                </Link>
                            )}
                        </div>

                        {articles.data.length === 0 ? (
                            <div className="rounded-[24px] border border-tijum-surface bg-white p-12 text-center text-sm text-tijum-lavender shadow-tijum-card">
                                No articles found. Try searching for different
                                terms or explore all categories.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {articles.data.map((art) => (
                                    <article
                                        key={art.id}
                                        className="group flex flex-col justify-between overflow-hidden rounded-[24px] border border-tijum-surface bg-white shadow-tijum-card transition-all duration-300 hover:-translate-y-1 hover:border-tijum-peach hover:shadow-tijum-soft"
                                    >
                                        <div className="space-y-4">
                                            {art.featured_image && (
                                                <Link
                                                    href={blogShow(art.slug)}
                                                    className="relative block aspect-16/9 overflow-hidden bg-tijum-surface/40"
                                                >
                                                    <img
                                                        src={
                                                            resolveLegacyPublicImage(
                                                                art.featured_image,
                                                            ) ?? ''
                                                        }
                                                        alt={art.title}
                                                        width={800}
                                                        height={450}
                                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                                        loading="lazy"
                                                    />
                                                </Link>
                                            )}

                                            <div className="space-y-2.5 px-6 pt-2">
                                                <div className="flex items-center justify-between text-xs text-tijum-lavender">
                                                    {art.category && (
                                                        <span className="font-heading font-semibold tracking-wider text-tijum-plum uppercase">
                                                            {art.category.name}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 tabular-nums">
                                                        <Clock
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />{' '}
                                                        {
                                                            art.reading_time_minutes
                                                        }{' '}
                                                        min
                                                    </span>
                                                </div>

                                                <h3 className="line-clamp-2 font-heading text-lg leading-snug font-bold text-tijum-plum transition-colors group-hover:text-tijum-coral">
                                                    <Link
                                                        href={blogShow(
                                                            art.slug,
                                                        )}
                                                    >
                                                        {art.title}
                                                    </Link>
                                                </h3>

                                                <p className="line-clamp-3 text-sm leading-relaxed text-tijum-lavender">
                                                    {art.excerpt}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex items-center justify-between border-t border-tijum-surface px-6 py-4 text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="font-heading font-semibold text-tijum-plum">
                                                    {art.author?.name ||
                                                        'TIJUM'}
                                                </span>
                                                <span className="text-tijum-surface">
                                                    ·
                                                </span>
                                                <span className="text-tijum-lavender">
                                                    {art.published_at
                                                        ? new Date(
                                                              art.published_at,
                                                          ).toLocaleDateString()
                                                        : ''}
                                                </span>
                                            </div>

                                            <Link
                                                href={blogShow(art.slug)}
                                                className="inline-flex items-center gap-1 font-heading font-semibold text-tijum-plum hover:text-tijum-coral"
                                            >
                                                Read
                                                <ArrowRight
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}

                        {articles.data.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                                <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                    Showing{' '}
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        {articles.data.length}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        {articles.total}
                                    </span>{' '}
                                    {articles.total === 1
                                        ? 'article'
                                        : 'articles'}
                                </p>
                                <Pagination
                                    links={articles.links}
                                    currentPage={articles.current_page}
                                    totalPages={articles.last_page}
                                />
                            </div>
                        )}
                    </div>

                    {/* Newsletter Subscription Box */}
                    <div className="flex flex-col items-center justify-between gap-8 rounded-[28px] bg-tijum-plum p-8 text-tijum-cream shadow-tijum-soft md:flex-row lg:p-12">
                        <div className="max-w-xl space-y-3 text-center md:text-left">
                            <span className="inline-flex items-center gap-2 rounded-full bg-tijum-cream/12 px-3 py-1 font-heading text-xs font-semibold text-tijum-peach">
                                Stay &amp; Food Updates
                            </span>
                            <h2 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl text-balance">
                                Get practical stay and meal-planning guides in
                                your inbox.
                            </h2>
                            <p className="text-sm leading-relaxed text-tijum-cream/80">
                                Occasional, permission-based updates from TIJUM.
                                Unsubscribe anytime.
                            </p>
                        </div>

                        {subscribed ? (
                            <p
                                role="status"
                                className="rounded-2xl border border-tijum-peach bg-tijum-cream/10 px-5 py-4 text-sm font-semibold text-tijum-cream"
                            >
                                Subscription received. Check your email for the
                                next step.
                            </p>
                        ) : (
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    if (!newsletterEmail || !marketingConsent) {
                                        return;
                                    }

                                    setSubscribing(true);
                                    router.post(
                                        subscribe.url(),
                                        {
                                            email: newsletterEmail,
                                            marketing_consent:
                                                marketingConsent,
                                            source: 'blog_newsletter',
                                        },
                                        {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                setSubscribed(true);
                                                setNewsletterEmail('');
                                                setMarketingConsent(false);
                                            },
                                            onFinish: () =>
                                                setSubscribing(false),
                                        },
                                    );
                                }}
                                className="w-full space-y-3 md:w-auto"
                            >
                                <div className="flex flex-col items-center gap-2.5 sm:flex-row">
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={newsletterEmail}
                                        onChange={(event) =>
                                            setNewsletterEmail(
                                                event.target.value,
                                            )
                                        }
                                        aria-label="Email address"
                                        placeholder="Enter your email address"
                                        className="h-12 w-full rounded-xl border border-tijum-cream/25 bg-tijum-cream/10 px-4 text-sm text-tijum-cream placeholder-tijum-cream/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-tijum-coral sm:w-72"
                                    />
                                    <Button
                                        type="submit"
                                        size="lg"
                                        disabled={
                                            subscribing || !marketingConsent
                                        }
                                        className="w-full sm:w-auto"
                                    >
                                        {subscribing
                                            ? 'Subscribing'
                                            : 'Subscribe'}
                                    </Button>
                                </div>
                                <label className="flex max-w-md cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-tijum-cream/80">
                                    <input
                                        id="blog-marketing-consent"
                                        name="marketing_consent"
                                        type="checkbox"
                                        checked={marketingConsent}
                                        onChange={(event) =>
                                            setMarketingConsent(
                                                event.target.checked,
                                            )
                                        }
                                        className="mt-0.5 size-4 shrink-0 accent-tijum-coral"
                                    />
                                    <span>
                                        I explicitly agree to optional TIJUM
                                        marketing emails. Transactional
                                        reservation messages are separate.
                                    </span>
                                </label>
                            </form>
                        )}
                    </div>
                </ResponsiveContainer>
            </section>
        </>
    );
}
