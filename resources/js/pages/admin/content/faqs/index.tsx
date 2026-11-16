import { Head, router, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    Edit3,
    Filter,
    HelpCircle,
    Layers,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/layouts/admin-layout';
import type { ContentFaq } from '@/types/cms';

interface Props {
    faqs: {
        data: ContentFaq[];
        current_page: number;
        last_page: number;
        total: number;
    };
    categories: string[];
    currentCategory?: string | null;
}

export default function AdminFaqsIndex({
    faqs,
    categories,
    currentCategory,
}: Props) {
    const [editingFaq, setEditingFaq] = useState<ContentFaq | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deletingFaq, setDeletingFaq] = useState<ContentFaq | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const form = useForm({
        question: '',
        answer: '',
        category: 'general',
        display_order: 0,
        is_published: true,
    });

    const publishedOnPage = faqs.data.filter((faq) => faq.is_published).length;

    const closeFormDialog = () => {
        setIsCreateOpen(false);
        setEditingFaq(null);
        form.reset();
        form.clearErrors();
    };

    const handleCreateOpen = () => {
        setEditingFaq(null);
        form.reset();
        form.clearErrors();
        setIsCreateOpen(true);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/content/faqs', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                form.clearErrors();
                setIsCreateOpen(false);
            },
        });
    };

    const handleEditOpen = (faq: ContentFaq) => {
        setIsCreateOpen(false);
        setEditingFaq(faq);
        form.clearErrors();
        form.setData({
            question: faq.question,
            answer: faq.answer,
            category: faq.category,
            display_order: faq.display_order,
            is_published: faq.is_published,
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingFaq) return;
        form.put(`/admin/content/faqs/${editingFaq.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingFaq(null);
                form.reset();
                form.clearErrors();
            },
        });
    };

    const handleConfirmDelete = () => {
        if (!deletingFaq) return;
        setIsDeleting(true);
        router.delete(`/admin/content/faqs/${deletingFaq.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingFaq(null),
            onFinish: () => setIsDeleting(false),
        });
    };

    const handleFilterCategory = (category: string | null) => {
        router.get('/admin/content/faqs', category ? { category } : {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const isDialogOpen = isCreateOpen || Boolean(editingFaq);

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/admin/dashboard' },
                { title: 'Content Management', href: '/admin/content/pages' },
                { title: 'FAQs', href: '/admin/content/faqs' },
            ]}
        >
            <Head title="Content FAQs — Marketplace CMS" />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="Content Management"
                    title="Frequently Asked Questions"
                    description="Manage marketplace FAQs rendered on public landing pages, city guides, and search pages."
                    actions={
                        <Button
                            type="button"
                            variant="plum"
                            size="sm"
                            onClick={handleCreateOpen}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            <span>Add FAQ Item</span>
                        </Button>
                    }
                />

                <section
                    aria-label="FAQ overview metrics"
                    className="grid gap-4 sm:grid-cols-3"
                >
                    <StatCard
                        label="Total FAQ Items"
                        value={faqs.total}
                        helperText={
                            currentCategory
                                ? `Filtered by "${currentCategory}"`
                                : 'Across all FAQ categories'
                        }
                        icon={HelpCircle}
                    />
                    <StatCard
                        label="Published (This Page)"
                        value={`${publishedOnPage} / ${faqs.data.length}`}
                        helperText="Visible on public pages"
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="FAQ Categories"
                        value={categories.length}
                        helperText="Topic groups configured"
                        icon={Layers}
                    />
                </section>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                        <Filter className="size-3.5" aria-hidden="true" />
                        <span>Category</span>
                    </span>
                    <div
                        role="group"
                        aria-label="Filter FAQs by category"
                        className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-tijum-surface/80 bg-card p-1.5 shadow-tijum-card dark:border-border"
                    >
                        <button
                            type="button"
                            onClick={() => handleFilterCategory(null)}
                            className={`cursor-pointer rounded-xl px-3.5 py-1.5 font-heading text-xs font-semibold whitespace-nowrap transition-all ${
                                !currentCategory
                                    ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                                    : 'text-tijum-plum-muted hover:bg-tijum-cream/80 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground'
                            }`}
                        >
                            All ({faqs.total})
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => handleFilterCategory(cat)}
                                className={`cursor-pointer rounded-xl px-3.5 py-1.5 font-heading text-xs font-semibold whitespace-nowrap capitalize transition-all ${
                                    currentCategory === cat
                                        ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                                        : 'text-tijum-plum-muted hover:bg-tijum-cream/80 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* FAQ List */}
                {faqs.data.length === 0 ? (
                    <EmptyState
                        icon={HelpCircle}
                        title="No FAQ items found"
                        description="No FAQ items match this category yet. Create a new FAQ item or clear the active category filter."
                        action={
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {currentCategory && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleFilterCategory(null)
                                        }
                                    >
                                        Show All FAQs
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="plum"
                                    size="sm"
                                    onClick={handleCreateOpen}
                                >
                                    <Plus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Add FAQ Item</span>
                                </Button>
                            </div>
                        }
                    />
                ) : (
                    <Card className="gap-0 overflow-hidden py-0">
                        <div className="divide-y divide-tijum-surface/70 dark:divide-border">
                            {faqs.data.map((faq) => (
                                <div
                                    key={faq.id}
                                    className="flex flex-col justify-between gap-4 p-5 transition-colors hover:bg-tijum-cream/35 sm:flex-row sm:items-start dark:hover:bg-muted/40"
                                >
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                                variant="secondary"
                                                className="font-mono tabular-nums"
                                            >
                                                #{faq.display_order}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="capitalize"
                                            >
                                                {faq.category}
                                            </Badge>
                                            <StatusBadge
                                                status={
                                                    faq.is_published
                                                        ? 'active'
                                                        : 'pending'
                                                }
                                                label={
                                                    faq.is_published
                                                        ? 'Published'
                                                        : 'Draft'
                                                }
                                            />
                                        </div>
                                        <h2 className="font-heading text-base font-semibold text-tijum-plum dark:text-foreground">
                                            {faq.question}
                                        </h2>
                                        <p className="text-sm leading-relaxed whitespace-pre-line text-tijum-plum-muted dark:text-muted-foreground">
                                            {faq.answer}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-1.5 text-xs"
                                            onClick={() => handleEditOpen(faq)}
                                        >
                                            <Edit3
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                            <span>Edit</span>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            aria-label={`Delete FAQ "${faq.question}"`}
                                            className="h-8 border-status-error-border text-xs text-status-error-fg hover:bg-status-error-bg/70"
                                            onClick={() => setDeletingFaq(faq)}
                                        >
                                            <Trash2
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 dark:border-border dark:bg-muted/20">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {faqs.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {faqs.total}
                                </span>{' '}
                                FAQ(s)
                            </p>
                            <Pagination
                                currentPage={faqs.current_page}
                                totalPages={faqs.last_page}
                                onPageChange={(page) =>
                                    router.get(
                                        '/admin/content/faqs',
                                        {
                                            ...(currentCategory
                                                ? { category: currentCategory }
                                                : {}),
                                            page,
                                        },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                        },
                                    )
                                }
                            />
                        </div>
                    </Card>
                )}
            </div>

            {/* Create / Edit FAQ Dialog */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => !open && closeFormDialog()}
            >
                <DialogContent className="max-w-xl border border-tijum-surface/80 bg-white text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                    <DialogHeader>
                        <DialogTitle>
                            {editingFaq
                                ? 'Edit FAQ Item'
                                : 'Create New FAQ Item'}
                        </DialogTitle>
                        <DialogDescription>
                            Write clear, verified answers surfaced on public
                            landing pages and help sections.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={editingFaq ? handleUpdate : handleCreate}
                        className="space-y-4 py-1"
                    >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label
                                    htmlFor="faq-question"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Question *
                                </Label>
                                <Input
                                    id="faq-question"
                                    value={form.data.question}
                                    onChange={(e) =>
                                        form.setData('question', e.target.value)
                                    }
                                    placeholder="e.g. Is daily 3-time South Indian food truly included?"
                                    aria-invalid={Boolean(form.errors.question)}
                                    className="h-10.5"
                                    required
                                />
                                <InputError
                                    message={form.errors.question}
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="faq-category"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Category *
                                </Label>
                                <Input
                                    id="faq-category"
                                    value={form.data.category}
                                    onChange={(e) =>
                                        form.setData('category', e.target.value)
                                    }
                                    placeholder="e.g. general, food"
                                    aria-invalid={Boolean(form.errors.category)}
                                    className="h-10.5"
                                    required
                                />
                                <InputError
                                    message={form.errors.category}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="faq-answer"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Answer *
                            </Label>
                            <Textarea
                                id="faq-answer"
                                rows={5}
                                value={form.data.answer}
                                onChange={(e) =>
                                    form.setData('answer', e.target.value)
                                }
                                placeholder="Provide a clear, helpful, factual answer for guests and owners..."
                                aria-invalid={Boolean(form.errors.answer)}
                                required
                            />
                            <InputError
                                message={form.errors.answer}
                                className="text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="faq-display-order"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Display Order
                                </Label>
                                <Input
                                    id="faq-display-order"
                                    type="number"
                                    min={0}
                                    value={form.data.display_order}
                                    onChange={(e) =>
                                        form.setData(
                                            'display_order',
                                            parseInt(e.target.value) || 0,
                                        )
                                    }
                                    className="h-10.5 tabular-nums"
                                />
                                <InputError
                                    message={form.errors.display_order}
                                    className="text-xs"
                                />
                            </div>

                            <div className="flex h-10.5 items-center justify-between rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3.5 dark:border-border dark:bg-muted/45">
                                <Label
                                    htmlFor="faq-published"
                                    className="cursor-pointer text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Published
                                </Label>
                                <Switch
                                    id="faq-published"
                                    checked={form.data.is_published}
                                    onCheckedChange={(checked) =>
                                        form.setData('is_published', checked)
                                    }
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeFormDialog}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="plum"
                                loading={form.processing}
                            >
                                {editingFaq ? 'Save FAQ Changes' : 'Create FAQ'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                isOpen={Boolean(deletingFaq)}
                onOpenChange={(open) => !open && setDeletingFaq(null)}
                title="Delete FAQ Item?"
                description={`Are you sure you want to delete "${deletingFaq?.question}"? This cannot be undone.`}
                confirmLabel={isDeleting ? 'Deleting...' : 'Delete FAQ'}
                cancelLabel="Cancel"
                variant="destructive"
                loading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeletingFaq(null)}
            />
        </AdminLayout>
    );
}
