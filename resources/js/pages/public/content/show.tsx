import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Compass, HelpCircle, Sparkles } from 'lucide-react';
import { PublicPageHero } from '@/components/public/public-page-hero';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { show as cityShow } from '@/routes/public/cities';
import type { SeoMetadata } from '@/types';
import type { ContentBlock } from '@/types/cms';

interface Props {
    page: {
        id: number;
        slug: string;
        title: string;
        summary?: string | null;
        content_blocks?: ContentBlock[] | null;
        featured_image?: string | null;
    };
    seo?: SeoMetadata;
}

export default function CmsPageShow({ page, seo }: Props) {
    const renderBlock = (block: ContentBlock, index: number) => {
        const d = block.data || {};

        switch (block.type) {
            case 'hero':
                return (
                    <section
                        key={index}
                        className="my-6 overflow-hidden rounded-[28px] bg-tijum-plum p-8 text-tijum-cream shadow-tijum-soft sm:p-12 lg:p-14"
                    >
                        <div className="max-w-2xl space-y-4">
                            {d.badge && (
                                <Badge className="border-transparent bg-tijum-coral font-semibold text-white">
                                    {d.badge}
                                </Badge>
                            )}
                            <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight text-white sm:text-4xl lg:text-[42px] text-balance">
                                {d.headline || page.title}
                            </h2>
                            {d.subheadline && (
                                <p className="max-w-[60ch] text-base leading-relaxed text-tijum-cream/85 text-pretty">
                                    {d.subheadline}
                                </p>
                            )}
                            {d.cta_text && d.cta_url && (
                                <div className="pt-2">
                                    <Button size="lg" asChild>
                                        <Link href={d.cta_url}>
                                            <span>{d.cta_text}</span>
                                            <ArrowRight
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>
                );

            case 'text':
                return (
                    <section key={index} className="mx-auto my-8 max-w-3xl">
                        <div className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-9">
                            <div
                                className="prose prose-headings:font-heading prose-headings:text-tijum-plum prose-p:text-tijum-plum/85 prose-p:leading-[1.75] prose-a:text-tijum-plum prose-a:underline prose-a:decoration-tijum-coral prose-strong:text-tijum-plum prose-li:text-tijum-plum/85 max-w-none text-base"
                                dangerouslySetInnerHTML={{
                                    __html: d.html || d.text || '',
                                }}
                            />
                        </div>
                    </section>
                );

            case 'image_text': {
                const isReverse = d.layout === 'right';
                return (
                    <section
                        key={index}
                        className="my-12 grid grid-cols-1 items-center gap-8 rounded-[28px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8 lg:grid-cols-12 lg:gap-10"
                    >
                        {d.image_url && (
                            <div
                                className={`overflow-hidden rounded-[22px] border border-tijum-surface bg-tijum-surface/40 lg:col-span-6 ${isReverse ? 'lg:order-2' : ''}`}
                            >
                                <img
                                    src={d.image_url}
                                    alt={d.title || 'Image'}
                                    width={1200}
                                    height={800}
                                    className="h-auto max-h-96 w-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                        )}
                        <div
                            className={`space-y-4 ${d.image_url ? 'lg:col-span-6' : 'lg:col-span-12'} ${isReverse ? 'lg:order-1' : ''}`}
                        >
                            {d.badge && (
                                <Badge variant="peach">{d.badge}</Badge>
                            )}
                            <h3 className="font-heading text-2xl leading-tight font-bold text-tijum-plum sm:text-3xl text-balance">
                                {d.title}
                            </h3>
                            <div
                                className="space-y-2 text-sm leading-relaxed text-tijum-lavender sm:text-base"
                                dangerouslySetInnerHTML={{
                                    __html: d.body || d.text || '',
                                }}
                            />
                            {d.cta_text && d.cta_url && (
                                <div className="pt-2">
                                    <Button variant="plum" asChild>
                                        <Link href={d.cta_url}>
                                            <span>{d.cta_text}</span>
                                            <ArrowRight
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>
                );
            }

            case 'feature_grid': {
                const items = Array.isArray(d.items) ? d.items : [];
                return (
                    <section key={index} className="my-12 space-y-6">
                        {d.title && (
                            <div className="mx-auto max-w-2xl space-y-2 text-center">
                                <h3 className="font-heading text-2xl font-bold text-tijum-plum sm:text-3xl">
                                    {d.title}
                                </h3>
                                {d.subtitle && (
                                    <p className="text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                        {d.subtitle}
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {items.map((it: any, i: number) => (
                                <div
                                    key={i}
                                    className="space-y-3 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card"
                                >
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                        <Sparkles
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <h4 className="font-heading text-base font-bold text-tijum-plum">
                                        {it.title}
                                    </h4>
                                    <p className="text-sm leading-relaxed text-tijum-lavender">
                                        {it.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }

            case 'benefits': {
                const benefitItems = Array.isArray(d.items) ? d.items : [];
                return (
                    <section
                        key={index}
                        className="my-10 space-y-6 rounded-[28px] border border-tijum-surface bg-white p-7 shadow-tijum-card sm:p-10"
                    >
                        {d.title && (
                            <h3 className="font-heading text-2xl font-bold text-tijum-plum">
                                {d.title}
                            </h3>
                        )}
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            {benefitItems.map((b: any, bi: number) => (
                                <div
                                    key={bi}
                                    className="flex items-start gap-3"
                                >
                                    <CheckCircle2
                                        className="mt-0.5 size-5 shrink-0 text-tijum-emerald"
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <h4 className="font-heading text-sm font-bold text-tijum-plum">
                                            {b.title}
                                        </h4>
                                        <p className="mt-1 text-xs leading-relaxed text-tijum-lavender sm:text-sm">
                                            {b.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }

            case 'faq_accordion': {
                const faqList = Array.isArray(d.items) ? d.items : [];
                return (
                    <section
                        key={index}
                        className="my-12 space-y-6 rounded-[28px] border border-tijum-surface bg-white p-7 shadow-tijum-card sm:p-10"
                    >
                        <div className="space-y-1.5 border-b border-tijum-surface pb-4">
                            <span className="flex items-center gap-1.5 font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                <HelpCircle
                                    className="size-4 text-tijum-plum"
                                    aria-hidden="true"
                                />
                                Questions &amp; Clarifications
                            </span>
                            <h3 className="font-heading text-2xl font-bold text-tijum-plum">
                                {d.title || 'Frequently Asked Questions'}
                            </h3>
                        </div>
                        <div className="divide-y divide-tijum-surface">
                            {faqList.map((f: any, fi: number) => (
                                <div key={fi} className="space-y-1.5 py-4">
                                    <h4 className="font-heading text-base font-bold text-tijum-plum">
                                        {f.question}
                                    </h4>
                                    <p className="text-sm leading-relaxed text-tijum-lavender">
                                        {f.answer}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }

            case 'cta':
                return (
                    <section
                        key={index}
                        className="my-12 flex flex-col items-start justify-between gap-6 rounded-[28px] bg-tijum-plum p-8 text-tijum-cream shadow-tijum-soft sm:flex-row sm:items-center sm:p-12"
                    >
                        <div className="space-y-2">
                            <h3 className="font-heading text-2xl font-bold text-white">
                                {d.headline ||
                                    'Ready to discover food-inclusive living?'}
                            </h3>
                            <p className="max-w-lg text-sm leading-relaxed text-tijum-cream/85">
                                {d.text ||
                                    'Explore food-inclusive Hostels/PG, Homestays, and Co-Living accommodations across our launch cities.'}
                            </p>
                        </div>
                        <Button size="lg" className="shrink-0" asChild>
                            <Link href={d.button_url || '/search'}>
                                {d.button_label || 'Browse Accommodations'}
                            </Link>
                        </Button>
                    </section>
                );

            case 'city_discovery':
                return (
                    <section key={index} className="my-12 space-y-6">
                        <div className="space-y-2 text-center">
                            <span className="font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                Initial Launch Cities
                            </span>
                            <h3 className="font-heading text-2xl font-bold text-tijum-plum sm:text-3xl">
                                Explore Local Food-Inclusive Stays
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {[
                                {
                                    name: 'Hyderabad',
                                    slug: 'hyderabad',
                                    state: 'Telangana',
                                },
                                {
                                    name: 'Guntur',
                                    slug: 'guntur',
                                    state: 'Andhra Pradesh',
                                },
                                {
                                    name: 'Vijayawada',
                                    slug: 'vijayawada',
                                    state: 'Andhra Pradesh',
                                },
                                {
                                    name: 'Visakhapatnam',
                                    slug: 'visakhapatnam',
                                    state: 'Andhra Pradesh',
                                },
                            ].map((c) => (
                                <Link
                                    key={c.slug}
                                    href={cityShow(c.slug)}
                                    className="group rounded-[20px] border border-tijum-surface bg-white p-5 text-center shadow-tijum-card transition-all duration-300 hover:-translate-y-0.5 hover:border-tijum-peach"
                                >
                                    <Compass
                                        className="mx-auto mb-2.5 size-6 text-tijum-plum transition-transform group-hover:scale-110"
                                        aria-hidden="true"
                                    />
                                    <div className="font-heading text-base font-bold text-tijum-plum">
                                        {c.name}
                                    </div>
                                    <div className="text-xs text-tijum-lavender">
                                        {c.state}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                );

            default:
                return null;
        }
    };

    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle={`${page.title} — TIJUM`}
                fallbackDescription={page.summary || ''}
            />

            <PublicPageHero
                eyebrow="Marketplace Information"
                title={page.title}
                description={page.summary || undefined}
                breadcrumbs={[{ label: page.title, current: true }]}
            />

            <section className="bg-tijum-cream py-8 sm:py-12">
                <ResponsiveContainer width="wide">
                    {page.content_blocks && page.content_blocks.length > 0 ? (
                        page.content_blocks.map((block, idx) =>
                            renderBlock(block, idx),
                        )
                    ) : (
                        <div className="rounded-[24px] border border-tijum-surface bg-white p-12 text-center text-sm text-tijum-lavender shadow-tijum-card">
                            Content is being updated by our editorial team.
                        </div>
                    )}
                </ResponsiveContainer>
            </section>
        </>
    );
}
