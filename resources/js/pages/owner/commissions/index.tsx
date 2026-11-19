import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    FileSignature,
} from 'lucide-react';
import { useState } from 'react';
import {
    OWNER_FINANCE_TABS,
    OwnerSectionTabs,
} from '@/components/owner/owner-section-tabs';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface AgreementData {
    id: number;
    agreement_reference: string;
    property_name: string;
    commission_rate_bps: number;
    commission_rate_percentage: number;
    commission_base_type: string;
    commission_base_label: string;
    commission_gst_type: string;
    commission_gst_label: string;
    terms_version: string;
    status: string;
    status_label: string;
    effective_from: string;
    effective_until?: string;
    accepted_at?: string;
    is_pending_acceptance: boolean;
    is_active: boolean;
}

interface Props {
    agreements: AgreementData[];
    active_agreement: AgreementData | null;
    pending_agreement: AgreementData | null;
}

function getStatusSemantic(status: string): SemanticStatus {
    switch (status) {
        case 'active':
            return 'active';
        case 'pending_acceptance':
            return 'processing';
        case 'superseded':
            return 'neutral';
        case 'terminated':
            return 'rejected';
        default:
            return 'pending';
    }
}

export default function CommissionAgreementsIndex({
    agreements,
    active_agreement,
    pending_agreement,
}: Props) {
    const [acknowledged, setAcknowledged] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const totalPages = Math.max(1, Math.ceil(agreements.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedAgreements = agreements.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
    );

    const handleAccept = (agreementId: number) => {
        if (!acknowledged) return;
        setAccepting(true);
        router.post(
            `/owner/commission-agreements/${agreementId}/accept`,
            {},
            {
                onFinish: () => setAccepting(false),
            },
        );
    };

    return (
        <div className="space-y-6">
            <Head title="Commercial Agreements & Commission Terms" />

            <OwnerSectionTabs
                items={OWNER_FINANCE_TABS}
                ariaLabel="Earnings and payouts navigation"
            />

            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-tijum-plum dark:text-foreground">
                        Marketplace Commission Agreements
                    </h1>
                    <p className="mt-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        Transparent, contractually agreed platform commission
                        rates and terms for your accommodation listings.
                    </p>
                </div>
            </div>

            {/* Pending Acceptance Action Banner */}
            {pending_agreement && (
                <div className="rounded-3xl border-2 border-amber-300 bg-card p-6 shadow-tijum-card dark:border-amber-500/45">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                            <FileSignature className="size-6" />
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                <div>
                                    <span className="font-heading text-xs font-bold tracking-wider text-amber-800 uppercase dark:text-amber-300">
                                        Action Required: Review &amp; Accept
                                        Agreement
                                    </span>
                                    <h3 className="font-heading text-lg font-bold text-tijum-plum dark:text-foreground">
                                        {pending_agreement.agreement_reference}{' '}
                                        ({pending_agreement.property_name})
                                    </h3>
                                </div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/80 px-3 py-1 font-heading text-xs font-semibold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                                    <Clock className="size-3.5" />
                                    Awaiting Partner Signature
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4 rounded-xl border border-amber-200 bg-white/85 p-4 text-xs sm:grid-cols-3 dark:border-border dark:bg-card">
                                <div>
                                    <span className="text-[10px] font-semibold text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Agreed Commission
                                    </span>
                                    <p className="font-heading text-base font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                        {
                                            pending_agreement.commission_rate_percentage
                                        }
                                        %
                                    </p>
                                    <p className="text-[11px] tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                                        ({pending_agreement.commission_rate_bps}{' '}
                                        basis points)
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Calculation Base
                                    </span>
                                    <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                        {
                                            pending_agreement.commission_base_label
                                        }
                                    </p>
                                    <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        {pending_agreement.commission_gst_label}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Effective Date
                                    </span>
                                    <p className="font-heading text-sm font-semibold tabular-nums text-tijum-plum dark:text-foreground">
                                        From {pending_agreement.effective_from}
                                    </p>
                                    <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        Version:{' '}
                                        {pending_agreement.terms_version}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-start space-x-2.5">
                                    <Checkbox
                                        id="terms_acknowledge"
                                        checked={acknowledged}
                                        onCheckedChange={(c) =>
                                            setAcknowledged(Boolean(c))
                                        }
                                    />
                                    <label
                                        htmlFor="terms_acknowledge"
                                        className="cursor-pointer text-xs leading-relaxed text-tijum-plum dark:text-foreground"
                                    >
                                        I have reviewed and accept the
                                        contractual commission rate of{' '}
                                        <strong>
                                            {
                                                pending_agreement.commission_rate_percentage
                                            }
                                            %
                                        </strong>{' '}
                                        on eligible bookings and agree to the
                                        settlement deduction terms under TIJUM
                                        marketplace policy.
                                    </label>
                                </div>

                                <Button
                                    type="button"
                                    variant="default"
                                    disabled={!acknowledged || accepting}
                                    loading={accepting}
                                    onClick={() =>
                                        handleAccept(pending_agreement.id)
                                    }
                                    className="px-6 font-bold"
                                >
                                    <CheckCircle2 className="mr-1.5 size-4" />
                                    Accept Commercial Terms & Activate
                                    Settlements
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Currently Active Agreement Card */}
            {active_agreement && (
                <Card className="border-emerald-300/80 border-l-4 border-l-emerald-500 dark:border-emerald-500/40">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardDescription className="text-xs font-semibold tracking-wider text-emerald-800 uppercase dark:text-emerald-300">
                                    Current Effective Commercial Agreement
                                </CardDescription>
                                <CardTitle className="mt-1 font-heading text-xl font-bold text-emerald-950 dark:text-emerald-100">
                                    {active_agreement.agreement_reference}
                                </CardTitle>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 font-heading text-xs font-semibold text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-900/50 dark:text-emerald-200">
                                <CheckCircle2 className="size-3.5 text-emerald-700 dark:text-emerald-300" />
                                Active &amp; Effective
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-6 rounded-2xl border border-emerald-100 bg-card p-5 text-xs sm:grid-cols-4 dark:border-border">
                            <div>
                                <span className="text-[10px] font-semibold text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                    Commission Rate
                                </span>
                                <p className="mt-0.5 font-heading text-2xl font-bold tabular-nums text-emerald-900 dark:text-emerald-300">
                                    {
                                        active_agreement.commission_rate_percentage
                                    }
                                    %
                                </p>
                                <p className="text-[11px] tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                                    ({active_agreement.commission_rate_bps} basis
                                    points)
                                </p>
                            </div>
                            <div>
                                <span className="text-[10px] font-semibold text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                    Property Scope
                                </span>
                                <p className="mt-0.5 font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    {active_agreement.property_name}
                                </p>
                                <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                    Terms Version:{' '}
                                    {active_agreement.terms_version}
                                </p>
                            </div>
                            <div>
                                <span className="text-[10px] font-semibold text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                    Commission Base
                                </span>
                                <p className="mt-0.5 font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    {active_agreement.commission_base_label}
                                </p>
                                <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                    {active_agreement.commission_gst_label}
                                </p>
                            </div>
                            <div>
                                <span className="text-[10px] font-semibold text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                    Acceptance Proof
                                </span>
                                <p className="mt-0.5 font-heading text-sm font-semibold tabular-nums text-tijum-plum dark:text-foreground">
                                    Signed:{' '}
                                    {active_agreement.accepted_at
                                        ? new Date(
                                              active_agreement.accepted_at,
                                          ).toLocaleDateString()
                                        : 'Active'}
                                </p>
                                <p className="text-[11px] tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                                    Effective: {active_agreement.effective_from}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* All Historical Agreements Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                        Agreement History &amp; Versioning ({agreements.length})
                    </CardTitle>
                    <CardDescription className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        Full contractual audit trail. In accordance with
                        marketplace rules, newly negotiated rates apply
                        forward-only and never alter historical booking
                        snapshots.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-tijum-surface bg-tijum-cream/50 font-heading font-semibold tracking-wider text-tijum-plum uppercase dark:border-border dark:bg-muted/45 dark:text-foreground">
                                <tr>
                                    <th className="px-5 py-3.5">
                                        Reference / Version
                                    </th>
                                    <th className="px-5 py-3.5">Scope</th>
                                    <th className="px-5 py-3.5">
                                        Commission Rate
                                    </th>
                                    <th className="px-5 py-3.5">
                                        Calculation Base
                                    </th>
                                    <th className="px-5 py-3.5">
                                        Effective Dates
                                    </th>
                                    <th className="px-5 py-3.5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-tijum-surface/70 text-tijum-plum dark:divide-border dark:text-foreground">
                                {pagedAgreements.map((a) => (
                                    <tr
                                        key={a.id}
                                        className="transition-colors hover:bg-tijum-cream/25 dark:hover:bg-muted/35"
                                    >
                                        <td className="px-5 py-4">
                                            <span className="block font-mono font-bold text-tijum-coral dark:text-tijum-peach">
                                                {a.agreement_reference}
                                            </span>
                                            <span className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                Version: {a.terms_version}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-medium">
                                            {a.property_name}
                                        </td>
                                        <td className="px-5 py-4 font-heading text-sm font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                            {a.commission_rate_percentage}%
                                        </td>
                                        <td className="px-5 py-4 text-tijum-plum-muted dark:text-muted-foreground">
                                            <span className="block font-medium text-tijum-plum dark:text-foreground">
                                                {a.commission_base_label}
                                            </span>
                                            <span className="text-[11px]">
                                                {a.commission_gst_label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                                            <span>{a.effective_from}</span>
                                            {a.effective_until && (
                                                <span>
                                                    {' '}
                                                    to {a.effective_until}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <StatusBadge
                                                status={getStatusSemantic(
                                                    a.status,
                                                )}
                                                label={a.status_label}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {agreements.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 text-xs text-tijum-plum-muted tabular-nums dark:border-border dark:bg-muted/20 dark:text-muted-foreground">
                            <span>
                                Showing {(safePage - 1) * pageSize + 1}–
                                {Math.min(
                                    safePage * pageSize,
                                    agreements.length,
                                )}{' '}
                                of {agreements.length} agreement
                                {agreements.length === 1 ? '' : 's'}
                            </span>
                            <Pagination
                                currentPage={safePage}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
