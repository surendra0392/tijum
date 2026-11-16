import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Printer } from 'lucide-react';
import BrandLogo from '@/components/brand/brand-logo';
import { Button } from '@/components/ui/button';

interface AcknowledgementProps {
    case: {
        id: number;
        case_reference: string;
        category_label: string;
        description: string;
        status_label: string;
        created_at: string;
        acknowledged_at: string;
        sla_due_at?: string | null;
        customer_name: string;
        customer_email: string;
        booking_reference: string;
        property_name: string;
        city_name?: string | null;
    };
    grievanceOfficer?: {
        name: string;
        designation: string;
        email: string;
        phone: string;
        address?: string;
    };
}

export default function SupportAcknowledgement({
    case: ticket,
    grievanceOfficer,
}: AcknowledgementProps) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-4 text-tijum-plum sm:p-8 dark:text-foreground print:bg-white print:p-0 print:text-neutral-950">
            <Head title={`Grievance Record — ${ticket.case_reference}`} />

            {/* Print toolbar (hidden when printing) */}
            <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
                <Button asChild variant="outline" size="sm">
                    <Link href={`/my-support/${ticket.case_reference}`}>
                        <ArrowLeft className="mr-1.5 size-3.5" />
                        <span>Back to Support Ticket</span>
                    </Link>
                </Button>

                <Button
                    type="button"
                    size="sm"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 text-xs"
                >
                    <Printer className="size-3.5" />
                    <span>Print / Save as PDF</span>
                </Button>
            </div>

            {/* Official Complaint Document */}
            <div className="mx-auto max-w-3xl rounded-[22px] border border-tijum-surface/80 bg-white p-6 shadow-tijum-card sm:p-10 dark:border-border dark:bg-card print:rounded-none print:border-none print:bg-white print:p-0 print:text-neutral-950 print:shadow-none">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 border-b border-tijum-surface pb-6 sm:flex-row sm:items-center dark:border-border print:border-neutral-200">
                    <div>
                        <div className="dark:hidden print:block">
                            <BrandLogo
                                variant="horizontal"
                                tone="light"
                                size="md"
                            />
                        </div>
                        <div className="hidden dark:block print:hidden">
                            <BrandLogo
                                variant="horizontal"
                                tone="dark"
                                size="md"
                            />
                        </div>
                        <p className="mt-1.5 font-heading text-xs font-semibold tracking-wider text-tijum-coral uppercase dark:text-tijum-peach print:text-[#FF7A67]">
                            Grievance Redressal Cell
                        </p>
                    </div>

                    <div className="text-left text-xs text-tijum-plum-muted sm:text-right dark:text-muted-foreground print:text-neutral-600">
                        <p className="font-mono text-sm font-bold text-tijum-plum dark:text-foreground print:text-neutral-950">
                            {ticket.case_reference}
                        </p>
                        <p>Statutory Complaint Record Copy</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-emerald-700 sm:justify-end dark:text-emerald-400 print:text-emerald-700">
                            <CheckCircle2 className="size-3" />
                            <span>Acknowledged</span>
                        </p>
                    </div>
                </div>

                {/* Statutory Reference Notice */}
                <div className="mt-6 rounded-xl border border-tijum-surface/70 bg-tijum-cream/55 p-4 text-xs leading-relaxed text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground print:border-neutral-200 print:bg-neutral-100 print:text-neutral-700">
                    <p className="font-heading font-semibold text-tijum-plum dark:text-foreground print:text-neutral-950">
                        Consumer Protection (E-Commerce) Rules, 2020 — Mandatory
                        Redressal Notice
                    </p>
                    <p className="mt-1 text-[11px]">
                        This official acknowledgment serves as conclusive proof
                        of grievance registration under Rule 4(4) and Rule
                        5(3)(b) of the Consumer Protection (E-Commerce) Rules,
                        2020. The ticket reference number must be quoted in all
                        correspondence.
                    </p>
                </div>

                {/* Complainant & Booking Information */}
                <div className="mt-6 grid gap-6 text-xs sm:grid-cols-2">
                    <div className="space-y-3">
                        <h2 className="font-heading text-sm font-bold tracking-wide text-tijum-plum uppercase dark:text-foreground print:text-neutral-950">
                            Complainant Details
                        </h2>
                        <div className="space-y-1">
                            <p className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                                Name
                            </p>
                            <p className="font-semibold text-tijum-plum dark:text-foreground print:text-neutral-950">
                                {ticket.customer_name}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                                Registered Email
                            </p>
                            <p className="font-semibold text-tijum-plum dark:text-foreground print:text-neutral-950">
                                {ticket.customer_email}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h2 className="font-heading text-sm font-bold tracking-wide text-tijum-plum uppercase dark:text-foreground print:text-neutral-950">
                            Stay / Booking Reference
                        </h2>
                        <div className="space-y-1">
                            <p className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                                Reservation Code
                            </p>
                            <p className="font-mono font-bold text-tijum-plum dark:text-foreground print:text-neutral-950">
                                {ticket.booking_reference}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                                Property Name
                            </p>
                            <p className="font-semibold text-tijum-plum dark:text-foreground print:text-neutral-950">
                                {ticket.property_name}{' '}
                                {ticket.city_name && `(${ticket.city_name})`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Grievance Particulars */}
                <div className="mt-8 space-y-4 border-t border-tijum-surface pt-6 text-xs dark:border-border print:border-neutral-200">
                    <h2 className="font-heading text-sm font-bold tracking-wide text-tijum-plum uppercase dark:text-foreground print:text-neutral-950">
                        Grievance Particulars
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <span className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                                Grievance Category
                            </span>
                            <p className="mt-0.5 font-semibold text-tijum-plum dark:text-foreground print:text-neutral-950">
                                {ticket.category_label}
                            </p>
                        </div>
                        <div>
                            <span className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                                Filing Date &amp; Time
                            </span>
                            <p className="mt-0.5 font-semibold text-tijum-plum dark:text-foreground print:text-neutral-950">
                                {new Date(ticket.created_at).toLocaleString(
                                    'en-IN',
                                    {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    },
                                )}
                            </p>
                        </div>
                        <div>
                            <span className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                                Maximum Statutory Resolution SLA
                            </span>
                            <p className="mt-0.5 font-semibold text-tijum-coral dark:text-tijum-peach print:text-[#FF7A67]">
                                {ticket.sla_due_at
                                    ? new Date(
                                          ticket.sla_due_at,
                                      ).toLocaleDateString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                      })
                                    : '30 Days from Filing'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-1 pt-2">
                        <span className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                            Complaint Statement
                        </span>
                        <div className="rounded-xl border border-tijum-surface/70 bg-tijum-cream/55 p-4 font-mono text-[11px] leading-relaxed text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground print:border-neutral-200 print:bg-neutral-50 print:text-neutral-950">
                            {ticket.description}
                        </div>
                    </div>
                </div>

                {/* Grievance Officer Disclosures */}
                {grievanceOfficer && (
                    <div className="mt-8 space-y-2 border-t border-tijum-surface pt-6 text-xs dark:border-border print:border-neutral-200">
                        <h2 className="font-heading text-sm font-bold tracking-wide text-tijum-plum uppercase dark:text-foreground print:text-neutral-950">
                            Designated Grievance Officer (E-Commerce
                            Disclosures)
                        </h2>
                        <p className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                            <strong className="text-tijum-plum dark:text-foreground print:text-neutral-950">
                                {grievanceOfficer.name}
                            </strong>
                            , {grievanceOfficer.designation}
                        </p>
                        <p className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                            Email:{' '}
                            <strong className="text-tijum-plum dark:text-foreground print:text-neutral-950">
                                {grievanceOfficer.email}
                            </strong>{' '}
                            | Contact:{' '}
                            <strong className="text-tijum-plum dark:text-foreground print:text-neutral-950">
                                {grievanceOfficer.phone}
                            </strong>
                        </p>
                        {grievanceOfficer.address && (
                            <p className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                                Address: {grievanceOfficer.address}
                            </p>
                        )}
                    </div>
                )}

                {/* Footer Declaration */}
                <div className="mt-8 flex flex-col justify-between gap-4 border-t border-tijum-surface pt-6 text-[11px] text-tijum-plum-muted sm:flex-row sm:items-center dark:border-border dark:text-muted-foreground print:border-neutral-200 print:text-neutral-600">
                    <p>
                        Generated electronically by TIJUM Consumer Protection
                        Platform.
                    </p>
                    <p className="font-heading font-semibold text-tijum-plum dark:text-foreground print:text-neutral-950">
                        TIJUM · Stay easy. Eat well. Spend less.
                    </p>
                </div>
            </div>
        </div>
    );
}
