import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    Clock,
    ExternalLink,
    FileText,
    Globe,
    History,
    Layers,
    Plus,
    RotateCcw,
    Save,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/layouts/admin-layout';
import type {
    ContentBlock,
    ContentBlockType,
    ContentPage,
    ContentPageRevision,
} from '@/types/cms';

interface Props {
    page?: ContentPage | null;
    statuses: Array<{ value: string; label: string }>;
}

interface BenefitItem {
    title: string;
    description: string;
    badge?: string;
}

function formatDateTimeLocal(value?: string | null): string {
    if (!value) return '';
    return value.replace(' ', 'T').slice(0, 16);
}

function getStatusBadgeMeta(statusValue: string): {
    status: SemanticStatus;
    label: string;
} {
    switch (statusValue) {
        case 'published':
            return { status: 'active', label: 'Published' };
        case 'scheduled':
            return { status: 'info', label: 'Scheduled' };
        case 'archived':
            return { status: 'neutral', label: 'Archived' };
        default:
            return { status: 'pending', label: 'Draft' };
    }
}

export default function AdminContentPageForm({ page, statuses }: Props) {
    const isEditing = Boolean(page?.id);

    const { data, setData, post, put, processing, errors } = useForm({
        title: page?.title || '',
        internal_name: page?.internal_name || '',
        slug: page?.slug || '',
        summary: page?.summary || '',
        content_blocks: (page?.content_blocks || []) as ContentBlock[],
        featured_image: page?.featured_image || '',
        status: page?.status || 'draft',
        scheduled_for: formatDateTimeLocal(page?.scheduled_for),
        seo_title: page?.seo_title || '',
        seo_description: page?.seo_description || '',
        canonical_override: page?.canonical_override || '',
        robots_directive: page?.robots_directive || 'index, follow',
        og_image: page?.og_image || '',
        change_notes: '',
    });

    const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'revisions'>(
        'content',
    );
    const [restoringRevision, setRestoringRevision] =
        useState<ContentPageRevision | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing && page) {
            put(`/admin/content/pages/${page.id}`);
        } else {
            post('/admin/content/pages');
        }
    };

    const addBlock = (type: ContentBlockType) => {
        let initialData: Record<string, unknown> = {};
        if (type === 'hero') {
            initialData = {
                title: 'Heading Title',
                subtitle: 'Subtitle text',
                cta_text: 'Explore Stays',
                cta_url: '/search',
            };
        } else if (type === 'text') {
            initialData = {
                heading: 'Section Heading',
                body: '<p>Enter section body text here...</p>',
            };
        } else if (type === 'benefits') {
            initialData = {
                heading: 'Key Benefits',
                items: [
                    {
                        title: 'Food Included',
                        description: '3 freshly prepared meals daily',
                        badge: 'Meals',
                    },
                ],
            };
        } else if (type === 'cta') {
            initialData = {
                heading: 'Ready to Book?',
                description: 'Choose your room category today',
                button_text: 'Search Rooms',
                button_url: '/search',
            };
        }

        const newBlocks: ContentBlock[] = [
            ...(data.content_blocks || []),
            { type, data: initialData },
        ];
        setData('content_blocks', newBlocks);
    };

    const removeBlock = (index: number) => {
        const newBlocks = (data.content_blocks || []).filter(
            (_, i) => i !== index,
        );
        setData('content_blocks', newBlocks);
    };

    const moveBlock = (index: number, direction: -1 | 1) => {
        const blocks = [...(data.content_blocks || [])];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= blocks.length) return;
        const [moved] = blocks.splice(index, 1);
        blocks.splice(targetIndex, 0, moved);
        setData('content_blocks', blocks);
    };

    const updateBlockData = (index: number, key: string, value: unknown) => {
        const blocks = [...(data.content_blocks || [])];
        if (blocks[index]) {
            blocks[index] = {
                ...blocks[index],
                data: {
                    ...blocks[index].data,
                    [key]: value,
                },
            };
            setData('content_blocks', blocks);
        }
    };

    const updateBenefitItem = (
        blockIndex: number,
        itemIndex: number,
        field: keyof BenefitItem,
        value: string,
    ) => {
        const blocks = [...(data.content_blocks || [])];
        const block = blocks[blockIndex];
        if (!block) return;
        const items = Array.isArray(block.data?.items)
            ? [...(block.data.items as BenefitItem[])]
            : [];
        items[itemIndex] = {
            ...(items[itemIndex] || { title: '', description: '', badge: '' }),
            [field]: value,
        };
        updateBlockData(blockIndex, 'items', items);
    };

    const addBenefitItem = (blockIndex: number) => {
        const block = data.content_blocks?.[blockIndex];
        const items = Array.isArray(block?.data?.items)
            ? [...(block.data.items as BenefitItem[])]
            : [];
        items.push({ title: '', description: '', badge: '' });
        updateBlockData(blockIndex, 'items', items);
    };

    const removeBenefitItem = (blockIndex: number, itemIndex: number) => {
        const block = data.content_blocks?.[blockIndex];
        const items = Array.isArray(block?.data?.items)
            ? (block.data.items as BenefitItem[]).filter(
                  (_, i) => i !== itemIndex,
              )
            : [];
        updateBlockData(blockIndex, 'items', items);
    };

    const handleConfirmRestoreRevision = () => {
        if (!page || !restoringRevision) return;
        setIsRestoring(true);
        router.post(
            `/admin/content/pages/${page.id}/revisions/${restoringRevision.id}/restore`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setRestoringRevision(null),
                onFinish: () => setIsRestoring(false),
            },
        );
    };

    const errorEntries = Object.entries(errors);
    const statusMeta = getStatusBadgeMeta(data.status);

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/admin/dashboard' },
                { title: 'Pages', href: '/admin/content/pages' },
                {
                    title: isEditing ? `Edit: ${page?.title}` : 'Create Page',
                    href: '#',
                },
            ]}
        >
            <Head
                title={
                    isEditing
                        ? `Edit Page: ${page?.title}`
                        : 'Create Page — Admin'
                }
            />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="Content Management"
                    title={
                        isEditing
                            ? `Edit Page: ${page?.title}`
                            : 'Create Content Page'
                    }
                    description="Build modular, responsive marketing and institutional info pages."
                    badges={
                        isEditing ? (
                            <StatusBadge
                                status={statusMeta.status}
                                label={statusMeta.label}
                            />
                        ) : undefined
                    }
                    actions={
                        <>
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/admin/content/pages">
                                    <ArrowLeft
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Back to Pages</span>
                                </Link>
                            </Button>
                            {isEditing && page && (
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={`/p/${page.slug}?preview=true`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>Preview Draft</span>
                                    </a>
                                </Button>
                            )}
                        </>
                    }
                />

                {errorEntries.length > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="size-4" aria-hidden="true" />
                        <AlertTitle>Please review validation errors</AlertTitle>
                        <AlertDescription>
                            {errorEntries.map(([field, message]) => (
                                <span key={field} className="block text-xs">
                                    {message}
                                </span>
                            ))}
                        </AlertDescription>
                    </Alert>
                )}

                <Tabs
                    value={activeTab}
                    onValueChange={(val) =>
                        setActiveTab(val as 'content' | 'seo' | 'revisions')
                    }
                >
                    <TabsList variant="pill" label="Page Builder Sections">
                        <TabsTrigger value="content">
                            <FileText className="size-3.5" aria-hidden="true" />
                            <span>Page Content &amp; Blocks</span>
                        </TabsTrigger>
                        <TabsTrigger value="seo">
                            <Globe className="size-3.5" aria-hidden="true" />
                            <span>SEO &amp; Metadata</span>
                        </TabsTrigger>
                        {isEditing && (
                            <TabsTrigger value="revisions">
                                <History
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>
                                    Revision History (
                                    {page?.revisions?.length || 0})
                                </span>
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <TabsContent value="content">
                            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                                {/* Main Content Info & Blocks */}
                                <div className="space-y-6 lg:col-span-2">
                                    <Card>
                                        <CardHeader className="border-b border-tijum-surface/70 pb-4 dark:border-border">
                                            <CardTitle className="text-base sm:text-lg">
                                                Page Identity &amp; Summary
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Public route details, internal
                                                reference label, and short
                                                excerpt.
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            <div className="space-y-1.5">
                                                <Label
                                                    htmlFor="page-title"
                                                    className="text-tijum-plum dark:text-foreground"
                                                >
                                                    Public Page Title *
                                                </Label>
                                                <Input
                                                    id="page-title"
                                                    type="text"
                                                    value={data.title}
                                                    onChange={(e) =>
                                                        setData(
                                                            'title',
                                                            e.target.value,
                                                        )
                                                    }
                                                    aria-invalid={Boolean(
                                                        errors.title,
                                                    )}
                                                    className="h-11 text-base font-semibold"
                                                    required
                                                />
                                                <InputError
                                                    message={errors.title}
                                                    className="text-xs"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor="page-slug"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        URL Slug
                                                    </Label>
                                                    <Input
                                                        id="page-slug"
                                                        type="text"
                                                        value={data.slug}
                                                        onChange={(e) =>
                                                            setData(
                                                                'slug',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="about-tijum"
                                                        aria-invalid={Boolean(
                                                            errors.slug,
                                                        )}
                                                        className="h-10.5 font-mono text-sm"
                                                    />
                                                    <InputError
                                                        message={errors.slug}
                                                        className="text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor="page-internal-name"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        Internal Reference Name
                                                    </Label>
                                                    <Input
                                                        id="page-internal-name"
                                                        type="text"
                                                        value={
                                                            data.internal_name
                                                        }
                                                        onChange={(e) =>
                                                            setData(
                                                                'internal_name',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="For internal admin identification"
                                                        className="h-10.5"
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.internal_name
                                                        }
                                                        className="text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label
                                                    htmlFor="page-summary"
                                                    className="text-tijum-plum dark:text-foreground"
                                                >
                                                    Page Summary / Excerpt
                                                </Label>
                                                <Textarea
                                                    id="page-summary"
                                                    value={data.summary}
                                                    onChange={(e) =>
                                                        setData(
                                                            'summary',
                                                            e.target.value,
                                                        )
                                                    }
                                                    rows={2}
                                                    placeholder="Short 1-2 sentence description of the page..."
                                                />
                                                <InputError
                                                    message={errors.summary}
                                                    className="text-xs"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Modular Block Builder */}
                                    <div className="space-y-4">
                                        <Card className="py-4">
                                            <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5">
                                                <div className="flex items-center gap-2">
                                                    <Layers
                                                        className="size-4.5 text-tijum-coral"
                                                        aria-hidden="true"
                                                    />
                                                    <h2 className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                                        Content Blocks
                                                    </h2>
                                                    <Badge
                                                        variant="secondary"
                                                        className="font-mono tabular-nums"
                                                    >
                                                        {data.content_blocks
                                                            ?.length || 0}
                                                    </Badge>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                                        Add block:
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1 text-xs"
                                                        onClick={() =>
                                                            addBlock('hero')
                                                        }
                                                    >
                                                        <Plus
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        <span>Hero</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1 text-xs"
                                                        onClick={() =>
                                                            addBlock('text')
                                                        }
                                                    >
                                                        <Plus
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        <span>Text</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1 text-xs"
                                                        onClick={() =>
                                                            addBlock('benefits')
                                                        }
                                                    >
                                                        <Plus
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        <span>Benefits</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1 text-xs"
                                                        onClick={() =>
                                                            addBlock('cta')
                                                        }
                                                    >
                                                        <Plus
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        <span>CTA</span>
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {!data.content_blocks ||
                                        data.content_blocks.length === 0 ? (
                                            <EmptyState
                                                icon={Layers}
                                                title="No content blocks added yet"
                                                description="Use an Add block control above to assemble Hero, Text, Benefits, or CTA modules."
                                            />
                                        ) : (
                                            data.content_blocks.map(
                                                (
                                                    block: ContentBlock,
                                                    idx: number,
                                                ) => (
                                                    <Card
                                                        key={idx}
                                                        className="gap-4 py-5"
                                                    >
                                                        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 border-b border-tijum-surface/70 pb-3 dark:border-border">
                                                            <div className="flex items-center gap-2">
                                                                <Badge
                                                                    variant="peach"
                                                                    className="font-mono tabular-nums"
                                                                >
                                                                    #{idx + 1}
                                                                </Badge>
                                                                <span className="font-heading text-xs font-bold tracking-wider text-tijum-plum uppercase dark:text-foreground">
                                                                    {block.type.replace(
                                                                        '_',
                                                                        ' ',
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-1.5">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={
                                                                        idx ===
                                                                        0
                                                                    }
                                                                    aria-label={`Move block ${idx + 1} up`}
                                                                    className="h-8 px-2"
                                                                    onClick={() =>
                                                                        moveBlock(
                                                                            idx,
                                                                            -1,
                                                                        )
                                                                    }
                                                                >
                                                                    <ArrowUp
                                                                        className="size-3.5"
                                                                        aria-hidden="true"
                                                                    />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={
                                                                        idx ===
                                                                        (data
                                                                            .content_blocks
                                                                            ?.length ||
                                                                            1) -
                                                                            1
                                                                    }
                                                                    aria-label={`Move block ${idx + 1} down`}
                                                                    className="h-8 px-2"
                                                                    onClick={() =>
                                                                        moveBlock(
                                                                            idx,
                                                                            1,
                                                                        )
                                                                    }
                                                                >
                                                                    <ArrowDown
                                                                        className="size-3.5"
                                                                        aria-hidden="true"
                                                                    />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        removeBlock(
                                                                            idx,
                                                                        )
                                                                    }
                                                                    className="h-8 gap-1 border-status-error-border text-xs text-status-error-fg hover:bg-status-error-bg/70"
                                                                >
                                                                    <Trash2
                                                                        className="size-3.5"
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span>
                                                                        Remove
                                                                    </span>
                                                                </Button>
                                                            </div>
                                                        </CardHeader>

                                                        <CardContent className="space-y-3">
                                                            {block.type ===
                                                                'hero' && (
                                                                <div className="space-y-3">
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs text-tijum-plum dark:text-foreground">
                                                                            Hero
                                                                            Headline
                                                                        </Label>
                                                                        <Input
                                                                            type="text"
                                                                            value={String(
                                                                                block
                                                                                    .data
                                                                                    ?.title ||
                                                                                    '',
                                                                            )}
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                updateBlockData(
                                                                                    idx,
                                                                                    'title',
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="h-10"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs text-tijum-plum dark:text-foreground">
                                                                            Hero
                                                                            Subtitle
                                                                        </Label>
                                                                        <Textarea
                                                                            value={String(
                                                                                block
                                                                                    .data
                                                                                    ?.subtitle ||
                                                                                    '',
                                                                            )}
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                updateBlockData(
                                                                                    idx,
                                                                                    'subtitle',
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            rows={
                                                                                2
                                                                            }
                                                                            className="min-h-18"
                                                                        />
                                                                    </div>
                                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-xs text-tijum-plum dark:text-foreground">
                                                                                Button
                                                                                Text
                                                                            </Label>
                                                                            <Input
                                                                                type="text"
                                                                                value={String(
                                                                                    block
                                                                                        .data
                                                                                        ?.cta_text ||
                                                                                        '',
                                                                                )}
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    updateBlockData(
                                                                                        idx,
                                                                                        'cta_text',
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                className="h-10"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-xs text-tijum-plum dark:text-foreground">
                                                                                Button
                                                                                Link
                                                                            </Label>
                                                                            <Input
                                                                                type="text"
                                                                                value={String(
                                                                                    block
                                                                                        .data
                                                                                        ?.cta_url ||
                                                                                        '',
                                                                                )}
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    updateBlockData(
                                                                                        idx,
                                                                                        'cta_url',
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                className="h-10 font-mono text-xs"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {block.type ===
                                                                'text' && (
                                                                <div className="space-y-3">
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs text-tijum-plum dark:text-foreground">
                                                                            Section
                                                                            Heading
                                                                        </Label>
                                                                        <Input
                                                                            type="text"
                                                                            value={String(
                                                                                block
                                                                                    .data
                                                                                    ?.heading ||
                                                                                    '',
                                                                            )}
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                updateBlockData(
                                                                                    idx,
                                                                                    'heading',
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="h-10 font-semibold"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs text-tijum-plum dark:text-foreground">
                                                                            Body
                                                                            HTML
                                                                            /
                                                                            Text
                                                                        </Label>
                                                                        <Textarea
                                                                            value={String(
                                                                                block
                                                                                    .data
                                                                                    ?.body ||
                                                                                    block
                                                                                        .data
                                                                                        ?.text ||
                                                                                    '',
                                                                            )}
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                updateBlockData(
                                                                                    idx,
                                                                                    'body',
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            rows={
                                                                                5
                                                                            }
                                                                            className="font-mono text-sm"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {block.type ===
                                                                'benefits' && (
                                                                <div className="space-y-3">
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs text-tijum-plum dark:text-foreground">
                                                                            Benefits
                                                                            Section
                                                                            Heading
                                                                        </Label>
                                                                        <Input
                                                                            type="text"
                                                                            value={String(
                                                                                block
                                                                                    .data
                                                                                    ?.heading ||
                                                                                    '',
                                                                            )}
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                updateBlockData(
                                                                                    idx,
                                                                                    'heading',
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="h-10 font-semibold"
                                                                        />
                                                                    </div>

                                                                    <div className="space-y-2.5">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="font-heading text-xs font-semibold text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                                                Benefit
                                                                                Items
                                                                            </span>
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-8 gap-1 text-xs"
                                                                                onClick={() =>
                                                                                    addBenefitItem(
                                                                                        idx,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Plus
                                                                                    className="size-3.5"
                                                                                    aria-hidden="true"
                                                                                />
                                                                                <span>
                                                                                    Add
                                                                                    Item
                                                                                </span>
                                                                            </Button>
                                                                        </div>

                                                                        {(Array.isArray(
                                                                            block
                                                                                .data
                                                                                ?.items,
                                                                        )
                                                                            ? (block
                                                                                  .data
                                                                                  .items as BenefitItem[])
                                                                            : []
                                                                        ).map(
                                                                            (
                                                                                item,
                                                                                itemIdx,
                                                                            ) => (
                                                                                <div
                                                                                    key={
                                                                                        itemIdx
                                                                                    }
                                                                                    className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3 dark:border-border dark:bg-muted/45"
                                                                                >
                                                                                    <div className="flex items-center justify-between gap-2">
                                                                                        <span className="font-mono text-[11px] font-semibold text-tijum-plum-muted dark:text-muted-foreground">
                                                                                            Item
                                                                                            #
                                                                                            {itemIdx +
                                                                                                1}
                                                                                        </span>
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            aria-label={`Remove benefit item ${itemIdx + 1}`}
                                                                                            className="h-7 border-status-error-border px-2 text-xs text-status-error-fg hover:bg-status-error-bg/70"
                                                                                            onClick={() =>
                                                                                                removeBenefitItem(
                                                                                                    idx,
                                                                                                    itemIdx,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Trash2
                                                                                                className="size-3.5"
                                                                                                aria-hidden="true"
                                                                                            />
                                                                                        </Button>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={
                                                                                                item.title ||
                                                                                                ''
                                                                                            }
                                                                                            onChange={(
                                                                                                e,
                                                                                            ) =>
                                                                                                updateBenefitItem(
                                                                                                    idx,
                                                                                                    itemIdx,
                                                                                                    'title',
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                                )
                                                                                            }
                                                                                            placeholder="Benefit title"
                                                                                            className="h-9.5 text-xs"
                                                                                        />
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={
                                                                                                item.badge ||
                                                                                                ''
                                                                                            }
                                                                                            onChange={(
                                                                                                e,
                                                                                            ) =>
                                                                                                updateBenefitItem(
                                                                                                    idx,
                                                                                                    itemIdx,
                                                                                                    'badge',
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                                )
                                                                                            }
                                                                                            placeholder="Badge (optional)"
                                                                                            className="h-9.5 text-xs"
                                                                                        />
                                                                                    </div>
                                                                                    <Input
                                                                                        type="text"
                                                                                        value={
                                                                                            item.description ||
                                                                                            ''
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            updateBenefitItem(
                                                                                                idx,
                                                                                                itemIdx,
                                                                                                'description',
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                        placeholder="Short benefit description"
                                                                                        className="h-9.5 text-xs"
                                                                                    />
                                                                                </div>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {block.type ===
                                                                'cta' && (
                                                                <div className="space-y-3">
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs text-tijum-plum dark:text-foreground">
                                                                            Call
                                                                            to
                                                                            Action
                                                                            Heading
                                                                        </Label>
                                                                        <Input
                                                                            type="text"
                                                                            value={String(
                                                                                block
                                                                                    .data
                                                                                    ?.heading ||
                                                                                    '',
                                                                            )}
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                updateBlockData(
                                                                                    idx,
                                                                                    'heading',
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="h-10"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs text-tijum-plum dark:text-foreground">
                                                                            Call
                                                                            to
                                                                            Action
                                                                            Description
                                                                        </Label>
                                                                        <Input
                                                                            type="text"
                                                                            value={String(
                                                                                block
                                                                                    .data
                                                                                    ?.description ||
                                                                                    '',
                                                                            )}
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                updateBlockData(
                                                                                    idx,
                                                                                    'description',
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="h-10"
                                                                        />
                                                                    </div>
                                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-xs text-tijum-plum dark:text-foreground">
                                                                                Button
                                                                                Label
                                                                            </Label>
                                                                            <Input
                                                                                type="text"
                                                                                value={String(
                                                                                    block
                                                                                        .data
                                                                                        ?.button_text ||
                                                                                        '',
                                                                                )}
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    updateBlockData(
                                                                                        idx,
                                                                                        'button_text',
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                className="h-10"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-xs text-tijum-plum dark:text-foreground">
                                                                                Destination
                                                                                URL
                                                                            </Label>
                                                                            <Input
                                                                                type="text"
                                                                                value={String(
                                                                                    block
                                                                                        .data
                                                                                        ?.button_url ||
                                                                                        '',
                                                                                )}
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    updateBlockData(
                                                                                        idx,
                                                                                        'button_url',
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                className="h-10 font-mono text-xs"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {![
                                                                'hero',
                                                                'text',
                                                                'benefits',
                                                                'cta',
                                                            ].includes(
                                                                block.type,
                                                            ) && (
                                                                <div className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                                    <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                                        Structured
                                                                        Block
                                                                        Payload
                                                                    </p>
                                                                    <pre className="overflow-x-auto font-mono text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                                        {JSON.stringify(
                                                                            block.data,
                                                                            null,
                                                                            2,
                                                                        )}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                ),
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Sidebar Settings */}
                                <Card className="lg:col-span-1">
                                    <CardHeader className="border-b border-tijum-surface/70 pb-4 dark:border-border">
                                        <CardTitle className="text-base">
                                            Publishing Controls
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Control lifecycle visibility,
                                            featured media, and audit notes.
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="page-status"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Status
                                            </Label>
                                            <Select
                                                value={data.status}
                                                onValueChange={(val) =>
                                                    setData(
                                                        'status',
                                                        val as ContentPage['status'],
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="page-status"
                                                    size="sm"
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
                                            <InputError
                                                message={errors.status}
                                                className="text-xs"
                                            />
                                        </div>

                                        {data.status === 'scheduled' && (
                                            <div className="space-y-1.5">
                                                <Label
                                                    htmlFor="page-scheduled-for"
                                                    className="text-tijum-plum dark:text-foreground"
                                                >
                                                    Scheduled Publication Date
                                                </Label>
                                                <Input
                                                    id="page-scheduled-for"
                                                    type="datetime-local"
                                                    value={data.scheduled_for}
                                                    onChange={(e) =>
                                                        setData(
                                                            'scheduled_for',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-10.5"
                                                />
                                                <InputError
                                                    message={
                                                        errors.scheduled_for
                                                    }
                                                    className="text-xs"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="page-featured-image"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Featured Image URL
                                            </Label>
                                            <Input
                                                id="page-featured-image"
                                                type="text"
                                                value={data.featured_image}
                                                onChange={(e) =>
                                                    setData(
                                                        'featured_image',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="/images/public/about-hero.jpg"
                                                className="h-10.5 font-mono text-xs"
                                            />
                                            {data.featured_image && (
                                                <div className="overflow-hidden rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 dark:border-border dark:bg-muted/45">
                                                    <img
                                                        src={
                                                            data.featured_image
                                                        }
                                                        alt="Featured preview"
                                                        className="aspect-video w-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <InputError
                                                message={errors.featured_image}
                                                className="text-xs"
                                            />
                                        </div>

                                        {isEditing && (
                                            <div className="space-y-1.5">
                                                <Label
                                                    htmlFor="page-change-notes"
                                                    className="text-tijum-plum dark:text-foreground"
                                                >
                                                    Change Notes (for revision
                                                    audit)
                                                </Label>
                                                <Input
                                                    id="page-change-notes"
                                                    type="text"
                                                    value={data.change_notes}
                                                    onChange={(e) =>
                                                        setData(
                                                            'change_notes',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g. Updated contact details"
                                                    className="h-10.5 text-xs"
                                                />
                                                <InputError
                                                    message={
                                                        errors.change_notes
                                                    }
                                                    className="text-xs"
                                                />
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            variant="plum"
                                            loading={processing}
                                            className="w-full"
                                        >
                                            <Save
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                {processing
                                                    ? 'Saving...'
                                                    : isEditing
                                                      ? 'Save Changes'
                                                      : 'Create Page'}
                                            </span>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="seo">
                            <Card className="max-w-3xl">
                                <CardHeader className="border-b border-tijum-surface/70 pb-4 dark:border-border">
                                    <CardTitle className="text-base sm:text-lg">
                                        Search Engine Optimization (SEO)
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Configure metadata, crawler directives,
                                        canonical overrides, and social card
                                        assets.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="page-seo-title"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            SEO Title Tag
                                        </Label>
                                        <Input
                                            id="page-seo-title"
                                            type="text"
                                            value={data.seo_title}
                                            onChange={(e) =>
                                                setData(
                                                    'seo_title',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder={
                                                data.title
                                                    ? `${data.title} | TIJUM`
                                                    : 'Title for search engines'
                                            }
                                            className="h-10.5"
                                        />
                                        <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            Length: {data.seo_title.length}{' '}
                                            characters (Optimal: 40–65)
                                        </p>
                                        <InputError
                                            message={errors.seo_title}
                                            className="text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="page-seo-description"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Meta Description
                                        </Label>
                                        <Textarea
                                            id="page-seo-description"
                                            value={data.seo_description}
                                            onChange={(e) =>
                                                setData(
                                                    'seo_description',
                                                    e.target.value,
                                                )
                                            }
                                            rows={3}
                                            placeholder="Brief summary displayed in Google search results..."
                                        />
                                        <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            Length:{' '}
                                            {data.seo_description.length}{' '}
                                            characters (Optimal: 120–160)
                                        </p>
                                        <InputError
                                            message={errors.seo_description}
                                            className="text-xs"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="page-robots"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Robots Directive
                                            </Label>
                                            <Select
                                                value={data.robots_directive}
                                                onValueChange={(val) =>
                                                    setData(
                                                        'robots_directive',
                                                        val,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="page-robots"
                                                    size="sm"
                                                    className="w-full"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="index, follow">
                                                        index, follow (Default -
                                                        Indexable)
                                                    </SelectItem>
                                                    <SelectItem value="noindex, follow">
                                                        noindex, follow (Hide
                                                        from search, follow
                                                        links)
                                                    </SelectItem>
                                                    <SelectItem value="noindex, nofollow">
                                                        noindex, nofollow
                                                        (Completely private)
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={
                                                    errors.robots_directive
                                                }
                                                className="text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="page-canonical"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Canonical URL Override
                                            </Label>
                                            <Input
                                                id="page-canonical"
                                                type="text"
                                                value={data.canonical_override}
                                                onChange={(e) =>
                                                    setData(
                                                        'canonical_override',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Leave empty for automatic canonical URL"
                                                className="h-10.5 font-mono text-xs"
                                            />
                                            <InputError
                                                message={
                                                    errors.canonical_override
                                                }
                                                className="text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="page-og-image"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Open Graph / Social Sharing Image
                                            URL
                                        </Label>
                                        <Input
                                            id="page-og-image"
                                            type="text"
                                            value={data.og_image}
                                            onChange={(e) =>
                                                setData(
                                                    'og_image',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="/images/public/og-tijum-cover.jpg"
                                            className="h-10.5 font-mono text-xs"
                                        />
                                        <InputError
                                            message={errors.og_image}
                                            className="text-xs"
                                        />
                                    </div>

                                    {/* Live Search Preview */}
                                    <div className="space-y-1 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                                        <span className="font-heading text-xs font-bold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                            Search Result Editorial Preview
                                        </span>
                                        <div className="truncate text-base font-medium text-blue-700 hover:underline dark:text-blue-400">
                                            {data.seo_title ||
                                                data.title ||
                                                'Page Title'}{' '}
                                            | TIJUM
                                        </div>
                                        <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                                            https://tijum.com/p/
                                            {data.slug || 'page-slug'}
                                        </div>
                                        <div className="line-clamp-2 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            {data.seo_description ||
                                                data.summary ||
                                                'Discover food-inclusive Hostels/PG, Homestays, and Co-Living accommodations on TIJUM with transparent rates and verified bookings.'}
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            variant="plum"
                                            loading={processing}
                                        >
                                            <Save
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                            <span>Save SEO Settings</span>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {isEditing && (
                            <TabsContent value="revisions">
                                <Card>
                                    <CardHeader className="border-b border-tijum-surface/70 pb-4 dark:border-border">
                                        <CardTitle className="text-base sm:text-lg">
                                            Historical Revisions Audit
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Inspect past edits and restore
                                            content versions if necessary.
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        {!page?.revisions ||
                                        page.revisions.length === 0 ? (
                                            <EmptyState
                                                icon={History}
                                                title="No revisions recorded"
                                                description="Revision snapshots are saved automatically each time this page is updated."
                                                className="border-none py-6 shadow-none"
                                            />
                                        ) : (
                                            <div className="divide-y divide-tijum-surface/70 dark:divide-border">
                                                {page.revisions.map(
                                                    (
                                                        rev: ContentPageRevision,
                                                    ) => (
                                                        <div
                                                            key={rev.id}
                                                            className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                                                        >
                                                            <div className="space-y-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="font-mono tabular-nums"
                                                                    >
                                                                        Version{' '}
                                                                        {
                                                                            rev.version
                                                                        }
                                                                    </Badge>
                                                                    <span className="inline-flex items-center gap-1 text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                                        <Clock
                                                                            className="size-3.5"
                                                                            aria-hidden="true"
                                                                        />
                                                                        <span>
                                                                            {new Date(
                                                                                rev.created_at,
                                                                            ).toLocaleString()}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                                    By:{' '}
                                                                    <span className="font-medium text-tijum-plum dark:text-foreground">
                                                                        {rev
                                                                            .admin
                                                                            ?.name ||
                                                                            'Administrator'}
                                                                    </span>{' '}
                                                                    &bull;{' '}
                                                                    {rev.change_notes ||
                                                                        'Content update'}
                                                                </p>
                                                            </div>

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 gap-1.5 self-start text-xs sm:self-auto"
                                                                onClick={() =>
                                                                    setRestoringRevision(
                                                                        rev,
                                                                    )
                                                                }
                                                            >
                                                                <RotateCcw
                                                                    className="size-3.5"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    Restore
                                                                    Version
                                                                </span>
                                                            </Button>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}
                    </form>
                </Tabs>
            </div>

            <ConfirmationDialog
                isOpen={Boolean(restoringRevision)}
                onOpenChange={(open) => !open && setRestoringRevision(null)}
                title={`Restore Version ${restoringRevision?.version}?`}
                description="Are you sure you want to restore this revision? Current unsaved edits on the form will be replaced."
                confirmLabel={isRestoring ? 'Restoring...' : 'Restore Version'}
                cancelLabel="Cancel"
                loading={isRestoring}
                onConfirm={handleConfirmRestoreRevision}
                onCancel={() => setRestoringRevision(null)}
            />
        </AdminLayout>
    );
}
