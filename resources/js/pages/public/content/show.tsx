import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Compass, HelpCircle, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { PublicPageHero } from '@/components/public/public-page-hero';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { stays as cityStays } from '@/routes/public/cities';
import type { SeoMetadata } from '@/types';
import type { ContentBlock } from '@/types/cms';

interface FeatureGridItem {
    title?: string;
    description?: string;
}

interface BenefitItem {
    title?: string;
    description?: string;
    badge?: string | null;
}

interface FaqBlockItem {
    question?: string;
    answer?: string;
}

interface CityEntry {
    name: string;
    slug: string;
    state?: string | null;
}

interface SafeHref {
    href: string;
    external: boolean;
}

const FALLBACK_CITY_STATES: Record<string, string> = {
    hyderabad: 'Telangana',
    guntur: 'Andhra Pradesh',
    vijayawada: 'Andhra Pradesh',
    visakhapatnam: 'Andhra Pradesh',
};

const DEFAULT_CITIES: CityEntry[] = [
    { name: 'Hyderabad', slug: 'hyderabad', state: 'Telangana' },
    { name: 'Guntur', slug: 'guntur', state: 'Andhra Pradesh' },
    { name: 'Vijayawada', slug: 'vijayawada', state: 'Andhra Pradesh' },
    { name: 'Visakhapatnam', slug: 'visakhapatnam', state: 'Andhra Pradesh' },
];

function resolveSafeHref(raw: unknown): SafeHref | null {
    if (typeof raw !== 'string') {
        return null;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        return { href: trimmed, external: false };
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return { href: trimmed, external: true };
    }

    return null;
}

function resolveSafeMediaUrl(raw: unknown): string | null {
    const safe = resolveSafeHref(raw);
    return safe ? safe.href : null;
}

