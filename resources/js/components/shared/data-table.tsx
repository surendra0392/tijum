import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { cn } from '@/lib/utils';

export type DataTableColumn<T> = {
    key: string;
    header: string;
    isRowHeader?: boolean;
    align?: 'left' | 'right';
    render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
    caption: string;
    title?: string;
    description?: string;
    headerActions?: ReactNode;
    columns: DataTableColumn<T>[];
    rows: T[];
    getRowKey: (row: T, index: number) => string | number;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyAction?: ReactNode;
    emptyIcon?: LucideIcon;
    footer?: ReactNode;
    pageSize?: number;
    className?: string;
};

export function DataTable<T>({
    caption,
    title,
    description,
    headerActions,
    columns,
    rows,
    getRowKey,
    emptyTitle = 'No records available',
    emptyDescription = 'Items matching this view will appear here once created.',
    emptyAction,
    emptyIcon,
    footer,
    pageSize = 15,
    className,
}: DataTableProps<T>) {
    const captionId = useId();
    const [currentPage, setCurrentPage] = useState(1);

    const effectivePageSize =
        pageSize && pageSize > 0 ? pageSize : undefined;
    const clientTotalPages = effectivePageSize
        ? Math.max(1, Math.ceil(rows.length / effectivePageSize))
        : 1;

    useEffect(() => {
        setCurrentPage(1);
    }, [rows.length, effectivePageSize]);

    const visibleRows = useMemo(() => {
        if (!effectivePageSize) {
            return rows;
        }
        const safePage = Math.min(currentPage, clientTotalPages);
        const start = (safePage - 1) * effectivePageSize;
        return rows.slice(start, start + effectivePageSize);
    }, [rows, effectivePageSize, currentPage, clientTotalPages]);

    if (rows.length === 0) {
        return (
            <EmptyState
                icon={emptyIcon}
                title={emptyTitle}
                description={emptyDescription}
                action={emptyAction}
            />
        );
    }

    const startItem = effectivePageSize
        ? (Math.min(currentPage, clientTotalPages) - 1) * effectivePageSize + 1
        : 1;
    const endItem = effectivePageSize
        ? Math.min(startItem + visibleRows.length - 1, rows.length)
        : rows.length;

    const showClientPagination = Boolean(effectivePageSize && rows.length > 0);
    const showDefaultSummaryFooter = !footer && effectivePageSize && rows.length > 0;

    return (
        <div
            className={cn(
                'overflow-hidden rounded-[20px] border border-tijum-surface/80 bg-card text-card-foreground shadow-tijum-card dark:border-border',
                className,
            )}
        >
            {(title || description || headerActions) && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tijum-surface/80 px-5 py-4 sm:px-6 dark:border-border">
                    <div className="min-w-0 space-y-0.5">
                        {title && (
                            <h3 className="font-heading text-base font-semibold tracking-tight text-tijum-plum sm:text-lg dark:text-foreground">
                                {title}
                            </h3>
                        )}
                        {description && (
                            <p className="text-xs leading-relaxed text-tijum-plum-muted sm:text-sm dark:text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                    {headerActions && (
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {headerActions}
                        </div>
                    )}
                </div>
            )}

            <div
                tabIndex={0}
                role="region"
                aria-labelledby={captionId}
                className="tijum-table-region tijum-table-responsive focus-visible:ring-[3px] focus-visible:ring-tijum-coral/40 focus-visible:outline-none"
            >
                <table>
                    <caption id={captionId} className="sr-only">
                        {caption}
                    </caption>
                    <thead className="bg-tijum-cream/65 dark:bg-muted/60">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    scope="col"
                                    className={cn(
                                        'border-b border-tijum-surface px-4 py-3 font-heading text-xs font-semibold tracking-wider text-tijum-plum uppercase dark:border-border dark:text-foreground',
                                        column.align === 'right'
                                            ? 'text-right'
                                            : 'text-left',
                                    )}
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visibleRows.map((row, rowIndex) => (
                            <tr
                                key={getRowKey(row, rowIndex)}
                                className="transition-colors hover:bg-tijum-cream/35 dark:hover:bg-muted/40"
                            >
                                {columns.map((column) =>
                                    column.isRowHeader ? (
                                        <th
                                            key={column.key}
                                            scope="row"
                                            data-label={column.header}
                                            className={cn(
                                                'border-b border-tijum-surface/70 px-4 py-3.5 font-heading text-sm font-semibold text-tijum-plum dark:border-border dark:text-foreground',
                                                column.align === 'right'
                                                    ? 'text-right'
                                                    : 'text-left',
                                            )}
                                        >
                                            {column.render(row)}
                                        </th>
                                    ) : (
                                        <td
                                            key={column.key}
                                            data-label={column.header}
                                            className={cn(
                                                'border-b border-tijum-surface/70 px-4 py-3.5 text-sm text-tijum-plum dark:border-border dark:text-foreground',
                                                column.align === 'right'
                                                    ? 'text-right'
                                                    : 'text-left',
                                            )}
                                        >
                                            {column.render(row)}
                                        </td>
                                    ),
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {(footer || showDefaultSummaryFooter) && (
                <div className="border-t border-tijum-surface/80 px-5 py-3.5 sm:px-6 dark:border-border">
                    {footer}
                    {showDefaultSummaryFooter && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {startItem}–{endItem}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {rows.length}
                                </span>{' '}
                                records
                            </p>
                            {showClientPagination && (
                                <Pagination
                                    currentPage={Math.min(
                                        currentPage,
                                        clientTotalPages,
                                    )}
                                    totalPages={clientTotalPages}
                                    onPageChange={setCurrentPage}
                                />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
