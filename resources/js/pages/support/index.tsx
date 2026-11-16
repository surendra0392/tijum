import { Head, Link } from '@inertiajs/react';
import {
    ChevronRight,
    FileText,
    Headphones,
    LifeBuoy,
    Shield,
    ShieldCheck,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { grievanceRedressal } from '@/routes/public';
import { index as reservationsIndex } from '@/routes/reservations';
import {
    acknowledgement as supportAcknowledgement,
    index as supportIndex,
    show as supportShow,
} from '@/routes/support/cases';

interface SupportCaseItem {
    id: number;
    case_reference: string;
    booking_reference: string;
    property_name: string;
    city_name?: string | null;
    category: string;
    category_label: string;
    status: string;
    status_label: string;
    priority: string;
    description: string;
    sla_due_at?: string | null;
    resolved_at?: string | null;
    created_at: string;
}

interface SupportIndexProps {
    cases: {
        data: SupportCaseItem[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
    };
    grievanceOfficer?: {
        name: string;
        designation: string;
        email: string;
        phone: string;
    };
}

const statusVariantMap: Record<
    string,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    submitted: 'outline',
    acknowledged: 'secondary',
    under_review: 'secondary',
    awaiting_owner: 'outline',
    awaiting_customer: 'destructive',
    relocation_offered: 'default',
    refund_pending: 'outline',
    resolved: 'secondary',
    closed: 'outline',
};

export default function SupportIndex({
    cases,
    grievanceOfficer,
}: SupportIndexProps) {
    return (
        <ResponsiveContainer className="py-6 sm:py-8">
            <div className="space-y-6 pb-12">
                <Head title="Support & Protection Cases" />

                <PageHeader
                    breadcrumbs={[
                        { title: 'Dashboard', href: '/dashboard' },
                        { title: 'Support & Grievances', href: '/my-support' },
                    ]}
                    eyebrow="Customer Protection"
                    title="Support & Grievance Tickets"
                    description="Track reported stay issues, alternative relocation offers, and refund progress with audited ticket references."
                />

                {/* Portal Navigation Tabs */}
                <div className="flex flex-wrap items-center gap-2 border-b border-tijum-surface/80 pb-3 dark:border-border">
                    <span className="flex items-center gap-1.5 rounded-xl bg-tijum-plum px-3.5 py-2 text-xs font-semibold text-tijum-cream shadow-2xs dark:bg-tijum-coral dark:text-white">
                        <Shield className="size-3.5 text-tijum-coral dark:text-white" />
                        Stay Grievances &amp; Protection ({cases.total})
                    </span>
                    <Link
                        href="/support/tickets"
                        className="flex items-center gap-1.5 rounded-xl border border-tijum-surface/80 bg-white px-3.5 py-2 text-xs font-semibold text-tijum-plum-muted transition-colors hover:bg-tijum-cream/60 hover:text-tijum-plum dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground"
                    >
                        <Headphones className="size-3.5" />
                        Helpdesk Inquiries
                    </Link>
                </div>

                {/* Statutory Compliance Notice Banner */}
                <div className="rounded-2xl border border-tijum-surface/80 bg-white p-4 shadow-tijum-card sm:p-5 dark:border-border dark:bg-card">
                    <div className="flex items-start gap-3.5">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-coral/15 text-tijum-coral">
                            <ShieldCheck className="size-5" />
                        </span>
                        <div className="space-y-1 text-sm">
                            <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                Consumer Protection Guarantee &amp; SLAs
                            </p>
                            <p className="text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                Under Consumer Protection (E-Commerce) Rules, all
                                grievances are acknowledged within 48 hours and
                                resolved within 30 days. For urgent assistance or
                                statutory filings, review our{' '}
                                <Link
                                    href={grievanceRedressal.url()}
                                    className="font-semibold text-tijum-plum underline hover:text-tijum-coral dark:text-tijum-peach"
                                >
                                    Grievance Redressal Disclosures
                                </Link>
                                {grievanceOfficer?.name &&
                                    ` or contact Grievance Officer ${grievanceOfficer.name}.`}
                            </p>
                        </div>
                    </div>
                </div>

                {cases.data.length === 0 ? (
                    <EmptyState
                        icon={LifeBuoy}
                        title="No open support cases"
                        description="You have not reported any issues with your reservations. If you ever experience room mismatches, missing meals, or need relocation, report directly from your reservation details."
                        action={
                            <Button variant="plum" size="sm" asChild>
                                <Link href={reservationsIndex().url}>
                                    View My Reservations
                                </Link>
                            </Button>
                        }
                    />
                ) : (
                    <div className="space-y-4">
                        {cases.data.map((ticket) => (
                            <Card
                                key={ticket.id}
                                className="border-tijum-surface/80 bg-white shadow-tijum-card transition-[border-color,box-shadow] hover:border-tijum-coral/40 hover:shadow-md dark:border-border dark:bg-card"
                            >
                                <CardContent className="p-5">
                                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-tijum-plum dark:text-tijum-peach">
                                                    {ticket.case_reference}
                                                </span>
                                                <Badge
                                                    variant={
                                                        statusVariantMap[
                                                            ticket.status
                                                        ] ?? 'outline'
                                                    }
                                                    className="text-[11px]"
                                                >
                                                    {ticket.status_label}
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[11px]"
                                                >
                                                    {ticket.category_label}
                                                </Badge>
                                            </div>

                                            <p className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                                {ticket.property_name}
                                                {ticket.city_name && (
                                                    <span className="ml-1 text-xs font-normal text-tijum-plum-muted dark:text-muted-foreground">
                                                        ({ticket.city_name})
                                                    </span>
                                                )}
                                            </p>

                                            <p className="line-clamp-2 text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                                {ticket.description}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                <span>
                                                    Booking:{' '}
                                                    <strong className="font-mono text-tijum-plum dark:text-foreground">
                                                        {ticket.booking_reference}
                                                    </strong>
                                                </span>
                                                <span
                                                    className="h-3 border-l border-tijum-surface dark:border-border"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    Created:{' '}
                                                    {new Date(
                                                        ticket.created_at,
                                                    ).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                                className="text-xs"
                                            >
                                                <Link
                                                    href={supportAcknowledgement(
                                                        ticket.case_reference,
                                                    )}
                                                    title="View statutory complaint record copy"
                                                >
                                                    <FileText className="mr-1.5 size-3.5" />
                                                    <span>Copy</span>
                                                </Link>
                                            </Button>

                                            <Button
                                                variant="plum"
                                                size="sm"
                                                asChild
                                                className="text-xs"
                                            >
                                                <Link
                                                    href={supportShow(
                                                        ticket.case_reference,
                                                    )}
                                                >
                                                    <span>View Details</span>
                                                    <ChevronRight className="ml-1 size-3.5" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 pt-4 dark:border-border">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {cases.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {cases.total}
                                </span>{' '}
                                case{cases.total === 1 ? '' : 's'}
                            </p>
                            <Pagination
                                currentPage={cases.current_page}
                                totalPages={cases.last_page}
                                getPageHref={(page) =>
                                    supportIndex({ query: { page } }).url
                                }
                            />
                        </div>
                    </div>
                )}
            </div>
        </ResponsiveContainer>
    );
}
