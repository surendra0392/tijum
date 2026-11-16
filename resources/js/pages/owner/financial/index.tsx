import { Head, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Building2,
    CheckCircle2,
    Clock,
    CreditCard,
    FileText,
    HelpCircle,
    Info,
    Lock,
    Save,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface FinancialProfileData {
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
    rejection_reason?: string;
    verified_at?: string;
}

interface Props {
    profile: FinancialProfileData | null;
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

export default function FinancialProfileIndex({ profile }: Props) {
    const isLocked =
        profile?.onboarding_status === 'active' ||
        profile?.onboarding_status === 'under_review';

    const { data, setData, put, processing, errors, recentlySuccessful } =
        useForm({
            legal_business_name: profile?.legal_business_name ?? '',
            business_constitution:
                profile?.business_constitution ?? 'individual',
            pan_number: profile?.pan_number ?? '',
            gst_registered: profile?.gst_registered ?? false,
            gstin: profile?.gstin ?? '',
            supplier_legal_classification:
                profile?.supplier_legal_classification ?? 'unregistered_hostel',
            bank_beneficiary_name: profile?.bank_beneficiary_name ?? '',
            bank_account_number: '',
            bank_account_number_confirmation: '',
            bank_ifsc: profile?.bank_ifsc ?? '',
            bank_name: profile?.bank_name ?? '',
        });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/owner/financial-profile');
    };

    return (
        <div className="space-y-8 p-6 lg:p-8">
            <Head title="Bank & Financial Onboarding" />

            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-tijum-plum dark:text-foreground">
                        Bank Details &amp; Financial Profile
                    </h1>
                    <p className="mt-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        Register your verified business identity and settlement
                        bank account for direct booking disbursements.
                    </p>
                </div>

                {profile && (
                    <div className="flex items-center gap-2">
                        <StatusBadge
                            status={getOnboardingSemantic(
                                profile.onboarding_status,
                            )}
                            label={profile.onboarding_label}
                        />
                    </div>
                )}
            </div>

            {/* Rejection / Status Alerts */}
            {profile?.rejection_reason && (
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Financial Verification Required</AlertTitle>
                    <AlertDescription>
                        {profile.rejection_reason}. Please update your business
                        or banking credentials below to resubmit.
                    </AlertDescription>
                </Alert>
            )}

            {recentlySuccessful && (
                <Alert variant="success">
                    <CheckCircle2 className="size-4" />
                    <AlertTitle>Profile Submitted</AlertTitle>
                    <AlertDescription>
                        Your partner financial profile has been submitted for
                        KYC verification and provider linked-account activation.
                    </AlertDescription>
                </Alert>
            )}

            {/* Status Summary Cards */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription className="text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            Legal Tax Identity
                        </CardDescription>
                        <CardTitle className="flex items-center justify-between font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                            <span>
                                {profile?.pan_number
                                    ? `PAN: ${profile.pan_number}`
                                    : 'PAN Not Registered'}
                            </span>
                            {profile?.pan_verified ? (
                                <CheckCircle2 className="size-4 text-status-success-fg" />
                            ) : (
                                <Clock className="size-4 text-status-warning-fg" />
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        {profile?.gst_registered
                            ? `GSTIN: ${profile.gstin}`
                            : 'GST Unregistered / Below Threshold'}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription className="text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            Disbursement Destination
                        </CardDescription>
                        <CardTitle className="flex items-center justify-between font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                            <span className="tabular-nums">
                                {profile?.bank_account_number_masked ??
                                    'No Account Set'}
                            </span>
                            {profile?.beneficiary_verified ? (
                                <CheckCircle2 className="size-4 text-status-success-fg" />
                            ) : (
                                <Clock className="size-4 text-status-warning-fg" />
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        {profile?.bank_name
                            ? `${profile.bank_name} (${profile.bank_ifsc})`
                            : 'Awaiting bank details entry'}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription className="text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            Gateway Route Account
                        </CardDescription>
                        <CardTitle className="flex items-center justify-between font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                            <span>
                                {profile?.linked_account_label ?? 'Not Linked'}
                            </span>
                            <ShieldCheck className="size-4 text-tijum-coral" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="font-mono text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        {profile?.razorpay_account_id
                            ? `ID: ${profile.razorpay_account_id}`
                            : 'Automatic setup on approval'}
                    </CardContent>
                </Card>
            </div>

            {/* Regulatory Guardrail Banner */}
            <div className="flex items-start gap-3 rounded-2xl border border-tijum-peach/50 bg-card p-4 text-xs text-tijum-plum shadow-tijum-card dark:border-tijum-coral/35 dark:text-foreground">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-tijum-coral" />
                <div className="space-y-1">
                    <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                        Direct Payout Architecture (RBI Master Direction
                        Compliant)
                    </p>
                    <p className="leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                        TIJUM is an accommodation marketplace, not a payment
                        aggregator. We do not store partner funds, provide
                        wallets, or issue manual cash payouts. All booking
                        settlements flow directly from customer payment escrow
                        into your verified destination bank account via
                        authorized payment provider infrastructure.
                    </p>
                </div>
            </div>

            {/* Main Financial Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Business & Tax Identity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                            1. Legal Entity &amp; Tax Information
                        </CardTitle>
                        <CardDescription className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Provide the official legal name and tax identifiers
                            for your accommodation operating entity.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="legal_business_name">
                                Legal Business / Entity Name
                            </Label>
                            <Input
                                id="legal_business_name"
                                value={data.legal_business_name}
                                onChange={(e) =>
                                    setData(
                                        'legal_business_name',
                                        e.target.value,
                                    )
                                }
                                placeholder="e.g. Sri Lakshmi Balaji Hospitality Services"
                                disabled={isLocked}
                            />
                            <InputError message={errors.legal_business_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="business_constitution">
                                Entity Constitution
                            </Label>
                            <Select
                                value={data.business_constitution}
                                onValueChange={(val) =>
                                    setData('business_constitution', val)
                                }
                                disabled={isLocked}
                            >
                                <SelectTrigger id="business_constitution">
                                    <SelectValue placeholder="Select Constitution" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="individual">
                                        Individual / Proprietorship
                                    </SelectItem>
                                    <SelectItem value="partnership">
                                        Partnership Firm
                                    </SelectItem>
                                    <SelectItem value="llp">
                                        Limited Liability Partnership (LLP)
                                    </SelectItem>
                                    <SelectItem value="private_limited">
                                        Private Limited Company
                                    </SelectItem>
                                    <SelectItem value="trust_society">
                                        Trust / Society
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError
                                message={errors.business_constitution}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pan_number">
                                Permanent Account Number (PAN)
                            </Label>
                            <Input
                                id="pan_number"
                                value={data.pan_number}
                                onChange={(e) =>
                                    setData(
                                        'pan_number',
                                        e.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="e.g. ABCDE1234F"
                                maxLength={10}
                                disabled={isLocked}
                            />
                            <InputError message={errors.pan_number} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="supplier_legal_classification">
                                Supplier Classification
                            </Label>
                            <Select
                                value={data.supplier_legal_classification}
                                onValueChange={(val) =>
                                    setData(
                                        'supplier_legal_classification',
                                        val,
                                    )
                                }
                                disabled={isLocked}
                            >
                                <SelectTrigger id="supplier_legal_classification">
                                    <SelectValue placeholder="Select Classification" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unregistered_hostel">
                                        Unregistered Hostel / PG Operator
                                    </SelectItem>
                                    <SelectItem value="registered_hotelier">
                                        GST Registered Accommodation Provider
                                    </SelectItem>
                                    <SelectItem value="homestay_individual">
                                        Individual Homestay Host
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError
                                message={errors.supplier_legal_classification}
                            />
                        </div>

                        <div className="col-span-full space-y-4 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="gst_registered"
                                    checked={data.gst_registered}
                                    onCheckedChange={(checked) =>
                                        setData(
                                            'gst_registered',
                                            Boolean(checked),
                                        )
                                    }
                                    disabled={isLocked}
                                />
                                <Label
                                    htmlFor="gst_registered"
                                    className="cursor-pointer text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    My entity is registered under the Goods and
                                    Services Tax (GST) Act
                                </Label>
                            </div>

                            {data.gst_registered && (
                                <div className="max-w-md space-y-2 pl-6">
                                    <Label htmlFor="gstin">
                                        GST Identification Number (GSTIN)
                                    </Label>
                                    <Input
                                        id="gstin"
                                        value={data.gstin}
                                        onChange={(e) =>
                                            setData(
                                                'gstin',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        placeholder="e.g. 36AAAAA0000A1Z5"
                                        maxLength={15}
                                        disabled={isLocked}
                                    />
                                    <InputError message={errors.gstin} />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Section 2: Settlement Bank Account */}
                <Card>
                    <CardHeader>
                        <CardTitle className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                            2. Settlement Bank Account Details
                        </CardTitle>
                        <CardDescription className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            All net settlement disbursements are credited
                            directly to this bank account via the payment
                            gateway.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="bank_beneficiary_name">
                                Beneficiary Name (As in Bank Passbook)
                            </Label>
                            <Input
                                id="bank_beneficiary_name"
                                value={data.bank_beneficiary_name}
                                onChange={(e) =>
                                    setData(
                                        'bank_beneficiary_name',
                                        e.target.value,
                                    )
                                }
                                placeholder="Account Holder Name"
                                disabled={isLocked}
                            />
                            <InputError
                                message={errors.bank_beneficiary_name}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bank_name">Bank Name</Label>
                            <Input
                                id="bank_name"
                                value={data.bank_name}
                                onChange={(e) =>
                                    setData('bank_name', e.target.value)
                                }
                                placeholder="e.g. State Bank of India, HDFC Bank"
                                disabled={isLocked}
                            />
                            <InputError message={errors.bank_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bank_account_number">
                                Bank Account Number
                            </Label>
                            <Input
                                id="bank_account_number"
                                type="password"
                                value={data.bank_account_number}
                                onChange={(e) =>
                                    setData(
                                        'bank_account_number',
                                        e.target.value,
                                    )
                                }
                                placeholder={
                                    profile?.bank_account_number_masked
                                        ? `Existing: ${profile.bank_account_number_masked}`
                                        : 'Enter Account Number'
                                }
                                disabled={isLocked}
                            />
                            <InputError message={errors.bank_account_number} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bank_account_number_confirmation">
                                Confirm Bank Account Number
                            </Label>
                            <Input
                                id="bank_account_number_confirmation"
                                type="password"
                                value={data.bank_account_number_confirmation}
                                onChange={(e) =>
                                    setData(
                                        'bank_account_number_confirmation',
                                        e.target.value,
                                    )
                                }
                                placeholder="Re-enter Account Number"
                                disabled={isLocked}
                            />
                            <InputError
                                message={
                                    errors.bank_account_number_confirmation
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bank_ifsc">Bank IFSC Code</Label>
                            <Input
                                id="bank_ifsc"
                                value={data.bank_ifsc}
                                onChange={(e) =>
                                    setData(
                                        'bank_ifsc',
                                        e.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="e.g. SBIN0001234"
                                maxLength={11}
                                disabled={isLocked}
                            />
                            <InputError message={errors.bank_ifsc} />
                        </div>
                    </CardContent>
                </Card>

                {/* Submit Action */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="flex items-center gap-1.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        <Lock className="size-3.5 shrink-0 text-tijum-coral" />
                        Account details are encrypted and securely verified with
                        our RBI-compliant provider.
                    </p>

                    {!isLocked && (
                        <Button
                            type="submit"
                            variant="default"
                            loading={processing}
                            className="px-6 font-bold"
                        >
                            <Save className="mr-1.5 size-4" />
                            Submit Financial Profile for Verification
                        </Button>
                    )}

                    {isLocked && (
                        <p className="flex items-center gap-1.5 rounded-lg border border-status-success-border bg-status-success-bg px-3 py-1.5 text-xs font-semibold text-status-success-fg">
                            <CheckCircle2 className="size-4" />
                            Profile Verified &amp; Locked for Live Settlements
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
}
