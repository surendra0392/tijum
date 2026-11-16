import { Head, Link } from '@inertiajs/react';
import {
    ChevronRight,
    LifeBuoy,
    MessageSquareWarning,
    ShieldAlert,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OwnerCaseItem {
    id: number;
    case_reference: string;
    booking_reference: string;
    property_name: string;
    room_type_name?: string | null;
    category: string;
    category_label: string;
    status: string;
    status_label: string;
    priority: string;
    description: string;
    created_at: string;
}

interface OwnerCasesIndexProps {
    cases: {
        data: OwnerCaseItem[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
    };
}

const statusVariantMap: Record<
    string,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    submitted: 'outline',
    acknowledged: 'secondary',
    under_review: 'secondary',
    awaiting_owner: 'destructive',
    awaiting_customer: 'outline',
    relocation_offered: 'default',
    refund_pending: 'outline',
    resolved: 'secondary',
    closed: 'outline',
};

export default function OwnerCasesIndex({ cases }: OwnerCasesIndexProps) {
    return (
        <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <Head title="Guest Cases &amp; Inquiries" />

            <PageHeader
                eyebrow="Partner Operations"
                title="Guest Support &amp; Problem Reports"
                description="Review reported room mismatches, meal inquiries, or host resolution requests for your properties."
            />

            {cases.data.length === 0 ? (
                <EmptyState
                    icon={ShieldAlert}
                    title="No open guest reports"
                    description="None of your guests have filed active complaints or protection cases. When a guest submits a case regarding room type, cleanliness, or meal fulfillment, it will appear here."
                />
            ) : (
                <div className="space-y-4">
                    {cases.data.map((item) => (
                        <Card
                            key={item.id}
                            className="transition-all hover:border-tijum-coral/40 hover:shadow-md"
                        >
                            <CardContent className="p-5">
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                    <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-tijum-coral">
                                                {item.case_reference}
                                            </span>
                                            <Badge
                                                variant={
                                                    statusVariantMap[
                                                        item.status
                                                    ] ?? 'outline'
                                                }
                                                className="text-[11px]"
                                            >
                                                {item.status_label}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="text-[11px]"
                                            >
                                                {item.category_label}
                                            </Badge>
                                        </div>

                                        <p className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                            {item.property_name}
                                            {item.room_type_name && (
                                                <span className="ml-1 text-xs font-normal text-tijum-plum-muted dark:text-muted-foreground">
                                                    · {item.room_type_name}
                                                </span>
                                            )}
                                        </p>

                                        <p className="line-clamp-2 text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                            {item.description}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                                            <span>
                                                Booking:{' '}
                                                <strong className="font-mono text-tijum-plum dark:text-foreground">
                                                    {item.booking_reference}
                                                </strong>
                                            </span>
                                            <span>•</span>
                                            <span>
                                                Created:{' '}
                                                {new Date(
                                                    item.created_at,
                                                ).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <Button size="sm" variant="plum" asChild>
                                            <Link
                                                href={`/owner/cases/${item.case_reference}`}
                                            >
                                                <span>Respond</span>
                                                <ChevronRight className="size-3.5" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                            Showing{' '}
                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                {cases.data.length}
                            </span>{' '}
                            of{' '}
                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                {cases.total}
                            </span>{' '}
                            {cases.total === 1 ? 'case' : 'cases'}
                        </p>
                        <Pagination
                            currentPage={cases.current_page}
                            totalPages={cases.last_page}
                            getPageHref={(page) => `/owner/cases?page=${page}`}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
