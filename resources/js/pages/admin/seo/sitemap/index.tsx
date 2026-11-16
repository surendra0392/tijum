import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    ExternalLink,
    Globe,
    RefreshCw,
    Search,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/layouts/admin-layout';

interface SitemapEntry {
    loc: string;
    lastmod: string;
    changefreq: string;
    priority: string;
}

interface Props {
    urls: SitemapEntry[];
    totalUrls: number;
    sitemapUrl: string;
}

export default function AdminSitemapIndex({
    urls,
    totalUrls,
    sitemapUrl,
}: Props) {
    const [filterText, setFilterText] = useState('');
    const [isClearing, setIsClearing] = useState(false);

    const handleClearCache = () => {
        setIsClearing(true);
        router.post(
            '/admin/seo/sitemap/clear-cache',
            {},
            {
                onFinish: () => setIsClearing(false),
            },
        );
    };

    const filteredUrls = urls.filter((u) =>
        u.loc.toLowerCase().includes(filterText.toLowerCase()),
    );

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'SEO Management', href: '/admin/seo' },
                { title: 'Sitemap Status', href: '/admin/seo/sitemap' },
            ]}
        >
            <Head title="XML Sitemap Inspection — Marketplace SEO" />

            <div className="space-y-6 pb-10">
                <PageHeader
                    eyebrow="SEO · Search Discovery"
                    title="Dynamic XML Sitemap"
                    description="Live sitemap index crawled by Google, Bing, and major search engines for discovery."
                    actions={
                        <>
                            <Button asChild variant="outline" size="sm">
                                <a
                                    href={sitemapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <span>Open Raw XML</span>
                                    <ExternalLink
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </a>
                            </Button>
                            <Button
                                type="button"
                                onClick={handleClearCache}
                                disabled={isClearing}
                            >
                                <RefreshCw
                                    className={`size-4 ${isClearing ? 'animate-spin' : ''}`}
                                    aria-hidden="true"
                                />
                                <span>Purge &amp; Regenerate Cache</span>
                            </Button>
                        </>
                    }
                />

                {/* Sitemap Stats Banner */}
                <Card className="py-4">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-status-success-border bg-status-success-bg text-status-success-fg">
                                <CheckCircle2
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="space-y-0.5">
                                <div className="font-heading text-sm font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                    {totalUrls.toLocaleString()} Indexed URL
                                    Entries
                                </div>
                                <div className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Cached for 24 hours. Automatically
                                    invalidated upon article, page, or property
                                    publishing.
                                </div>
                            </div>
                        </div>

                        <div className="w-full sm:w-80">
                            <div className="relative">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    type="text"
                                    value={filterText}
                                    onChange={(e) =>
                                        setFilterText(e.target.value)
                                    }
                                    placeholder="Filter listed URLs..."
                                    className="h-10 pl-10 text-sm"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* URLs Table */}
                {filteredUrls.length === 0 ? (
                    <EmptyState
                        icon={Globe}
                        title="No URLs match your filter"
                        description="Adjust your URL filter or purge and regenerate the XML sitemap cache."
                        action={
                            filterText ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFilterText('')}
                                >
                                    Clear Filter
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <Card className="overflow-hidden py-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        Location (Canonical URL)
                                    </TableHead>
                                    <TableHead>Change Frequency</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead className="text-right">
                                        Last Modified
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUrls.map((item, idx) => (
                                    <TableRow key={`${item.loc}-${idx}`}>
                                        <TableCell className="font-mono text-xs font-medium break-all">
                                            <a
                                                href={item.loc}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-tijum-plum transition-colors hover:text-tijum-coral hover:underline dark:text-foreground dark:hover:text-tijum-coral"
                                            >
                                                {item.loc}
                                            </a>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[10px] uppercase"
                                            >
                                                {item.changefreq}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                            {item.priority}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            {item.lastmod}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>
        </AdminLayout>
    );
}
