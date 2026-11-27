import { HelpCircle, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FaqAccordion } from '@/components/public/faq-accordion';
import { PublicCtaBand } from '@/components/public/public-cta-band';
import { PublicPageHero } from '@/components/public/public-page-hero';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { createFullFaqGroups, type FaqGroup } from '@/data/public-content';
import { register } from '@/routes';
import { becomeAPartner, howItWorks } from '@/routes/public';
import type { SeoMetadata } from '@/types';
import type { StayTimingData } from '@/types/public-search';

type FaqsProps = {
    seo?: SeoMetadata;
    timing: StayTimingData;
    cmsFaqGroups?: FaqGroup[];
};

export default function Faqs({ seo, timing, cmsFaqGroups = [] }: FaqsProps) {
    const faqGroups = useMemo(() => {
        const baseGroups = createFullFaqGroups(timing);
        if (!cmsFaqGroups || cmsFaqGroups.length === 0) {
            return baseGroups;
        }

        const merged = baseGroups.map((group) => ({
            ...group,
            items: [...group.items],
        }));

        for (const cmsGroup of cmsFaqGroups) {
            if (!cmsGroup.items || cmsGroup.items.length === 0) {
                continue;
            }

            const targetIndex = merged.findIndex(
                (group) =>
                    group.id === cmsGroup.id ||
                    group.category.toLowerCase() ===
                        cmsGroup.category.toLowerCase(),
            );

            if (targetIndex >= 0) {
                const existingQuestions = new Set(
                    merged[targetIndex].items.map((item) =>
                        item.question.trim().toLowerCase(),
                    ),
                );
                const newCmsItems = cmsGroup.items.filter(
                    (item) =>
                        !existingQuestions.has(
                            item.question.trim().toLowerCase(),
                        ),
                );
                merged[targetIndex].items = [
                    ...newCmsItems,
                    ...merged[targetIndex].items,
                ];
            } else {
                merged.unshift(cmsGroup);
            }
        }

        return merged;
    }, [timing, cmsFaqGroups]);
    const [query, setQuery] = useState('');

    const normalizedQuery = query.trim().toLowerCase();
    const filteredGroups = useMemo(() => {
        if (!normalizedQuery) {
            return faqGroups;
        }

        return faqGroups
            .map((group) => ({
                ...group,
                items: group.items.filter(
                    (item) =>
                        item.question.toLowerCase().includes(normalizedQuery) ||
                        item.answer.toLowerCase().includes(normalizedQuery),
                ),
            }))
            .filter((group) => group.items.length > 0);
    }, [faqGroups, normalizedQuery]);

    const totalMatchedQuestions = useMemo(
        () =>
            filteredGroups.reduce(
                (count, group) => count + group.items.length,
                0,
            ),
        [filteredGroups],
    );

    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle="Frequently Asked Questions — Stays, Food & Check-In | TIJUM"
                fallbackDescription="Answers covering food inclusion, Hostels/PG, Homestays, Co-Living, durations, check-in timing, reservation totals, and partner registration."
            />

            <PublicPageHero
                eyebrow="Help & Answers"
                title="Frequently Asked Questions"
                description="Clear, practical answers covering food-inclusive stays, timings, reservations, and property-partner onboarding."
                breadcrumbs={[{ label: 'FAQs', current: true }]}
                badges={
                    <Badge variant="peach" className="gap-1.5">
                        <HelpCircle className="size-3.5" aria-hidden="true" />
                        <span>{faqGroups.length} Topic Categories</span>
                    </Badge>
                }
            >
                <div className="space-y-4 border-t border-tijum-surface pt-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative max-w-md flex-1">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-lavender"
                                aria-hidden="true"
                            />
                            <Input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search questions (e.g. food, check-in, hold, refund)…"
                                aria-label="Search FAQ questions"
                                className="h-12 rounded-xl bg-white pr-10 pl-10 text-sm"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    aria-label="Clear FAQ search"
                                    className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-tijum-lavender hover:bg-tijum-cream hover:text-tijum-plum"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        {normalizedQuery && (
                            <p className="text-xs font-medium text-tijum-lavender sm:text-sm">
                                Showing{' '}
                                <strong className="font-heading text-tijum-plum tabular-nums">
                                    {totalMatchedQuestions}
                                </strong>{' '}
                                matching{' '}
                                {totalMatchedQuestions === 1
                                    ? 'question'
                                    : 'questions'}
                            </p>
                        )}
                    </div>

                    {!normalizedQuery && (
                        <nav
                            aria-label="FAQ category shortcuts"
                            className="flex flex-wrap gap-2"
                        >
                            {faqGroups.map((group) => (
                                <a
                                    key={group.id}
                                    href={`#${group.id}`}
                                    className="inline-flex min-h-10 items-center rounded-full border border-tijum-surface bg-white px-4 font-heading text-xs font-semibold text-tijum-plum transition-colors hover:border-tijum-peach hover:bg-tijum-peach/20 focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                                >
                                    {group.category}
                                </a>
                            ))}
                        </nav>
                    )}
                </div>
            </PublicPageHero>

            <section className="bg-tijum-cream py-12 sm:py-16">
                <ResponsiveContainer width="wide" className="space-y-14">
                    {filteredGroups.length === 0 ? (
                        <div className="rounded-[24px] border border-tijum-surface bg-white p-10 text-center shadow-tijum-card">
                            <p className="font-heading text-lg font-bold text-tijum-plum">
                                No questions matched &ldquo;{query}&rdquo;
                            </p>
                            <p className="mt-1.5 text-sm text-tijum-lavender">
                                Try searching another keyword or reset to view
                                all topics.
                            </p>
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                className="mt-4 cursor-pointer font-heading text-sm font-semibold text-tijum-plum underline decoration-tijum-coral underline-offset-4 hover:text-tijum-coral"
                            >
                                Reset FAQ search
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {filteredGroups.map((group) => (
                                <div
                                    key={group.id}
                                    id={group.id}
                                    className="scroll-mt-24 grid gap-6 border-b border-tijum-surface pb-12 last:border-b-0 last:pb-0 lg:grid-cols-12 lg:gap-10"
                                >
                                    <div className="space-y-2 lg:col-span-4">
                                        <h2 className="font-heading text-xl font-bold tracking-tight text-tijum-plum sm:text-2xl">
                                            {group.category}
                                        </h2>
                                        <p className="text-sm leading-relaxed text-tijum-lavender">
                                            {group.description}
                                        </p>
                                    </div>

                                    <div className="lg:col-span-8">
                                        <FaqAccordion
                                            items={group.items}
                                            ariaLabel={`${group.category} questions`}
                                            openFirst={
                                                Boolean(normalizedQuery) ||
                                                group.id === 'general'
                                            }
                                            allowToggleAll
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <PublicCtaBand
                        eyebrow="Still exploring?"
                        title="Ready to find stays or join as a property operator?"
                        description="Explore our transparent booking flow, register a customer account, or apply to become a TIJUM partner."
                        primaryAction={{
                            label: 'Become a Partner',
                            href: becomeAPartner(),
                        }}
                        secondaryAction={{
                            label: 'How It Works',
                            href: howItWorks(),
                        }}
                    />

                    <div className="text-center">
                        <a
                            href={register().url}
                            className="font-heading text-sm font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 hover:text-tijum-coral"
                        >
                            Need a guest account? Create one here
                        </a>
                    </div>
                </ResponsiveContainer>
            </section>
        </>
    );
}
