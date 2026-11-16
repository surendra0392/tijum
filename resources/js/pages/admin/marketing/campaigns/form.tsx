import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, Copy, Link as LinkIcon, Save } from 'lucide-react';
import { useState } from 'react';
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
import type { CampaignStatus, MarketingCampaign } from '@/types/marketing';

interface Props {
    campaign: MarketingCampaign | null;
    generatedTrackingUrl?: string;
    statuses: Array<{ value: string; label: string }>;
}

export default function AdminCampaignForm({
    campaign,
    generatedTrackingUrl,
    statuses,
}: Props) {
    const isEdit = !!campaign;
    const [copied, setCopied] = useState(false);

    const form = useForm({
        name: campaign?.name || '',
        slug: campaign?.slug || '',
        description: campaign?.description || '',
        objective: campaign?.objective || 'customer_acquisition',
        utm_source: campaign?.utm_source || 'newsletter',
        utm_medium: campaign?.utm_medium || 'email',
        utm_campaign: campaign?.utm_campaign || 'launch_2026',
        utm_content: campaign?.utm_content || '',
        target_landing_url: campaign?.target_landing_url || '/search',
        status: campaign?.status || 'draft',
        starts_at: campaign?.starts_at
            ? campaign.starts_at.substring(0, 10)
            : '',
        ends_at: campaign?.ends_at ? campaign.ends_at.substring(0, 10) : '',
    });

    const computedTrackingUrl = () => {
        try {
            const base = form.data.target_landing_url.startsWith('http')
                ? form.data.target_landing_url
                : `${window.location.origin}${form.data.target_landing_url.startsWith('/') ? '' : '/'}${form.data.target_landing_url}`;

            const url = new URL(base);
            if (form.data.utm_source) {
                url.searchParams.set('utm_source', form.data.utm_source);
            }
            if (form.data.utm_medium) {
                url.searchParams.set('utm_medium', form.data.utm_medium);
            }
            if (form.data.utm_campaign) {
                url.searchParams.set('utm_campaign', form.data.utm_campaign);
            }
            if (form.data.utm_content) {
                url.searchParams.set('utm_content', form.data.utm_content);
            }
            return url.toString();
        } catch {
            return generatedTrackingUrl || form.data.target_landing_url;
        }
    };

    const handleCopy = async () => {
        try {
            const url = generatedTrackingUrl || computedTrackingUrl();
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/admin/marketing/campaigns/${campaign.id}`);
        } else {
            form.post('/admin/marketing/campaigns');
        }
    };

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'Marketing & Growth', href: '/admin/marketing' },
                { title: 'Campaigns', href: '/admin/marketing/campaigns' },
                {
                    title: isEdit ? campaign.name : 'Create Campaign',
                    href: isEdit
                        ? `/admin/marketing/campaigns/${campaign.id}/edit`
                        : '/admin/marketing/campaigns/create',
                },
            ]}
        >
            <Head
                title={
                    isEdit
                        ? `Edit Campaign: ${campaign.name}`
                        : 'Create Marketing Campaign'
                }
            />

            <div className="max-w-4xl space-y-6 pb-10">
                <PageHeader
                    eyebrow="Marketing · Campaign Studio"
                    title={
                        isEdit
                            ? `Edit Campaign: ${campaign.name}`
                            : 'Create Marketing Campaign'
                    }
                    description="Set up campaign objectives, target landing URLs, and auto-generated UTM tracking links."
                    actions={
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/marketing/campaigns">
                                <ArrowLeft
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Back to Campaigns</span>
                            </Link>
                        </Button>
                    }
                />

                {/* Live UTM Tracking Link Box */}
                <Card>
                    <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            <LinkIcon
                                className="size-3.5 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>Generated UTM Tracking URL</span>
                        </CardTitle>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                        >
                            {copied ? (
                                <>
                                    <Check
                                        className="size-3.5 text-status-success-fg"
                                        aria-hidden="true"
                                    />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Copy Link</span>
                                </>
                            )}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 font-mono text-xs break-all text-tijum-plum select-all dark:border-border dark:bg-muted/45 dark:text-foreground">
                            {typeof window !== 'undefined'
                                ? computedTrackingUrl()
                                : generatedTrackingUrl || ''}
                        </div>
                    </CardContent>
                </Card>

                {/* Form Card */}
                <Card>
                    <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                        <CardTitle className="text-base sm:text-lg">
                            Campaign Parameters &amp; Attribution
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Define strategic objectives, destination URL, and
                            UTM tracking metadata.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name">Campaign Name</Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(e) =>
                                            form.setData('name', e.target.value)
                                        }
                                        placeholder="e.g. Hyderabad Q1 Launch 2026"
                                        required
                                    />
                                    <InputError
                                        message={form.errors.name}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="slug">Campaign Slug</Label>
                                    <Input
                                        id="slug"
                                        value={form.data.slug}
                                        onChange={(e) =>
                                            form.setData('slug', e.target.value)
                                        }
                                        placeholder="e.g. hyderabad-q1-launch-2026"
                                    />
                                    <InputError
                                        message={form.errors.slug}
                                        className="text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="objective">
                                        Strategic Objective
                                    </Label>
                                    <Select
                                        value={form.data.objective}
                                        onValueChange={(value) =>
                                            form.setData('objective', value)
                                        }
                                    >
                                        <SelectTrigger
                                            id="objective"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="customer_acquisition">
                                                Customer Acquisition
                                            </SelectItem>
                                            <SelectItem value="brand_awareness">
                                                Brand Awareness
                                            </SelectItem>
                                            <SelectItem value="city_expansion">
                                                City Expansion
                                            </SelectItem>
                                            <SelectItem value="partner_onboarding">
                                                Partner Onboarding
                                            </SelectItem>
                                            <SelectItem value="seasonal_retention">
                                                Seasonal Retention
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="status">
                                        Campaign Status
                                    </Label>
                                    <Select
                                        value={form.data.status}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'status',
                                                value as CampaignStatus,
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

                            <div className="space-y-1.5">
                                <Label htmlFor="description">
                                    Campaign Description &amp; Notes
                                </Label>
                                <Textarea
                                    id="description"
                                    rows={3}
                                    value={form.data.description}
                                    onChange={(e) =>
                                        form.setData(
                                            'description',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Operational notes, target audience persona, budget references..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="target_landing_url">
                                    Target Landing URL (Public Path or Full URL)
                                </Label>
                                <Input
                                    id="target_landing_url"
                                    value={form.data.target_landing_url}
                                    onChange={(e) =>
                                        form.setData(
                                            'target_landing_url',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="/hostels-in-hyderabad"
                                    required
                                />
                                <InputError
                                    message={form.errors.target_landing_url}
                                    className="text-xs"
                                />
                            </div>

                            {/* UTM Parameters */}
                            <div className="space-y-4 border-t border-tijum-surface/80 pt-5 dark:border-border">
                                <h3 className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    UTM Tracking Parameters
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="utm_source">
                                            utm_source
                                        </Label>
                                        <Input
                                            id="utm_source"
                                            value={form.data.utm_source}
                                            onChange={(e) =>
                                                form.setData(
                                                    'utm_source',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="newsletter"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="utm_medium">
                                            utm_medium
                                        </Label>
                                        <Input
                                            id="utm_medium"
                                            value={form.data.utm_medium}
                                            onChange={(e) =>
                                                form.setData(
                                                    'utm_medium',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="email"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="utm_campaign">
                                            utm_campaign
                                        </Label>
                                        <Input
                                            id="utm_campaign"
                                            value={form.data.utm_campaign}
                                            onChange={(e) =>
                                                form.setData(
                                                    'utm_campaign',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="hyderabad_launch"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="utm_content">
                                            utm_content (Opt)
                                        </Label>
                                        <Input
                                            id="utm_content"
                                            value={form.data.utm_content}
                                            onChange={(e) =>
                                                form.setData(
                                                    'utm_content',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="header_cta"
                                        />
                                    </div>
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
                                        End Date (Optional)
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
                                    <Link href="/admin/marketing/campaigns">
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
                                            ? 'Save Campaign'
                                            : 'Create Campaign'}
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
