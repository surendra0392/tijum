import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    CheckCircle2,
    Clock,
    CreditCard,
    Landmark,
    ShieldCheck,
    UserX,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FinancialProfileDetails {
    id: number;
    legal_business_name?: string;
    business_constitution?: string;
    pan_number?: string;
    pan_verified: boolean;
    gst_registered: boolean;
    gstin?: string;
    supplier_legal_classification?: string;
    razorpay_account_id?: string;
    linked_account_status: string;
    linked_account_label: string;
    bank_beneficiary_name?: string;
    bank_account_number_masked?: string;
    bank_ifsc?: string;
    bank_name?: string;
    beneficiary_verified: boolean;
    onboarding_status: string;
    onboarding_label: string;
    is_eligible: boolean;
    verified_at?: string;
    verified_by_admin?: string;
    rejection_reason?: string;
}

interface PartnerAuditData {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: string;
    properties_count: number;
    financial_profile: FinancialProfileDetails | null;
}

interface Props {
    partner: PartnerAuditData;
}

function getOnboardingSemantic(status: string): SemanticStatus {
    switch (status) {
        case 'active':
            return 'active';
        case 'submitted':
        case 'under_review':
            return 'processing';
        case 'rejected':
            return 'rejected';
        case 'suspended':
            return 'suspended';
        default:
            return 'pending';
    }
}