function CmsActionLink({
    target,
    children,
}: {
    target: SafeHref;
    children: ReactNode;
}) {
    if (target.external) {
        return (
            <a href={target.href} target="_blank" rel="noopener noreferrer">
                {children}
            </a>
        );
    }

    return <Link href={target.href}>{children}</Link>;
}

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
    const sharedProps = usePage<{ publicCities?: CityEntry[] }>().props;
    const discoveryCities =
        Array.isArray(sharedProps.publicCities) &&
        sharedProps.publicCities.length > 0
            ? sharedProps.publicCities.map((city) => ({
                  ...city,
                  state: city.state ?? FALLBACK_CITY_STATES[city.slug] ?? 'Verified City',
              }))
            : DEFAULT_CITIES;

    const renderBlock = (block: ContentBlock, index: number) => {
        const d = (block.data || {}) as Record<string, unknown>;

        switch (block.type) {
            case 'hero': {
                const badgeText = typeof d.badge === 'string' ? d.badge : '';
                const heroTitle =
                    (typeof d.title === 'string' && d.title) ||
                    (typeof d.headline === 'string' && d.headline) ||
                    page.title;
                const heroSubtitle =
                    (typeof d.subtitle === 'string' && d.subtitle) ||
                    (typeof d.subheadline === 'string' && d.subheadline) ||
                    '';
                const ctaText = typeof d.cta_text === 'string' ? d.cta_text : '';
                const ctaTarget = resolveSafeHref(d.cta_url);
                const bgImageUrl = resolveSafeMediaUrl(d.background_image);

                return (
                    <section
                        key={index}
                        className="relative my-6 overflow-hidden rounded-[28px] bg-tijum-plum p-8 text-tijum-cream shadow-tijum-soft sm:p-12 lg:p-14"
                    >
                        {bgImageUrl && (
                            <img
                                src={bgImageUrl}
                                alt=""
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 size-full object-cover opacity-20"
                                loading="lazy"
                            />
                        )}
                        <div className="relative z-10 max-w-2xl space-y-4">
                            {badgeText && (
                                <Badge className="border-transparent bg-tijum-coral font-semibold text-white">
                                    {badgeText}
                                </Badge>
                            )}
                            <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight text-white text-balance sm:text-4xl lg:text-[42px]">
                                {heroTitle}
                            </h2>
                            {heroSubtitle && (
                                <p className="max-w-[60ch] text-base leading-relaxed text-pretty text-tijum-cream/85">
                                    {heroSubtitle}
                                </p>
                            )}
                            {ctaText && ctaTarget && (
                                <div className="pt-2">
                                    <Button size="lg" asChild>
                                        <CmsActionLink target={ctaTarget}>
                                            <span>{ctaText}</span>
                                            <ArrowRight
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </CmsActionLink>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>
                );
            }

            case 'text': {
                const headingText =
                    (typeof d.heading === 'string' && d.heading) ||
                    (typeof d.title === 'string' && d.title) ||
                    '';
                const htmlContent =
                    (typeof d.body === 'string' && d.body) ||
                    (typeof d.html === 'string' && d.html) ||
                    (typeof d.text === 'string' && d.text) ||
                    '';

                return (
                    <section key={index} className="mx-auto my-8 max-w-3xl">
                        <div className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-9 dark:border-border dark:bg-card">
                            {headingText && (
                                <h3 className="mb-4 font-heading text-xl font-bold text-tijum-plum sm:text-2xl dark:text-foreground">
                                    {headingText}
                                </h3>
                            )}
                            <div
                                className="prose prose-headings:font-heading prose-headings:text-tijum-plum prose-p:text-tijum-plum/85 prose-p:leading-[1.75] prose-a:text-tijum-plum prose-a:underline prose-a:decoration-tijum-coral prose-strong:text-tijum-plum prose-li:text-tijum-plum/85 dark:prose-invert dark:prose-p:text-foreground/85 dark:prose-a:text-tijum-peach max-w-none text-base"
                                dangerouslySetInnerHTML={{
                                    __html: htmlContent,
                                }}
                            />
                        </div>
                    </section>
                );
            }

            case 'image_text': {
                const position =
                    (typeof d.image_position === 'string' && d.image_position) ||
                    (typeof d.layout === 'string' && d.layout) ||
                    'left';
                const isReverse = position === 'right';
                const imageUrl = resolveSafeMediaUrl(d.image_url);
                const headingText =
                    (typeof d.heading === 'string' && d.heading) ||
                    (typeof d.title === 'string' && d.title) ||
                    '';
                const imageAlt =
                    (typeof d.image_alt === 'string' && d.image_alt) ||
                    headingText ||
                    'Stay guide highlight';
                const badgeText = typeof d.badge === 'string' ? d.badge : '';
                const bodyHtml =
                    (typeof d.body === 'string' && d.body) ||
                    (typeof d.text === 'string' && d.text) ||
                    '';
                const ctaText = typeof d.cta_text === 'string' ? d.cta_text : '';
                const ctaTarget = resolveSafeHref(d.cta_url);

                return (
                    <section
                        key={index}
                        className="my-12 grid grid-cols-1 items-center gap-8 rounded-[28px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8 lg:grid-cols-12 lg:gap-10 dark:border-border dark:bg-card"
                    >
                        {imageUrl && (
                            <div
                                className={`overflow-hidden rounded-[22px] border border-tijum-surface bg-tijum-surface/40 lg:col-span-6 dark:border-border dark:bg-muted/40 ${isReverse ? 'lg:order-2' : ''}`}
                            >
                                <img
                                    src={imageUrl}
                                    alt={imageAlt}
                                    width={1200}
                                    height={800}
                                    className="h-auto max-h-96 w-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                        )}
                        <div
                            className={`space-y-4 ${imageUrl ? 'lg:col-span-6' : 'lg:col-span-12'} ${isReverse ? 'lg:order-1' : ''}`}
                        >
                            {badgeText && (
                                <Badge variant="peach">{badgeText}</Badge>
                            )}
                            {headingText && (
                                <h3 className="font-heading text-2xl leading-tight font-bold text-tijum-plum text-balance sm:text-3xl dark:text-foreground">
                                    {headingText}
                                </h3>
                            )}
                            <div
                                className="space-y-2 text-sm leading-relaxed text-tijum-lavender sm:text-base dark:text-muted-foreground"
                                dangerouslySetInnerHTML={{
                                    __html: bodyHtml,
                                }}
                            />
                            {ctaText && ctaTarget && (
                                <div className="pt-2">
                                    <Button variant="plum" asChild>
                                        <CmsActionLink target={ctaTarget}>
                                            <span>{ctaText}</span>
                                            <ArrowRight
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </CmsActionLink>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>
                );
            }

            case 'feature_grid': {
                const items = Array.isArray(d.items)
                    ? (d.items as FeatureGridItem[])
                    : [];
                const headingText =
                    (typeof d.heading === 'string' && d.heading) ||
                    (typeof d.title === 'string' && d.title) ||
                    '';
                const subtitleText =
                    typeof d.subtitle === 'string' ? d.subtitle : '';

                return (
                    <section key={index} className="my-12 space-y-6">
                        {headingText && (
                            <div className="mx-auto max-w-2xl space-y-2 text-center">
                                <h3 className="font-heading text-2xl font-bold text-tijum-plum sm:text-3xl dark:text-foreground">
                                    {headingText}
                                </h3>
                                {subtitleText && (
                                    <p className="text-sm leading-relaxed text-tijum-lavender sm:text-base dark:text-muted-foreground">
                                        {subtitleText}
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {items.map((it, i) => (
                                <div
                                    key={i}
                                    className="space-y-3 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card dark:border-border dark:bg-card"
                                >
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum dark:bg-tijum-plum/20 dark:text-tijum-peach">
                                        <Sparkles
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <h4 className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                        {it.title}
                                    </h4>
                                    <p className="text-sm leading-relaxed text-tijum-lavender dark:text-muted-foreground">
                                        {it.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }

            case 'benefits': {
                const benefitItems = Array.isArray(d.items)
                    ? (d.items as BenefitItem[])
                    : [];
                const headingText =
                    (typeof d.heading === 'string' && d.heading) ||
                    (typeof d.title === 'string' && d.title) ||
                    '';

                return (
                    <section
                        key={index}
                        className="my-10 space-y-6 rounded-[28px] border border-tijum-surface bg-white p-7 shadow-tijum-card sm:p-10 dark:border-border dark:bg-card"
                    >
                        {headingText && (
                            <h3 className="font-heading text-2xl font-bold text-tijum-plum dark:text-foreground">
                                {headingText}
                            </h3>
                        )}
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            {benefitItems.map((b, bi) => (
                                <div
                                    key={bi}
                                    className="flex items-start gap-3"
                                >
                                    <CheckCircle2
                                        className="mt-0.5 size-5 shrink-0 text-tijum-emerald"
                                        aria-hidden="true"
                                    />
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                {b.title}
                                            </h4>
                                            {b.badge && (
                                                <Badge variant="peach">
                                                    {b.badge}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs leading-relaxed text-tijum-lavender sm:text-sm dark:text-muted-foreground">
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
                const faqList = Array.isArray(d.items)
                    ? (d.items as FaqBlockItem[])
                    : [];
                const headingText =
                    (typeof d.heading === 'string' && d.heading) ||
                    (typeof d.title === 'string' && d.title) ||
                    'Frequently Asked Questions';

                return (
                    <section
                        key={index}
                        className="my-12 space-y-6 rounded-[28px] border border-tijum-surface bg-white p-7 shadow-tijum-card sm:p-10 dark:border-border dark:bg-card"
                    >
                        <div className="space-y-1.5 border-b border-tijum-surface pb-4 dark:border-border">
                            <span className="flex items-center gap-1.5 font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase dark:text-muted-foreground">
                                <HelpCircle
                                    className="size-4 text-tijum-plum dark:text-tijum-peach"
                                    aria-hidden="true"
                                />
                                Questions &amp; Clarifications
                            </span>
                            <h3 className="font-heading text-2xl font-bold text-tijum-plum dark:text-foreground">
                                {headingText}
                            </h3>
                        </div>
                        <div className="divide-y divide-tijum-surface dark:divide-border">
                            {faqList.map((f, fi) => (
                                <div key={fi} className="space-y-1.5 py-4">
                                    <h4 className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                        {f.question}
                                    </h4>
                                    <p className="text-sm leading-relaxed text-tijum-lavender dark:text-muted-foreground">
                                        {f.answer}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            }

            case 'cta': {
                const ctaHeading =
                    (typeof d.heading === 'string' && d.heading) ||
                    (typeof d.headline === 'string' && d.headline) ||
                    'Ready to discover food-inclusive living?';
                const ctaDescription =
                    (typeof d.description === 'string' && d.description) ||
                    (typeof d.text === 'string' && d.text) ||
                    'Explore food-inclusive Hostels/PG, Homestays, and Co-Living accommodations across our launch cities.';
                const buttonText =
                    (typeof d.button_text === 'string' && d.button_text) ||
                    (typeof d.button_label === 'string' && d.button_label) ||
                    'Browse Accommodations';
                const primaryTarget = resolveSafeHref(d.button_url) ?? {
                    href: '/search',
                    external: false,
                };
                const secondaryText =
                    typeof d.secondary_button_text === 'string'
                        ? d.secondary_button_text
                        : '';
                const secondaryTarget = resolveSafeHref(
                    d.secondary_button_url,
                );

                return (
                    <section
                        key={index}
                        className="my-12 flex flex-col items-start justify-between gap-6 rounded-[28px] bg-tijum-plum p-8 text-tijum-cream shadow-tijum-soft sm:flex-row sm:items-center sm:p-12"
                    >
                        <div className="space-y-2">
                            <h3 className="font-heading text-2xl font-bold text-white">
                                {ctaHeading}
                            </h3>
                            <p className="max-w-lg text-sm leading-relaxed text-tijum-cream/85">
                                {ctaDescription}
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-3">
                            {secondaryText && secondaryTarget && (
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="border-tijum-cream/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                                    asChild
                                >
                                    <CmsActionLink target={secondaryTarget}>
                                        {secondaryText}
                                    </CmsActionLink>
                                </Button>
                            )}
                            <Button size="lg" asChild>
                                <CmsActionLink target={primaryTarget}>
                                    {buttonText}
                                </CmsActionLink>
                            </Button>
                        </div>
                    </section>
                );
            }

            case 'city_discovery': {
                const cityHeading =
                    (typeof d.heading === 'string' && d.heading) ||
                    (typeof d.title === 'string' && d.title) ||
                    'Explore Local Food-Inclusive Stays';
                const cityDescription =
                    typeof d.description === 'string' ? d.description : '';

                return (
                    <section key={index} className="my-12 space-y-6">
                        <div className="space-y-2 text-center">
                            <span className="font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase dark:text-muted-foreground">
                                Initial Launch Cities
                            </span>
                            <h3 className="font-heading text-2xl font-bold text-tijum-plum sm:text-3xl dark:text-foreground">
                                {cityHeading}
                            </h3>
                            {cityDescription && (
                                <p className="mx-auto max-w-xl text-sm text-tijum-lavender dark:text-muted-foreground">
                                    {cityDescription}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {discoveryCities.map((c) => (
                                <Link
                                    key={c.slug}
                                    href={cityStays(c.slug)}
                                    className="group rounded-[20px] border border-tijum-surface bg-white p-5 text-center shadow-tijum-card transition-all duration-300 hover:-translate-y-0.5 hover:border-tijum-peach dark:border-border dark:bg-card"
                                >
                                    <Compass
                                        className="mx-auto mb-2.5 size-6 text-tijum-plum transition-transform group-hover:scale-110 dark:text-tijum-peach"
                                        aria-hidden="true"
                                    />
                                    <div className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                        {c.name}
                                    </div>
                                    <div className="text-xs text-tijum-lavender dark:text-muted-foreground">
                                        {c.state}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                );
            }

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

            <section className="bg-tijum-cream py-8 sm:py-12 dark:bg-background">
                <ResponsiveContainer width="wide">
                    {page.content_blocks && page.content_blocks.length > 0 ? (
                        page.content_blocks.map((block, idx) =>
                            renderBlock(block, idx),
                        )
                    ) : (
                        <div className="rounded-[24px] border border-tijum-surface bg-white p-12 text-center text-sm text-tijum-lavender shadow-tijum-card dark:border-border dark:bg-card dark:text-muted-foreground">
                            Content is being updated by our editorial team.
                        </div>
                    )}
                </ResponsiveContainer>
            </section>
        </>
    );
}
