import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    FileSignature,
    Percent,
    Save,
    ShieldCheck,
} from 'lucide-react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
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

interface PartnerOption {
    id: number;
    name: string;
    email: string;
}

interface PropertyOption {
    id: number;
    owner_id: number;
    name: string;
}

interface Props {
    partners: PartnerOption[];
    properties: PropertyOption[];
}

export default function AdminCommissionAgreementCreate({
    partners,
    properties,
}: Props) {
    const { data, setData, post, processing, errors } = useForm({
        owner_id: partners[0]?.id ? String(partners[0].id) : '',
        property_id: '',
        commission_rate_bps: 1000,
        commission_base_type: 'gross_booking_amount',
        commission_gst_type: 'exclusive',
        effective_from: new Date().toISOString().split('T')[0],
        effective_until: '',
        send_for_acceptance: true,
    });

    const filteredProperties = properties.filter(
        (p) => String(p.owner_id) === String(data.owner_id),
    );

    const selectedPartner = partners.find(
        (p) => String(p.id) === String(data.owner_id),
    );
    const selectedProperty = filteredProperties.find(
        (p) => String(p.id) === String(data.property_id),
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/partner-commissions');
    };

    const effectivePercentage = (data.commission_rate_bps / 100).toFixed(2);

    return (
        <div className="space-y-6">
            <Head title="Draft Commission Agreement" />

            <PageHeader
                eyebrow="Commercial Contracts"
                title="Draft Commercial Agreement"
                description="Establish formal marketplace commission terms in integer basis points (e.g. 1000 bps = 10.00%)."
                badges={
                    <>
                        <Badge variant="plum">New Agreement</Badge>
                        <Badge variant="outline" className="gap-1.5">
                            <ShieldCheck
                                className="size-3.5 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>TOTP Guarded</span>
                        </Badge>
                    </>
                }
                actions={
                    <Button variant="outline" asChild>
                        <Link href="/admin/partner-commissions">
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            <span>Back to Agreements</span>
                        </Link>
                    </Button>
                }
            />

            <form
                onSubmit={handleSubmit}
                className="grid gap-6 lg:grid-cols-12 lg:items-start"
            >
                <div className="space-y-6 lg:col-span-8">
                    <Card>
                        <CardHeader className="border-b border-tijum-surface/80 pb-5 dark:border-border">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FileSignature
                                    className="size-4 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Commercial Contract Parameters</span>
                            </CardTitle>
                            <CardDescription>
                                Agreed rates apply forward-only and will be
                                snapshot at reservation creation.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Partner Entity */}
                            <div className="space-y-2">
                                <Label htmlFor="owner_id">Partner Entity</Label>
                                <Select
                                    value={String(data.owner_id)}
                                    onValueChange={(val) => {
                                        setData((prev) => ({
                                            ...prev,
                                            owner_id: val,
                                            property_id: '',
                                        }));
                                    }}
                                >
                                    <SelectTrigger
                                        id="owner_id"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Select Partner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {partners.map((p) => (
                                            <SelectItem
                                                key={p.id}
                                                value={String(p.id)}
                                            >
                                                {p.name} ({p.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.owner_id} />
                            </div>

                            {/* Property Scope */}
                            <div className="space-y-2">
                                <Label htmlFor="property_id">
                                    Property Scope (Optional)
                                </Label>
                                <Select
                                    value={data.property_id || 'all'}
                                    onValueChange={(val) =>
                                        setData(
                                            'property_id',
                                            val === 'all' ? '' : val,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="property_id"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="All Properties (Owner-Wide)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Properties (Owner-Wide)
                                        </SelectItem>
                                        {filteredProperties.map((prop) => (
                                            <SelectItem
                                                key={prop.id}
                                                value={String(prop.id)}
                                            >
                                                {prop.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Select a specific property for custom rates,
                                    or leave as Owner-Wide for default partner
                                    coverage.
                                </p>
                                <InputError message={errors.property_id} />
                            </div>

                            {/* Commission Rate (bps) */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="commission_rate_bps">
                                        Commission Rate (Basis Points)
                                    </Label>
                                    <Input
                                        id="commission_rate_bps"
                                        type="number"
                                        min={0}
                                        max={10000}
                                        step={10}
                                        value={data.commission_rate_bps}
                                        className="tabular-nums"
                                        onChange={(e) =>
                                            setData(
                                                'commission_rate_bps',
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                    <InputError
                                        message={errors.commission_rate_bps}
                                    />
                                </div>

                                <div className="flex flex-col justify-center rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                                    <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Effective Percentage
                                    </span>
                                    <p className="mt-1 font-heading text-2xl font-bold text-tijum-coral tabular-nums">
                                        {effectivePercentage}%
                                    </p>
                                    <p className="mt-0.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        Deducted from eligible fulfilled
                                        accommodation bookings.
                                    </p>
                                </div>
                            </div>

                            {/* Calculation Base & GST */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="commission_base_type">
                                        Calculation Base
                                    </Label>
                                    <Select
                                        value={data.commission_base_type}
                                        onValueChange={(val) =>
                                            setData('commission_base_type', val)
                                        }
                                    >
                                        <SelectTrigger
                                            id="commission_base_type"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gross_booking_amount">
                                                Gross Customer Booking Value
                                            </SelectItem>
                                            <SelectItem value="net_accommodation_amount">
                                                Net Accommodation Tariff
                                                Ex-Taxes
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={errors.commission_base_type}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="commission_gst_type">
                                        Commission GST Treatment
                                    </Label>
                                    <Select
                                        value={data.commission_gst_type}
                                        onValueChange={(val) =>
                                            setData('commission_gst_type', val)
                                        }
                                    >
                                        <SelectTrigger
                                            id="commission_gst_type"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="exclusive">
                                                18% GST Added Separately
                                                (Exclusive)
                                            </SelectItem>
                                            <SelectItem value="inclusive">
                                                GST Inclusive within Commission
                                            </SelectItem>
                                            <SelectItem value="exempt">
                                                Exempt / Not Applicable
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={errors.commission_gst_type}
                                    />
                                </div>
                            </div>

                            {/* Effective Dates */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="effective_from">
                                        Effective From
                                    </Label>
                                    <Input
                                        id="effective_from"
                                        type="date"
                                        value={data.effective_from}
                                        className="tabular-nums"
                                        onChange={(e) =>
                                            setData(
                                                'effective_from',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={errors.effective_from}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="effective_until">
                                        Effective Until (Optional)
                                    </Label>
                                    <Input
                                        id="effective_until"
                                        type="date"
                                        value={data.effective_until}
                                        className="tabular-nums"
                                        onChange={(e) =>
                                            setData(
                                                'effective_until',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={errors.effective_until}
                                    />
                                </div>
                            </div>

                            {/* Send for partner acceptance checkbox */}
                            <div className="flex items-start gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                                <Checkbox
                                    id="send_for_acceptance"
                                    checked={data.send_for_acceptance}
                                    onCheckedChange={(c) =>
                                        setData(
                                            'send_for_acceptance',
                                            Boolean(c),
                                        )
                                    }
                                    className="mt-0.5"
                                />
                                <Label
                                    htmlFor="send_for_acceptance"
                                    className="cursor-pointer text-xs leading-relaxed font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Send immediately to partner portal for
                                    explicit electronic acceptance
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <Button variant="outline" asChild>
                            <Link href="/admin/partner-commissions">
                                Cancel
                            </Link>
                        </Button>
                        <Button
                            type="submit"
                            variant="default"
                            loading={processing}
                        >
                            <Save className="size-4" aria-hidden="true" />
                            <span>Create Commercial Agreement</span>
                        </Button>
                    </div>
                </div>

                {/* Live Commercial Terms Summary Card */}
                <aside className="space-y-4 lg:col-span-4">
                    <Card className="border-l-4 border-l-tijum-coral">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Percent
                                    className="size-4 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Contract Summary</span>
                            </CardTitle>
                            <CardDescription>
                                Live preview of commercial snapshot terms.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                    Partner Entity
                                </span>
                                <p className="mt-1 font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                    {selectedPartner?.name ?? 'Not selected'}
                                </p>
                                <p className="text-tijum-plum-muted dark:text-muted-foreground">
                                    {selectedProperty
                                        ? selectedProperty.name
                                        : 'All Properties (Owner-Wide)'}
                                </p>
                            </div>

                            <div className="flex items-center justify-between border-b border-tijum-surface/60 py-2 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Commission Rate
                                </span>
                                <span className="font-heading text-sm font-bold text-tijum-coral tabular-nums">
                                    {effectivePercentage}% (
                                    {data.commission_rate_bps} bps)
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-tijum-surface/60 py-2 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Calculation Base
                                </span>
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {data.commission_base_type ===
                                    'gross_booking_amount'
                                        ? 'Gross Booking'
                                        : 'Net Tariff'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-tijum-surface/60 py-2 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    GST Treatment
                                </span>
                                <span className="font-semibold text-tijum-plum capitalize dark:text-foreground">
                                    {data.commission_gst_type === 'exclusive'
                                        ? '18% Exclusive'
                                        : data.commission_gst_type}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Initial Workflow Status
                                </span>
                                <Badge variant="outline">
                                    {data.send_for_acceptance
                                        ? 'Pending Acceptance'
                                        : 'Draft'}
                                </Badge>
                            </div>

                            <p className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3 leading-relaxed text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                                Agreements apply strictly forward-only. Existing
                                reservations preserve their original creation
                                snapshot.
                            </p>
                        </CardContent>
                    </Card>
                </aside>
            </form>
        </div>
    );
}
