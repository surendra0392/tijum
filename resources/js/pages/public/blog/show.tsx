import { Link } from '@inertiajs/react';
import { ArrowLeft, Check, Clock, Share2, Tag, User } from 'lucide-react';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { PublicCtaBand } from '@/components/public/public-cta-band';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    isGenericPublicPlaceholder,
    resolveLegacyPublicImage,
} from '@/lib/public-images';
import { search as publicSearch } from '@/routes/public';
import {
    category as blogCategory,
    index as blogIndex,
    show as blogShow,
} from '@/routes/public/blog';
import type { SeoMetadata } from '@/types';
import type { BlogArticle } from '@/types/cms';

interface Props {
    article: BlogArticle;
    related: BlogArticle[];
    seo?: SeoMetadata;
}

export default function BlogShow({ article, related, seo }: Props) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (typeof window === 'undefined') {
            return;
        }
        void navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle={`${article.title} — TIJUM Guides`}
                fallbackDescription={article.excerpt}
            />

            <article className="bg-tijum-cream py-10 sm:py-14 lg:py-16">
                <ResponsiveContainer width="narrow" className="space-y-8">
                    <header className="space-y-5">
                        <Breadcrumbs
                            items={[
                                { label: 'Living Guides', href: blogIndex.url() },
                                ...(article.category
                                    ? [
                                          {
                                              label: article.category.name,
                                              href: blogCategory.url({
                                                  category:
                                                      article.category.slug,
                                              }),
                                          },
                                      ]
                                    : []),
                                { label: article.title, current: true },
                            ]}
                            tone="dark"
                            showHome
                        />

                        <div>
                            <Link
                                href={blogIndex.url()}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg font-heading text-xs font-semibold text-tijum-lavender transition-colors hover:text-tijum-plum"
                            >
                                <ArrowLeft
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Back to Living Guides</span>
                            </Link>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {article.category && (
                                <Link
                                    href={blogCategory(article.category.slug)}
                                >
                                    <Badge variant="peach">
                                        {article.category.name}
                                    </Badge>
                                </Link>
                            )}
                            <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums text-tijum-lavender">
                                <Clock
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                {article.reading_time_minutes} min read
                            </span>
                        </div>

                        <h1 className="font-heading text-2xl leading-[1.12] font-bold tracking-[-0.025em] text-tijum-plum sm:text-3xl lg:text-[40px] text-balance">
                            {article.title}
                        </h1>

                        {article.excerpt && (
                            <p className="max-w-[65ch] text-base leading-[1.68] text-tijum-lavender sm:text-lg text-pretty">
                                {article.excerpt}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-tijum-surface py-4">
                            <div className="flex items-center gap-3">
                                {article.author?.avatar_url &&
                                !isGenericPublicPlaceholder(
                                    article.author.avatar_url,
                                ) ? (
                                    <img
                                        src={article.author.avatar_url}
                                        alt={article.author.name}
                                        width={96}
                                        height={96}
                                        className="size-11 rounded-full border border-tijum-surface object-cover"
                                    />
                                ) : (
                                    <div className="flex size-11 items-center justify-center rounded-full bg-tijum-peach/30 text-sm font-bold text-tijum-plum">
                                        <User
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </div>
                                )}
                                <div>
                                    <div className="font-heading text-sm font-bold text-tijum-plum">
                                        {article.author?.name ||
                                            'TIJUM Editorial'}
                                    </div>
                                    <div className="text-xs text-tijum-lavender">
                                        {article.author?.designation ||
                                            'Living & Hospitality Editor'}
                                        {article.published_at
                                            ? ` · Published ${new Date(article.published_at).toLocaleDateString()}`
                                            : ''}
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCopy}
                                className="gap-1.5"
                            >
                                {copied ? (
                                    <>
                                        <Check
                                            className="size-3.5 text-tijum-emerald"
                                            aria-hidden="true"
                                        />
                                        <span>Copied link</span>
                                    </>
                                ) : (
                                    <>
                                        <Share2
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span>Share guide</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </header>

                    {article.featured_image && (
                        <div className="overflow-hidden rounded-[28px] border border-tijum-surface bg-white p-2 shadow-tijum-soft">
                            <img
                                src={
                                    resolveLegacyPublicImage(
                                        article.featured_image,
                                    ) ?? ''
                                }
                                alt={article.title}
                                width={1200}
                                height={675}
                                className="h-auto max-h-[480px] w-full rounded-[22px] object-cover"
                            />
                        </div>
                    )}

                    {/* Reading Surface */}
                    <div className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-10">
                        <div
                            className="prose prose-headings:font-heading prose-headings:text-tijum-plum prose-p:text-tijum-plum/85 prose-p:leading-[1.75] prose-a:text-tijum-plum prose-a:underline prose-a:decoration-tijum-coral prose-strong:text-tijum-plum prose-li:text-tijum-plum/85 max-w-none space-y-4 text-base"
                            dangerouslySetInnerHTML={{ __html: article.content }}
                        />

                        {article.tags && article.tags.length > 0 && (
                            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-tijum-surface pt-6">
                                <span className="flex items-center gap-1.5 font-heading text-xs font-semibold text-tijum-lavender">
                                    <Tag
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    Topics:
                                </span>
                                {article.tags.map((tag) => (
                                    <Badge
                                        key={tag.id}
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        #{tag.name}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {article.author && article.author.bio && (
                        <div className="flex items-start gap-4 rounded-[20px] border border-tijum-surface bg-white p-6 shadow-tijum-card">
                            {article.author.avatar_url &&
                                !isGenericPublicPlaceholder(
                                    article.author.avatar_url,
                                ) && (
                                    <img
                                        src={article.author.avatar_url}
                                        alt={article.author.name}
                                        width={96}
                                        height={96}
                                        loading="lazy"
                                        className="size-12 shrink-0 rounded-full object-cover"
                                    />
                                )}
                            <div className="space-y-1">
                                <div className="font-heading text-sm font-bold text-tijum-plum">
                                    About {article.author.name}
                                </div>
                                <p className="text-xs leading-relaxed text-tijum-lavender sm:text-sm">
                                    {article.author.bio}
                                </p>
                            </div>
                        </div>
                    )}

                    {related.length > 0 && (
                        <section className="space-y-5 border-t border-tijum-surface pt-8">
                            <h2 className="font-heading text-xl font-bold text-tijum-plum sm:text-2xl">
                                Recommended reading
                            </h2>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                {related.map((rel) => (
                                    <Link
                                        key={rel.id}
                                        href={blogShow(rel.slug)}
                                        className="group flex flex-col overflow-hidden rounded-[20px] border border-tijum-surface bg-white shadow-tijum-card transition-all duration-300 hover:-translate-y-0.5 hover:border-tijum-peach"
                                    >
                                        {rel.featured_image && (
                                            <div className="aspect-16/10 overflow-hidden bg-tijum-surface/40">
                                                <img
                                                    src={
                                                        resolveLegacyPublicImage(
                                                            rel.featured_image,
                                                        ) ?? ''
                                                    }
                                                    alt={rel.title}
                                                    width={800}
                                                    height={500}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-1.5 p-4">
                                            <div className="text-xs font-medium tabular-nums text-tijum-lavender">
                                                {rel.reading_time_minutes} min
                                                read
                                            </div>
                                            <h3 className="line-clamp-2 font-heading text-sm font-bold text-tijum-plum transition-colors group-hover:text-tijum-coral">
                                                {rel.title}
                                            </h3>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    <PublicCtaBand
                        eyebrow="Find your stay"
                        title="Looking for stays with verified meal options?"
                        description="Explore Hostels/PG, Homestays, and Co-Living properties with clear rates and meal statuses."
                        primaryAction={{
                            label: 'Explore stays',
                            href: publicSearch(),
                        }}
                        secondaryAction={{
                            label: 'All guides',
                            href: blogIndex(),
                        }}
                    />
                </ResponsiveContainer>
            </article>
        </>
    );
}
