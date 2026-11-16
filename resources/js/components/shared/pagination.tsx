import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginationProps = {
    currentPage?: number;
    totalPages?: number;
    lastPage?: number;
    total?: number;
    links?: PaginationLink[];
    onPageChange?: (page: number) => void;
    getPageHref?: (page: number) => string;
    className?: string;
};

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * Builds a compact page list:
 * - For <= 6 pages: [1, 2, ..., totalPages]
 * - Near start (currentPage <= 3) or near end (currentPage >= totalPages - 1):
 *   first 3 numbers, dots (...), last 2 numbers -> [1, 2, 3, 'ellipsis-end', totalPages - 1, totalPages]
 * - Middle pages: keeps first numbers, active page, and last 2 numbers with dots.
 */
function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
    if (totalPages <= 6) {
        return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    if (currentPage <= 3 || currentPage >= totalPages - 1) {
        return [1, 2, 3, 'ellipsis-end', totalPages - 1, totalPages];
    }

    if (currentPage === 4) {
        return [1, 2, 3, 4, 'ellipsis-end', totalPages - 1, totalPages];
    }

    if (currentPage === totalPages - 2) {
        return [
            1,
            2,
            3,
            'ellipsis-start',
            totalPages - 2,
            totalPages - 1,
            totalPages,
        ];
    }

    return [
        1,
        2,
        'ellipsis-start',
        currentPage,
        'ellipsis-end',
        totalPages - 1,
        totalPages,
    ];
}

export function Pagination({
    currentPage = 1,
    totalPages,
    lastPage,
    total,
    links,
    onPageChange,
    getPageHref,
    className,
}: PaginationProps) {
    if (total !== undefined && total <= 0) {
        return null;
    }

    if (links && links.length > 0) {
        const prevLink = links.find(
            (link) =>
                link.label.includes('&laquo;') ||
                link.label.toLowerCase().includes('prev'),
        );
        const nextLink = links.find(
            (link) =>
                link.label.includes('&raquo;') ||
                link.label.toLowerCase().includes('next'),
        );

        const numericLinks = new Map<number, PaginationLink>();
        let activePage = 1;
        let maxPage = 1;

        for (const link of links) {
            const clean = link.label
                .replace(/&laquo;|&raquo;/g, '')
                .trim();
            const parsed = Number.parseInt(clean, 10);
            if (!Number.isNaN(parsed) && String(parsed) === clean) {
                numericLinks.set(parsed, link);
                if (parsed > maxPage) {
                    maxPage = parsed;
                }
                if (link.active) {
                    activePage = parsed;
                }
            }
        }

        const items = buildPageItems(activePage, Math.max(1, maxPage));

        const renderLinkButton = (
            key: string,
            url: string | null | undefined,
            active: boolean,
            content: ReactNode,
            ariaLabel?: string,
            isPageNumber = false,
        ) => (
            <Button
                key={key}
                variant={active ? 'plum' : 'outline'}
                size="sm"
                disabled={!url}
                asChild={Boolean(url)}
                className={cn(
                    isPageNumber && 'min-w-8 px-2.5 tabular-nums',
                )}
            >
                {url ? (
                    <Link
                        href={url}
                        preserveScroll
                        preserveState
                        aria-current={active ? 'page' : undefined}
                        aria-label={ariaLabel}
                    >
                        {content}
                    </Link>
                ) : (
                    <span className="flex items-center gap-1 opacity-50">
                        {content}
                    </span>
                )}
            </Button>
        );

        return (
            <nav
                aria-label="Pagination"
                className={cn(
                    'ml-auto flex flex-wrap items-center justify-end gap-1.5',
                    className,
                )}
            >
                {renderLinkButton(
                    'prev',
                    prevLink?.url,
                    false,
                    <>
                        <ChevronLeft className="size-4" aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">Previous</span>
                    </>,
                    'Previous page',
                )}

                {items.map((item) => {
                    if (typeof item !== 'number') {
                        return (
                            <span
                                key={item}
                                aria-hidden="true"
                                className="inline-flex h-8 min-w-7 items-center justify-center px-1 font-heading text-xs font-bold tracking-widest text-tijum-plum-muted select-none dark:text-muted-foreground"
                            >
                                ...
                            </span>
                        );
                    }

                    const linkObj = numericLinks.get(item);
                    return renderLinkButton(
                        `page-${item}`,
                        linkObj?.url ?? null,
                        item === activePage,
                        <span>{item}</span>,
                        `Page ${item}`,
                        true,
                    );
                })}

                {renderLinkButton(
                    'next',
                    nextLink?.url,
                    false,
                    <>
                        <span className="sr-only sm:not-sr-only">Next</span>
                        <ChevronRight className="size-4" aria-hidden="true" />
                    </>,
                    'Next page',
                )}
            </nav>
        );
    }

    const effectiveTotalPages = Math.max(1, totalPages ?? lastPage ?? 1);

    const pageItems = buildPageItems(currentPage, effectiveTotalPages);

    const renderControl = (
        page: number,
        label: ReactNode,
        disabled: boolean,
        isCurrent = false,
        ariaLabel?: string,
        isPageNumber = false,
    ) => {
        const buttonClass = cn(
            isPageNumber && 'min-w-8 px-2.5 tabular-nums',
        );

        if (getPageHref && !disabled) {
            return (
                <Button
                    key={`link-${String(page)}-${String(ariaLabel ?? page)}`}
                    variant={isCurrent ? 'plum' : 'outline'}
                    size="sm"
                    asChild
                    className={buttonClass}
                >
                    <Link
                        href={getPageHref(page)}
                        preserveScroll
                        preserveState
                        aria-current={isCurrent ? 'page' : undefined}
                        aria-label={ariaLabel}
                    >
                        {label}
                    </Link>
                </Button>
            );
        }

        return (
            <Button
                key={`btn-${String(page)}-${String(ariaLabel ?? page)}`}
                type="button"
                variant={isCurrent ? 'plum' : 'outline'}
                size="sm"
                disabled={disabled}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={ariaLabel}
                className={buttonClass}
                onClick={() => onPageChange?.(page)}
            >
                {label}
            </Button>
        );
    };

    return (
        <nav
            aria-label="Pagination"
            className={cn(
                'ml-auto flex flex-wrap items-center justify-end gap-1.5',
                className,
            )}
        >
            {renderControl(
                Math.max(1, currentPage - 1),
                <>
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">Previous</span>
                </>,
                currentPage <= 1,
                false,
                'Previous page',
            )}

            {pageItems.map((item) => {
                if (typeof item !== 'number') {
                    return (
                        <span
                            key={item}
                            aria-hidden="true"
                            className="inline-flex h-8 min-w-7 items-center justify-center px-1 font-heading text-xs font-bold tracking-widest text-tijum-plum-muted select-none dark:text-muted-foreground"
                        >
                            ...
                        </span>
                    );
                }

                return renderControl(
                    item,
                    item,
                    false,
                    item === currentPage,
                    `Page ${item}`,
                    true,
                );
            })}

            {renderControl(
                Math.min(effectiveTotalPages, currentPage + 1),
                <>
                    <span className="sr-only sm:not-sr-only">Next</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                </>,
                currentPage >= effectiveTotalPages,
                false,
                'Next page',
            )}
        </nav>
    );
}
