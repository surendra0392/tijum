import { Head } from '@inertiajs/react';
import { Eye, Layers, Search } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/layouts/admin-layout';
import type {
    NotificationEventItem,
    NotificationTemplateItem,
} from '@/types/notifications';

interface Props {
    events: NotificationEventItem[];
    templates: NotificationTemplateItem[];
}

interface PreviewState {
    code: string;
    channel: string;
    title: string;
    subject?: string | null;
    body: string;
    variables: string[];
    dlt_template_id?: string | null;
    meta_template_name?: string | null;
}

export default function AdminNotificationTemplatesIndex({
    events,
    templates,
}: Props) {
    const [search, setSearch] = useState('');
    const [selectedRole, setSelectedRole] = useState<
        'all' | 'customer' | 'partner' | 'admin'
    >('all');
    const [previewModal, setPreviewModal] = useState<PreviewState | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const openPreview = async (templateCode: string) => {
        setPreviewLoading(true);
        try {
            const res = await fetch('/admin/notifications/templates/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        (
                            document.querySelector(
                                'meta[name="csrf-token"]',
                            ) as HTMLMetaElement
                        )?.content || '',
                },
                body: JSON.stringify({ code: templateCode }),
            });

            if (res.ok) {
                const data = await res.json();
                setPreviewModal(data);
            }
        } catch {
            // Ignore
        } finally {
            setPreviewLoading(false);
        }
    };

    const filteredTemplates = templates.filter((tpl) => {
        const matchesSearch =
            tpl.code.toLowerCase().includes(search.toLowerCase()) ||
            tpl.title.toLowerCase().includes(search.toLowerCase()) ||
            tpl.event_type.toLowerCase().includes(search.toLowerCase());

        const event = events.find((e) => e.event_type === tpl.event_type);
        const matchesRole =
            selectedRole === 'all' ||
            (event && event.recipient_role === selectedRole);

        return matchesSearch && matchesRole;
    });

    const getChannelBadge = (ch: string) => {
        switch (ch) {
            case 'email':
                return (
                    <Badge
                        variant="outline"
                        className="border-status-info-border bg-status-info-bg text-status-info-fg"
                    >
                        Email
                    </Badge>
                );
            case 'sms':
                return (
                    <Badge
                        variant="outline"
                        className="border-status-warning-border bg-status-warning-bg text-status-warning-fg"
                    >
                        SMS (DLT)
                    </Badge>
                );
            case 'whatsapp':
                return (
                    <Badge
                        variant="outline"
                        className="border-status-success-border bg-status-success-bg text-status-success-fg"
                    >
                        WhatsApp
                    </Badge>
                );
            case 'push':
                return (
                    <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-300"
                    >
                        Push
                    </Badge>
                );
            default:
                return (
                    <Badge
                        variant="outline"
                        className="border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-500/35 dark:bg-purple-950/35 dark:text-purple-300"
                    >
                        In-App
                    </Badge>
                );
        }
    };

    const hasActiveFilters = search.trim() !== '' || selectedRole !== 'all';

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'Notifications', href: '/admin/notifications' },
                {
                    title: 'Template Registry',
                    href: '/admin/notifications/templates',
                },
            ]}
        >
            <Head title="Notification Template Registry & Event Catalogue" />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Template Governance"
                    title="Notification Template Registry & Event Catalogue"
                    description="Pre-approved message definitions, DLT compliance codes, and Meta WhatsApp utility templates."
                />

                {/* Filter & Role Pill Tabs Strip + Search Bar */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <Tabs
                        value={selectedRole}
                        onValueChange={(val) =>
                            setSelectedRole(
                                val as
                                    | 'all'
                                    | 'customer'
                                    | 'partner'
                                    | 'admin',
                            )
                        }
                        className="space-y-0"
                    >
                        <TabsList
                            variant="pill"
                            label="Filter templates by recipient role"
                        >
                            <TabsTrigger value="all">All Roles</TabsTrigger>
                            <TabsTrigger value="customer">
                                Customer Events
                            </TabsTrigger>
                            <TabsTrigger value="partner">
                                Partner Events
                            </TabsTrigger>
                            <TabsTrigger value="admin">
                                Admin Events
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <Card className="w-full py-2 lg:w-80">
                        <CardContent className="px-3">
                            <div className="relative">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    type="text"
                                    placeholder="Search templates or variables..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-9.5 border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Template Cards Grid */}
                {filteredTemplates.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="No templates match your search"
                        description="Try adjusting your search query or switching to All Roles to browse all approved notification templates."
                        action={
                            hasActiveFilters ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setSearch('');
                                        setSelectedRole('all');
                                    }}
                                >
                                    Reset filters
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {filteredTemplates.map((tpl) => (
                            <Card
                                key={tpl.code}
                                className="gap-4 py-5 transition-colors hover:border-tijum-coral/45"
                            >
                                <CardHeader className="pb-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {getChannelBadge(tpl.channel)}
                                                <span className="font-mono text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                    {tpl.code}
                                                </span>
                                            </div>
                                            <CardTitle className="mt-2 text-sm font-semibold">
                                                {tpl.title}
                                            </CardTitle>
                                        </div>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={previewLoading}
                                            onClick={() =>
                                                openPreview(tpl.code)
                                            }
                                            className="shrink-0"
                                        >
                                            <Eye
                                                className="size-3.5 text-tijum-coral"
                                                aria-hidden="true"
                                            />
                                            <span>Preview</span>
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs">
                                    <div className="line-clamp-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3 font-mono text-[11px] leading-relaxed text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                                        {tpl.body_template}
                                    </div>

                                    {(tpl.dlt_template_id ||
                                        tpl.meta_template_name) && (
                                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                            {tpl.dlt_template_id && (
                                                <span className="rounded-md border border-status-warning-border bg-status-warning-bg px-2 py-0.5 font-mono text-status-warning-fg tabular-nums">
                                                    DLT: {tpl.dlt_template_id}
                                                </span>
                                            )}
                                            {tpl.meta_template_name && (
                                                <span className="rounded-md border border-status-success-border bg-status-success-bg px-2 py-0.5 font-mono text-status-success-fg">
                                                    Meta:{' '}
                                                    {tpl.meta_template_name}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <span className="font-heading text-[10px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                            Approved Variables:
                                        </span>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {tpl.approved_variables.map((v) => (
                                                <span
                                                    key={v}
                                                    className="rounded-md border border-tijum-surface/80 bg-tijum-cream/60 px-2 py-0.5 font-mono text-[11px] text-tijum-plum dark:border-border dark:bg-muted dark:text-foreground"
                                                >
                                                    {`{${v}}`}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Live Preview Modal */}
                <Dialog
                    open={!!previewModal}
                    onOpenChange={(open) => !open && setPreviewModal(null)}
                >
                    <DialogContent className="max-w-lg border border-tijum-surface/80 bg-white text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                        <DialogHeader>
                            <DialogTitle className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                Template Preview: {previewModal?.code}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Rendered using real sample data with HTML entity
                                sanitization applied.
                            </DialogDescription>
                        </DialogHeader>

                        {previewModal && (
                            <div className="space-y-4 pt-2">
                                {previewModal.subject && (
                                    <div className="space-y-1.5">
                                        <div className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                            Subject Line
                                        </div>
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/50 p-3 text-xs font-medium text-tijum-plum dark:border-border dark:bg-muted/60 dark:text-foreground">
                                            {previewModal.subject}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <div className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Rendered Body Text
                                    </div>
                                    <div className="rounded-xl border border-tijum-peach/50 bg-tijum-cream/50 p-3.5 font-sans text-xs leading-relaxed whitespace-pre-line text-tijum-plum dark:border-tijum-coral/35 dark:bg-muted/50 dark:text-foreground">
                                        {previewModal.body}
                                    </div>
                                </div>

                                <div className="space-y-1.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-3.5 text-xs text-tijum-plum dark:border-border dark:bg-muted/40 dark:text-foreground">
                                    <div className="font-heading font-semibold text-tijum-plum-muted dark:text-muted-foreground">
                                        Compliance Metadata:
                                    </div>
                                    {previewModal.dlt_template_id && (
                                        <div>
                                            TRAI DLT Content Template ID:{' '}
                                            <code className="font-mono font-semibold tabular-nums">
                                                {previewModal.dlt_template_id}
                                            </code>
                                        </div>
                                    )}
                                    {previewModal.meta_template_name && (
                                        <div>
                                            Meta WhatsApp Template:{' '}
                                            <code className="font-mono font-semibold">
                                                {
                                                    previewModal.meta_template_name
                                                }
                                            </code>{' '}
                                            (Utility)
                                        </div>
                                    )}
                                    {!previewModal.dlt_template_id &&
                                        !previewModal.meta_template_name && (
                                            <div className="text-tijum-plum-muted dark:text-muted-foreground">
                                                Standard transactional template
                                                (no external DLT/Meta ID
                                                required).
                                            </div>
                                        )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
