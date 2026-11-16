import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Eye, Save, Sparkles } from 'lucide-react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import type {
    BannerPlacement,
    BannerStatus,
    MarketingBanner,
    MarketingCampaign,
} from '@/types/marketing';

interface Props {
    banner: MarketingBanner | null;
    campaigns: MarketingCampaign[];
    placements: Array<{ value: string; label: string }>;
    statuses: Array<{ value: string; label: string }>;
}

export default function AdminBannerForm({
    banner,
    campaigns,
    placements,
    statuses,
}: Props) {
    const isEdit = !!banner;

    const form = useForm({
        campaign_id: banner?.campaign_id || '',
        name: banner?.name || '',
        headline: banner?.headline || '',
        description: banner?.description || '',
        image_url: banner?.image_url || '',
        cta_text: banner?.cta_text || 'Explore Stays',
        cta_url: banner?.cta_url || '/search',
        placement: banner?.placement || 'homepage_hero',
        display_order: banner?.display_order || 0,
        status: banner?.status || 'draft',
        starts_at: banner?.starts_at ? banner.starts_at.substring(0, 10) : '',
        ends_at: banner?.ends_at ? banner.ends_at.substring(0, 10) : '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/admin/marketing/banners/${banner.id}`);
        } else {
            form.post('/admin/marketing/banners');
        }
    };

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'Marketing & Growth', href: '/admin/marketing' },
                { title: 'Banners', href: '/admin/marketing/banners' },
                {
                    title: isEdit ? banner.name : 'Create Banner',
                    href: isEdit
                        ? `/admin/marketing/banners/${banner.id}/edit`
                        : '/admin/marketing/banners/create',
                },
            ]}
        >
            <Head
                title={
                    isEdit
                        ? `Edit Banner: ${banner.name}`
                        : 'Create Promotional Banner'
                }
            />

            <div className="max-w-4xl space-y-6 pb-10">
                <PageHeader
                    eyebrow="Marketing · Banner Studio"
                    title={
                        isEdit
                            ? `Edit Banner: ${banner.name}`
                            : 'Create Promotional Banner'
                    }
                    description="Configure creative copy, display placement, tracking CTA, and scheduling dates."
                    actions={
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/marketing/banners">
                                <ArrowLeft
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Back to Banners</span>
                            </Link>
                        </Button>
                    }
                />

                {/* Live Preview Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            <Eye
                                className="size-3.5 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>Visual Placement Live Preview</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative overflow-hidden rounded-2xl bg-tijum-plum p-5 text-tijum-cream shadow-tijum-card dark:border dark:border-border dark:bg-[#2b1b29]">
                            <div
                                className="pointer-events-none absolute -top-12 -right-10 size-40 rounded-full bg-tijum-coral/20 blur-2xl"
                                aria-hidden="true"
                            />
                            <div className="relative flex flex-col items-center justify-between gap-4 sm:flex-row">
                                <div className="space-y-1.5 text-center sm:text-left">
                                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 font-heading text-[10px] font-semibold text-tijum-peach">
                                        <Sparkles
                                            className="size-3 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        <span>TIJUM Promotional</span>
                                    </div>
                                    <h3 className="font-heading text-lg font-bold text-tijum-cream">
                                        {form.data.headline ||
                                            'Your Headline Appears Here'}
                                    </h3>
                                    <p className="max-w-md text-xs leading-relaxed text-tijum-cream/80">
                                        {form.data.description ||
                                            'Promotional description detailing benefits, food inclusions, or seasonal offers.'}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center">
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="pointer-events-none"
                                    >
                                        {form.data.cta_text || 'Action Button'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Form Card */}
                <Card>
                    <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                        <CardTitle className="text-base sm:text-lg">
                            Banner Creative &amp; Placement Configuration
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Define headline copy, call-to-action routing, and
                            publishing schedule.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name">
                                        Banner Internal Name
                                    </Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(e) =>
                                            form.setData('name', e.target.value)
                                        }
                                        placeholder="e.g. Hyderabad Summer Food Fest Hero"
                                        required
                                    />
                                    <InputError
                                        message={form.errors.name}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="campaign_id">
                                        Associated Campaign (Optional)
                                    </Label>
                                    <Select
                                        value={
                                            form.data.campaign_id
                                                ? String(form.data.campaign_id)
                                                : 'none'
                                        }
                                        onValueChange={(value) =>
                                            form.setData(
                                                'campaign_id',
                                                value === 'none' ? '' : value,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="campaign_id"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="No Campaign Link" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                No Campaign Link
                                            </SelectItem>
                                            {campaigns.map((c) => (
                                                <SelectItem
                                                    key={c.id}
                                                    value={String(c.id)}
                                                >
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="headline">
                                    Promotional Headline (Customer Facing)
                                </Label>
                                <Input
                                    id="headline"
                                    value={form.data.headline}
                                    onChange={(e) =>
                                        form.setData('headline', e.target.value)
                                    }
                                    placeholder="e.g. Stay in Hyderabad with Pure Homestyle South Indian Meals Included!"
                                    required
                                />
                                <InputError
                                    message={form.errors.headline}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="description">
                                    Short Description / Subtitle
                                </Label>
                                <Textarea
                                    id="description"
                                    rows={2}
                                    value={form.data.description}
                                    onChange={(e) =>
                                        form.setData(
                                            'description',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Optional secondary text detailing discounts, meal schedules, or city benefits..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="image_url">
                                    Background or Hero Image URL (Optional)
                                </Label>
                                <Input
                                    id="image_url"
                                    value={form.data.image_url}
                                    onChange={(e) =>
                                        form.setData(
                                            'image_url',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="https://tijum.com/images/hero-banner.jpg"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="cta_text">
                                        Button CTA Text
                                    </Label>
                                    <Input
                                        id="cta_text"
                                        value={form.data.cta_text}
                                        onChange={(e) =>
                                            form.setData(
                                                'cta_text',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="e.g. Find Food-Inclusive Hostels"
                                        required
                                    />
                                    <InputError
                                        message={form.errors.cta_text}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="cta_url">
                                        Button Destination URL
                                    </Label>
                                    <Input
                                        id="cta_url"
                                        value={form.data.cta_url}
                                        onChange={(e) =>
                                            form.setData(
                                                'cta_url',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="e.g. /hostels-in-hyderabad"
                                        required
                                    />
                                    <InputError
                                        message={form.errors.cta_url}
                                        className="text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="placement">
                                        Placement Location
                                    </Label>
                                    <Select
                                        value={form.data.placement}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'placement',
                                                value as BannerPlacement,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="placement"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {placements.map((p) => (
                                                <SelectItem
                                                    key={p.value}
                                                    value={p.value}
                                                >
                                                    {p.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="display_order">
                                        Display Priority Order
                                    </Label>
                                    <Input
                                        id="display_order"
                                        type="number"
                                        value={form.data.display_order}
                                        onChange={(e) =>
                                            form.setData(
                                                'display_order',
                                                parseInt(e.target.value, 10) ||
                                                    0,
                                            )
                                        }
                                        className="tabular-nums"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="status">
                                        Publishing Status
                                    </Label>
                                    <Select
                                        value={form.data.status}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'status',
                                                value as BannerStatus,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="status"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statuses.map((s) => (
                                                <SelectItem
                                                    key={s.value}
                                                    value={s.value}
                                                >
                                                    {s.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 border-t border-tijum-surface/80 pt-5 md:grid-cols-2 dark:border-border">
                                <div className="space-y-1.5">
                                    <Label htmlFor="starts_at">
                                        Start Date (Optional)
                                    </Label>
                                    <Input
                                        id="starts_at"
                                        type="date"
                                        value={form.data.starts_at}
                                        onChange={(e) =>
                                            form.setData(
                                                'starts_at',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="ends_at">
                                        Expiration Date (Optional)
                                    </Label>
                                    <Input
                                        id="ends_at"
                                        type="date"
                                        value={form.data.ends_at}
                                        onChange={(e) =>
                                            form.setData(
                                                'ends_at',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-end gap-3 border-t border-tijum-surface/80 pt-5 dark:border-border">
                                <Button asChild variant="outline">
                                    <Link href="/admin/marketing/banners">
                                        Cancel
                                    </Link>
                                </Button>
                                <Button
                                    type="submit"
                                    loading={form.processing}
                                    disabled={form.processing}
                                >
                                    {!form.processing && (
                                        <Save
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span>
                                        {isEdit
                                            ? 'Save Changes'
                                            : 'Create Banner'}
                                    </span>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