export default function AdminFinancialProfileShow({ partner }: Props) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectError, setRejectError] = useState<string | null>(null);

    const handleVerify = () => {
        setActionLoading('verify');
        router.post(
            `/admin/partners/financial/${partner.id}/verify`,
            {},
            { onFinish: () => setActionLoading(null) },
        );
    };

    const handleRejectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = rejectReason.trim();
        if (!trimmed) {
            setRejectError('Please enter a rejection reason.');
            return;
        }
        setRejectError(null);
        setActionLoading('reject');
        router.post(
            `/admin/partners/financial/${partner.id}/reject`,
            { rejection_reason: trimmed },
            {
                onSuccess: () => {
                    setRejectDialogOpen(false);
                    setRejectReason('');
                },
                onError: (errors) => {
                    setRejectError(
                        errors.rejection_reason ??
                            errors.reason ??
                            'Unable to reject financial profile.',
                    );
                },
                onFinish: () => setActionLoading(null),
            },
        );
    };

    const profile = partner.financial_profile;

    return (
        <div className="space-y-6">
            <Head title={`Financial KYC Audit - ${partner.name}`} />

            <PageHeader
                eyebrow="Partner KYC Audit"
                title={partner.name}
                description={`Email: ${partner.email} · Phone: ${partner.phone} · ${partner.properties_count} registered properties`}
                badges={
                    profile ? (
                        <StatusBadge
                            status={getOnboardingSemantic(
                                profile.onboarding_status,
                            )}
                            label={profile.onboarding_label}
                        />
                    ) : undefined
                }
                actions={
                    <>
                        <Button variant="outline" asChild>
                            <Link href="/admin/partners/financial">
                                <ArrowLeft
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Back to Partner Financials</span>
                            </Link>
                        </Button>
                        {profile && profile.onboarding_status !== 'active' && (
                            <>
                                <Button
                                    type="button"
                                    variant="default"
                                    loading={actionLoading === 'verify'}
                                    onClick={handleVerify}
                                >
                                    <CheckCircle2
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Verify &amp; Approve Onboarding</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    loading={actionLoading === 'reject'}
                                    onClick={() => {
                                        setRejectError(null);
                                        setRejectDialogOpen(true);
                                    }}
                                >
                                    <UserX
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Reject Financial Profile</span>
                                </Button>
                            </>
                        )}
                    </>
                }
            />

            {!profile ? (
                <EmptyState
                    icon={Building2}
                    title="Financial Onboarding Not Submitted"
                    description="This partner has not initiated financial onboarding or submitted bank details yet."
                    action={
                        <Button variant="outline" asChild>
                            <Link href="/admin/partners/financial">
                                Return to Partner Directory
                            </Link>
                        </Button>
                    }
                />
            ) : (
                <div className="space-y-6">
                    {/* Verification & Route Audit KPI Row */}
                    <section
                        aria-label="Financial verification overview"
                        className="grid gap-4 sm:grid-cols-3"
                    >
                        <StatCard
                            label="Verification State"
                            value={
                                profile.is_eligible
                                    ? 'Eligible for Payouts'
                                    : 'Pending Verification'
                            }
                            helperText={`Linked Account: ${profile.linked_account_label}`}
                            icon={ShieldCheck}
                            className={
                                profile.is_eligible
                                    ? 'border-l-4 border-l-emerald-500'
                                    : 'border-l-4 border-l-amber-500'
                            }
                        />
                        <StatCard
                            label="Provider Route Account"
                            value={
                                profile.razorpay_account_id ?? 'Not Assigned'
                            }
                            helperText={`Status: ${profile.linked_account_status}`}
                            icon={CreditCard}
                        />
                        <StatCard
                            label="Audit Approver"
                            value={
                                profile.verified_by_admin ?? 'Pending Review'
                            }
                            helperText={
                                profile.verified_at
                                    ? new Date(
                                          profile.verified_at,
                                      ).toLocaleString('en-IN')
                                    : 'Not verified yet'
                            }
                            icon={Clock}
                        />
                    </section>

                    {profile.rejection_reason && (
                        <Alert
                            variant="destructive"
                            className="border-l-4 border-l-destructive"
                        >
                            <AlertCircle className="size-4" />
                            <AlertTitle>Rejection Reason</AlertTitle>
                            <AlertDescription>
                                {profile.rejection_reason}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Legal Tax Entity Information */}
                        <Card>
                            <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Building2
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Legal Business &amp; Tax Compliance
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                    <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Legal Entity Name
                                    </span>
                                    <p className="mt-1 font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                        {profile.legal_business_name ?? '—'}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                    <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Entity Constitution
                                    </span>
                                    <p className="mt-1 text-sm font-semibold text-tijum-plum capitalize dark:text-foreground">
                                        {profile.business_constitution
                                            ? profile.business_constitution.replace(
                                                  '_',
                                                  ' ',
                                              )
                                            : '—'}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                    <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Permanent Account Number (PAN)
                                    </span>
                                    <p className="mt-1 flex items-center gap-1.5 font-mono text-sm font-bold text-tijum-plum tabular-nums dark:text-foreground">
                                        <span>
                                            {profile.pan_number ??
                                                'Not Provided'}
                                        </span>
                                        {profile.pan_verified && (
                                            <CheckCircle2
                                                className="size-4 text-status-success-fg"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                    <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        GST Registration Status
                                    </span>
                                    <p className="mt-1 font-mono text-sm font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                        {profile.gst_registered
                                            ? `Registered: ${profile.gstin}`
                                            : 'Unregistered / Below Threshold'}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 sm:col-span-2 dark:border-border dark:bg-muted/45">
                                    <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Supplier Classification
                                    </span>
                                    <p className="mt-1 text-sm font-semibold text-tijum-plum capitalize dark:text-foreground">
                                        {profile.supplier_legal_classification
                                            ? profile.supplier_legal_classification.replace(
                                                  '_',
                                                  ' ',
                                              )
                                            : '—'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Destination Bank Account Information */}
                        <Card>
                            <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Landmark
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Destination Bank Account for Payouts
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                    <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Beneficiary Name
                                    </span>
                                    <p className="mt-1 flex items-center gap-1.5 font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                        <span>
                                            {profile.bank_beneficiary_name ??
                                                '—'}
                                        </span>
                                        {profile.beneficiary_verified && (
                                            <CheckCircle2
                                                className="size-4 text-status-success-fg"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                    <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Bank Name
                                    </span>
                                    <p className="mt-1 text-sm font-semibold text-tijum-plum dark:text-foreground">
                                        {profile.bank_name ?? '—'}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                    <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Masked Account Number
                                    </span>
                                    <p className="mt-1 font-mono text-sm font-bold text-tijum-plum tabular-nums dark:text-foreground">
                                        {profile.bank_account_number_masked ??
                                            '—'}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                    <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        IFSC Code
                                    </span>
                                    <p className="mt-1 font-mono text-sm font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                        {profile.bank_ifsc ?? '—'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Rejection Reason Modal */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="bg-white text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                    <DialogHeader>
                        <DialogTitle>
                            Reject Partner Financial Profile
                        </DialogTitle>
                        <DialogDescription>
                            Enter the compliance or banking discrepancy reason
                            for {partner.name}. This will be shown to the
                            partner in their financial onboarding dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRejectSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="financial-reject-reason">
                                Rejection Reason
                            </Label>
                            <Textarea
                                id="financial-reject-reason"
                                rows={3}
                                value={rejectReason}
                                onChange={(e) => {
                                    setRejectReason(e.target.value);
                                    if (rejectError) {
                                        setRejectError(null);
                                    }
                                }}
                                placeholder="Enter rejection reason for partner financial profile…"
                                required
                            />
                            {rejectError && (
                                <p className="text-xs font-medium text-status-error-fg">
                                    {rejectError}
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={actionLoading === 'reject'}
                                onClick={() => setRejectDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                loading={actionLoading === 'reject'}
                            >
                                Confirm Rejection
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
