import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    Percent,
    ShieldCheck,
    Sparkles,
    Tag,
    TicketPercent,
} from 'lucide-react';
import React from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/layouts/admin-layout';
import type { BreadcrumbItem } from '@/types';

interface Props {
    categories?: Array<{ id: number; name: string; slug: string }>;
    cities?: Array<{ id: number; name: string; slug: string }>;
    properties?: Array<{ id: number; name: string }>;
    types?: Array<{ value: string; label: string }>;
    offerTypes?: Array<{ value: string; label: string }>;
    fundingSources?: Array<{ value: string; label: string }>;
}

export default function CreateCampaign({
    categories = [],
    cities = [],
    properties = [],
    types = [],
    offerTypes = [],
    fundingSources = [],
}: Props) {
    void cities;
    void properties;
    void fundingSources;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin Console', href: '/admin/dashboard' },
        { title: 'Rewards', href: '/admin/rewards' },
        { title: 'Campaigns', href: '/admin/rewards/campaigns' },
        { title: 'Create Campaign', href: '#' },
    ];

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        code: '',
        type: 'standard',
        offer_type: 'percentage',
        discount_percentage: 15,
        discount_amount_inr: 500,
        max_discount_inr: 1000,
        min_booking_amount_inr: 2000,
        min_stay_days: 1,
        bonus_points: 0,
        funding_source: 'platform',
        property_funding_percentage: 0,
        category_ids: [] as number[],
        city_ids: [] as number[],
        property_ids: [] as number[],
        first_booking_only: false,
        total_usage_limit: '',
        per_user_limit: 1,
        starts_at: new Date().toISOString().slice(0, 10),
        ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
    });

    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'TIJUM';
        for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setData('code', code);
    };

    const toggleCategory = (catId: number) => {
        const current = [...data.category_ids];
        const index = current.indexOf(catId);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(catId);
        }
        setData('category_ids', current);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/rewards/campaigns');
    };

    const defaultCategories = [
        { id: 1, name: 'Hostels / PG' },
        { id: 2, name: 'Homestays' },
        { id: 3, name: 'Co-Living' },
    ];

    const categoryList = categories.length > 0 ? categories : defaultCategories;

    const campaignTypes =
        types.length > 0
            ? types
            : [
                  { value: 'standard', label: 'Standard Promotion' },
                  {
                      value: 'occasion_festival',
                      label: 'Festival / Occasion',
                  },
                  { value: 'referral', label: 'Referral Promotion' },
                  { value: 'property_specific', label: 'Property Specific' },
                  {
                      value: 'new_customer_welcome',
                      label: 'New Customer Welcome',
                  },
              ];

    const couponOfferTypes =
        offerTypes.length > 0
            ? offerTypes
            : [
                  { value: 'percentage', label: 'Percentage Discount (%)' },
                  { value: 'fixed_amount', label: 'Fixed Rupee Discount (₹)' },
                  { value: 'points_reward', label: 'Points Reward Only' },
                  { value: 'combined', label: 'Discount + Points Bonus' },
              ];

    const offerPreview =
        data.offer_type === 'percentage'
            ? `${data.discount_percentage}% OFF${data.max_discount_inr > 0 ? ` (up to ₹${data.max_discount_inr.toLocaleString()})` : ''}`
            : data.offer_type === 'fixed_amount'
              ? `₹${data.discount_amount_inr.toLocaleString()} flat OFF`
              : data.offer_type === 'points_reward'
                ? `+${data.bonus_points.toLocaleString()} bonus pts`
                : `${data.discount_percentage}% + ₹${data.discount_amount_inr.toLocaleString()} + ${data.bonus_points} pts`;

    const fundingPreview =
        data.funding_source === 'platform'
            ? '100% TIJUM Platform Funded'
            : data.funding_source === 'property'
              ? '100% Partner Property Funded'
              : `${100 - data.property_funding_percentage}% TIJUM / ${data.property_funding_percentage}% Partner`;

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Promotional Campaign — TIJUM Admin" />

            <div className="space-y-6 pb-16">
                <PageHeader
                    eyebrow="Promotions & Coupons"
                    title="Create Promotional Campaign"
                    description="Launch new coupon codes with settlement protection and category targeting."
                    badges={
                        <>
                            <Badge variant="plum">New Campaign</Badge>
                            <Badge variant="outline" className="gap-1.5">
                                <ShieldCheck
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Settlement Guarded</span>
                            </Badge>
                        </>
                    }
                    actions={
                        <Button asChild size="sm" variant="outline">
                            <Link href="/admin/rewards/campaigns">
                                <ArrowLeft
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Back to Campaigns</span>
                            </Link>
                        </Button>
                    }
                />

                <form
                    onSubmit={handleSubmit}
                    className="grid gap-6 lg:grid-cols-12 lg:items-start"
                >
                    <div className="space-y-6 lg:col-span-8">
                        {/* Section 1: Campaign Basics */}
                        <Card>
                            <CardHeader className="border-b border-tijum-surface/80 pb-5 dark:border-border">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Tag
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>1. Campaign Basics</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Basic identification and promo code
                                    settings.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label
                                            htmlFor="name"
                                            className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Campaign Name / Title *
                                        </Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. Early Bird Summer Launch 2026"
                                            value={data.name}
                                            onChange={(e) =>
                                                setData('name', e.target.value)
                                            }
                                            required
                                            className="h-10 text-xs"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label
                                                htmlFor="code"
                                                className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                            >
                                                Coupon Code *
                                            </Label>
                                            <button
                                                type="button"
                                                onClick={generateCode}
                                                className="font-heading text-[11px] font-semibold text-tijum-coral hover:underline"
                                            >
                                                Generate Random
                                            </button>
                                        </div>
                                        <Input
                                            id="code"
                                            placeholder="e.g. TIJUMSUMMER15"
                                            value={data.code}
                                            onChange={(e) =>
                                                setData(
                                                    'code',
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                            required
                                            className="h-10 font-mono text-xs uppercase"
                                        />
                                        <InputError message={errors.code} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="type"
                                            className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Campaign Type
                                        </Label>
                                        <Select
                                            value={data.type}
                                            onValueChange={(val) =>
                                                setData('type', val)
                                            }
                                        >
                                            <SelectTrigger
                                                id="type"
                                                size="sm"
                                                className="w-full text-xs"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {campaignTypes.map((t) => (
                                                    <SelectItem
                                                        key={t.value}
                                                        value={t.value}
                                                    >
                                                        {t.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.type} />
                                    </div>

                                    <div className="space-y-2 sm:col-span-2">
                                        <Label
                                            htmlFor="description"
                                            className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Customer-Facing Description
                                        </Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Explain the offer terms shown to customers (e.g. Get 15% off on bookings above ₹2,000)..."
                                            value={data.description}
                                            onChange={(e) =>
                                                setData(
                                                    'description',
                                                    e.target.value,
                                                )
                                            }
                                            className="text-xs"
                                            rows={2}
                                        />
                                        <InputError
                                            message={errors.description}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section 2: Discount Offer & Value */}
                        <Card>
                            <CardHeader className="border-b border-tijum-surface/80 pb-5 dark:border-border">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Percent
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>2. Discount Offer &amp; Value</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Configure the discount formula applied at
                                    checkout.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="offer_type"
                                            className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Offer Type *
                                        </Label>
                                        <Select
                                            value={data.offer_type}
                                            onValueChange={(val) =>
                                                setData('offer_type', val)
                                            }
                                        >
                                            <SelectTrigger
                                                id="offer_type"
                                                size="sm"
                                                className="w-full text-xs"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {couponOfferTypes.map((ot) => (
                                                    <SelectItem
                                                        key={ot.value}
                                                        value={ot.value}
                                                    >
                                                        {ot.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={errors.offer_type}
                                        />
                                    </div>

                                    {(data.offer_type === 'percentage' ||
                                        data.offer_type === 'combined') && (
                                        <>
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="discount_percentage"
                                                    className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                                >
                                                    Discount Percentage (%) *
                                                </Label>
                                                <Input
                                                    id="discount_percentage"
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    value={
                                                        data.discount_percentage
                                                    }
                                                    onChange={(e) =>
                                                        setData(
                                                            'discount_percentage',
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    required
                                                    className="h-10 text-xs tabular-nums"
                                                />
                                                <InputError
                                                    message={
                                                        errors.discount_percentage
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="max_discount_inr"
                                                    className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                                >
                                                    Max Discount Cap (₹)
                                                </Label>
                                                <Input
                                                    id="max_discount_inr"
                                                    type="number"
                                                    min="0"
                                                    value={
                                                        data.max_discount_inr
                                                    }
                                                    onChange={(e) =>
                                                        setData(
                                                            'max_discount_inr',
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    className="h-10 text-xs tabular-nums"
                                                />
                                                <InputError
                                                    message={
                                                        errors.max_discount_inr
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}

                                    {(data.offer_type === 'fixed_amount' ||
                                        data.offer_type === 'combined') && (
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="discount_amount_inr"
                                                className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                            >
                                                Discount Amount (₹) *
                                            </Label>
                                            <Input
                                                id="discount_amount_inr"
                                                type="number"
                                                min="1"
                                                value={data.discount_amount_inr}
                                                onChange={(e) =>
                                                    setData(
                                                        'discount_amount_inr',
                                                        Number(e.target.value),
                                                    )
                                                }
                                                required
                                                className="h-10 text-xs tabular-nums"
                                            />
                                            <InputError
                                                message={
                                                    errors.discount_amount_inr
                                                }
                                            />
                                        </div>
                                    )}

                                    {(data.offer_type === 'points_reward' ||
                                        data.offer_type === 'combined') && (
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="bonus_points"
                                                className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                            >
                                                Bonus Loyalty Points
                                            </Label>
                                            <Input
                                                id="bonus_points"
                                                type="number"
                                                min="0"
                                                value={data.bonus_points}
                                                onChange={(e) =>
                                                    setData(
                                                        'bonus_points',
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="h-10 text-xs tabular-nums"
                                            />
                                            <InputError
                                                message={errors.bonus_points}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="min_booking_amount_inr"
                                            className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Min Booking Subtotal (₹)
                                        </Label>
                                        <Input
                                            id="min_booking_amount_inr"
                                            type="number"
                                            min="0"
                                            value={data.min_booking_amount_inr}
                                            onChange={(e) =>
                                                setData(
                                                    'min_booking_amount_inr',
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="h-10 text-xs tabular-nums"
                                        />
                                        <InputError
                                            message={
                                                errors.min_booking_amount_inr
                                            }
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section 3: Funding Source & Partner Settlement Protection */}
                        <Card>
                            <CardHeader className="border-b border-tijum-surface/80 pb-5 dark:border-border">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ShieldCheck
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        3. Funding Source &amp; Settlement
                                        Guarantee
                                    </span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Ensure partner payouts are protected when
                                    TIJUM sponsors marketing discounts.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    {[
                                        {
                                            value: 'platform',
                                            title: 'Platform Funded',
                                            subtitle:
                                                '100% subsidized by TIJUM. Partner payouts remain completely unaffected.',
                                        },
                                        {
                                            value: 'property',
                                            title: 'Property Funded',
                                            subtitle:
                                                '100% absorbed by opting-in property owners as local promotion.',
                                        },
                                        {
                                            value: 'split',
                                            title: 'Split Funded',
                                            subtitle:
                                                'Co-funded campaign split between TIJUM and participating partners.',
                                        },
                                    ].map((source) => {
                                        const isSelected =
                                            data.funding_source ===
                                            source.value;
                                        return (
                                            <label
                                                key={source.value}
                                                className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-colors ${
                                                    isSelected
                                                        ? 'border-tijum-coral bg-tijum-cream/65 ring-2 ring-tijum-coral/25 dark:border-tijum-coral dark:bg-tijum-coral/12'
                                                        : 'border-tijum-surface/80 bg-card hover:border-tijum-coral/45 hover:bg-tijum-cream/35 dark:border-border dark:hover:bg-accent/50'
                                                }`}
                                            >
                                                <div className="space-y-1.5">
                                                    <input
                                                        type="radio"
                                                        name="funding_source"
                                                        value={source.value}
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            setData(
                                                                'funding_source',
                                                                e.target.value,
                                                            );
                                                            if (
                                                                e.target
                                                                    .value ===
                                                                'property'
                                                            ) {
                                                                setData(
                                                                    'property_funding_percentage',
                                                                    100,
                                                                );
                                                            } else if (
                                                                e.target
                                                                    .value ===
                                                                'split'
                                                            ) {
                                                                setData(
                                                                    'property_funding_percentage',
                                                                    50,
                                                                );
                                                            } else {
                                                                setData(
                                                                    'property_funding_percentage',
                                                                    0,
                                                                );
                                                            }
                                                        }}
                                                        className="sr-only"
                                                    />
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                            {source.title}
                                                        </p>
                                                        <span
                                                            aria-hidden="true"
                                                            className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                                                                isSelected
                                                                    ? 'border-tijum-coral bg-tijum-coral'
                                                                    : 'border-tijum-surface/90 dark:border-border'
                                                            }`}
                                                        >
                                                            {isSelected && (
                                                                <span className="size-1.5 rounded-full bg-white" />
                                                            )}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                                        {source.subtitle}
                                                    </p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                <InputError message={errors.funding_source} />

                                {data.funding_source === 'split' && (
                                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 sm:grid-cols-2 dark:border-border dark:bg-muted/45">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="property_funding_percentage"
                                                className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                            >
                                                Partner Property Share (%)
                                            </Label>
                                            <Input
                                                id="property_funding_percentage"
                                                type="number"
                                                min="1"
                                                max="99"
                                                value={
                                                    data.property_funding_percentage
                                                }
                                                onChange={(e) =>
                                                    setData(
                                                        'property_funding_percentage',
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="h-10 text-xs tabular-nums"
                                            />
                                            <InputError
                                                message={
                                                    errors.property_funding_percentage
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="platform_funding_percentage"
                                                className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                            >
                                                TIJUM Platform Share (%)
                                            </Label>
                                            <Input
                                                id="platform_funding_percentage"
                                                type="number"
                                                disabled
                                                value={
                                                    100 -
                                                    data.property_funding_percentage
                                                }
                                                className="h-10 text-xs tabular-nums"
                                            />
                                        </div>
                                    </div>
                                )}

                                <Alert variant="success">
                                    <ShieldCheck aria-hidden="true" />
                                    <AlertTitle className="text-xs font-semibold">
                                        Settlement Protection
                                    </AlertTitle>
                                    <AlertDescription className="text-xs">
                                        If Platform Funded, Settlement
                                        Calculation adds the discount amount
                                        back to partner net payable before
                                        disbursement.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        {/* Section 4: Category Targeting & Usage Limits */}
                        <Card>
                            <CardHeader className="border-b border-tijum-surface/80 pb-5 dark:border-border">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Calendar
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        4. Targeting, Limits &amp; Scheduling
                                    </span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Restrict to categories and define expiry
                                    windows.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {/* Categories */}
                                <div className="space-y-2.5">
                                    <Label className="text-xs font-semibold text-tijum-plum dark:text-foreground">
                                        Eligible Accommodation Categories
                                    </Label>
                                    <div className="flex flex-wrap gap-3">
                                        {categoryList.map((cat) => {
                                            const isChecked =
                                                data.category_ids.includes(
                                                    cat.id,
                                                );
                                            return (
                                                <label
                                                    key={cat.id}
                                                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-colors ${
                                                        isChecked
                                                            ? 'border-tijum-coral bg-tijum-cream/65 text-tijum-plum dark:border-tijum-coral dark:bg-tijum-coral/12 dark:text-foreground'
                                                            : 'border-tijum-surface/80 bg-card text-tijum-plum hover:border-tijum-coral/40 dark:border-border dark:text-foreground'
                                                    }`}
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={() =>
                                                            toggleCategory(
                                                                cat.id,
                                                            )
                                                        }
                                                    />
                                                    <span>{cat.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <InputError message={errors.category_ids} />
                                </div>

                                <div className="flex items-center gap-2.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3.5 py-3 dark:border-border dark:bg-muted/45">
                                    <Checkbox
                                        id="first_booking_only"
                                        checked={data.first_booking_only}
                                        onCheckedChange={(checked) =>
                                            setData(
                                                'first_booking_only',
                                                Boolean(checked),
                                            )
                                        }
                                    />
                                    <Label
                                        htmlFor="first_booking_only"
                                        className="cursor-pointer text-xs text-tijum-plum dark:text-foreground"
                                    >
                                        New customers only (applies only to
                                        guest&apos;s first completed booking)
                                    </Label>
                                    <InputError
                                        message={errors.first_booking_only}
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="total_usage_limit"
                                            className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Total Usage Cap (Blank = ∞)
                                        </Label>
                                        <Input
                                            id="total_usage_limit"
                                            type="number"
                                            placeholder="Unlimited"
                                            value={data.total_usage_limit}
                                            onChange={(e) =>
                                                setData(
                                                    'total_usage_limit',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-10 text-xs tabular-nums"
                                        />
                                        <InputError
                                            message={errors.total_usage_limit}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="per_user_limit"
                                            className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Per-User Limit
                                        </Label>
                                        <Input
                                            id="per_user_limit"
                                            type="number"
                                            min="1"
                                            value={data.per_user_limit}
                                            onChange={(e) =>
                                                setData(
                                                    'per_user_limit',
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="h-10 text-xs tabular-nums"
                                        />
                                        <InputError
                                            message={errors.per_user_limit}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="starts_at"
                                            className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Valid From Date *
                                        </Label>
                                        <Input
                                            id="starts_at"
                                            type="date"
                                            value={data.starts_at}
                                            onChange={(e) =>
                                                setData(
                                                    'starts_at',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                            className="h-10 text-xs tabular-nums"
                                        />
                                        <InputError
                                            message={errors.starts_at}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="ends_at"
                                            className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Valid To Date *
                                        </Label>
                                        <Input
                                            id="ends_at"
                                            type="date"
                                            value={data.ends_at}
                                            onChange={(e) =>
                                                setData(
                                                    'ends_at',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                            className="h-10 text-xs tabular-nums"
                                        />
                                        <InputError message={errors.ends_at} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Submit Bar */}
                        <Card className="py-4">
                            <CardContent className="flex flex-wrap items-center justify-between gap-3 px-6">
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Review coupon rules and settlement funding
                                    before publishing.
                                </p>
                                <div className="flex items-center gap-2.5">
                                    <Button
                                        asChild
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Link href="/admin/rewards/campaigns">
                                            Cancel
                                        </Link>
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        variant="default"
                                        disabled={processing}
                                        loading={processing}
                                    >
                                        {processing
                                            ? 'Creating Campaign...'
                                            : 'Publish Campaign'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Live Executive Campaign Preview */}
                    <aside className="space-y-4 lg:sticky lg:top-24 lg:col-span-4">
                        <Card>
                            <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <TicketPercent
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>Live Offer Preview</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Real-time summary of the coupon rules to be
                                    published.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xs">
                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                                    <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Promo Code
                                    </span>
                                    <p className="mt-1 font-mono text-lg font-bold text-tijum-coral">
                                        {data.code || 'UNSET'}
                                    </p>
                                    <p className="mt-1 font-heading font-semibold text-tijum-plum dark:text-foreground">
                                        {data.name || 'Untitled Campaign'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2 border-b border-tijum-surface/60 pb-2 dark:border-border">
                                        <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                            Benefit
                                        </span>
                                        <span className="font-heading font-bold text-status-success-fg tabular-nums">
                                            {offerPreview}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 border-b border-tijum-surface/60 pb-2 dark:border-border">
                                        <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                            Min Subtotal
                                        </span>
                                        <span className="font-heading font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                            ₹
                                            {data.min_booking_amount_inr.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 border-b border-tijum-surface/60 pb-2 dark:border-border">
                                        <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                            Funding Split
                                        </span>
                                        <span className="text-right font-heading font-semibold text-tijum-plum dark:text-foreground">
                                            {fundingPreview}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 border-b border-tijum-surface/60 pb-2 dark:border-border">
                                        <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                            Usage Limits
                                        </span>
                                        <span className="font-heading font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                            {data.total_usage_limit || '∞'}{' '}
                                            total · {data.per_user_limit}/user
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                            Schedule
                                        </span>
                                        <span className="font-heading font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                            {data.starts_at} → {data.ends_at}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3 py-2.5 text-[11px] text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                                    <Sparkles
                                        className="size-3.5 shrink-0 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {data.first_booking_only
                                            ? 'Restricted to first-time guests only.'
                                            : 'Open to all eligible TIJUM guests.'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>
                </form>
            </div>
        </AdminLayout>
    );
}
