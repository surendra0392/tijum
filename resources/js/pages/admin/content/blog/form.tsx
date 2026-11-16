import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    ExternalLink,
    FileText,
    Globe,
    Save,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/shared/page-header';
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
import type { BlogArticle, BlogCategory, ContentAuthor } from '@/types/cms';

interface Props {
    article?: BlogArticle | null;
    categories: BlogCategory[];
    authors: ContentAuthor[];
    statuses: Array<{ value: string; label: string }>;
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

export default function AdminBlogArticleForm({
    article,
    categories,
    authors,
    statuses,
}: Props) {
    const isEditing = Boolean(article?.id);

    const initialTags = article?.tags?.map((t) => t.name).join(', ') || '';

    const { data, setData, post, put, transform, processing, errors } = useForm(
        {
            title: article?.title || '',
            slug: article?.slug || '',
            category_id: article?.category_id
                ? String(article.category_id)
                : categories[0]?.id
                  ? String(categories[0].id)
                  : '',
            author_id: article?.author_id
                ? String(article.author_id)
                : authors[0]?.id
                  ? String(authors[0].id)
                  : '',
            excerpt: article?.excerpt || '',
            content: article?.content || '',
            featured_image: article?.featured_image || '',
            tags_input: initialTags,
            tags: [] as string[],
            status: article?.status || 'draft',
            scheduled_for: formatDateTimeLocal(article?.scheduled_for),
            seo_title: article?.seo_title || '',
            seo_description: article?.seo_description || '',
            canonical_override: article?.canonical_override || '',
            og_image: article?.og_image || '',
        },
    );

    const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const tags = data.tags_input
            ? data.tags_input
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
            : [];

        transform((formData) => ({
            ...formData,
            tags,
        }));

        if (isEditing && article) {
            put(`/admin/content/blog/${article.id}`);
        } else {
            post('/admin/content/blog');
        }
    };

    const errorEntries = Object.entries(errors);
    const statusMeta = getStatusBadgeMeta(data.status);

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/admin/dashboard' },
                { title: 'Blog', href: '/admin/content/blog' },
                {
                    title: isEditing
                        ? `Edit: ${article?.title}`
                        : 'Write Article',
                    href: '#',
                },
            ]}
        >
            <Head
                title={
                    isEditing
                        ? `Edit Article: ${article?.title}`
                        : 'Write Article — Admin'
                }
            />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="Content Management"
                    title={
                        isEditing
                            ? `Edit Article: ${article?.title}`
                            : 'Write Blog Article'
                    }
                    description="Author guides and insights on food-inclusive accommodation."
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
                                <Link href="/admin/content/blog">
                                    <ArrowLeft
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Back to Articles</span>
                                </Link>
                            </Button>
                            {isEditing && article && (
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={`/blog/${article.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>View Live Article</span>
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
                        setActiveTab(val as 'content' | 'seo')
                    }
                >
                    <TabsList variant="pill" label="Article Editor Sections">
                        <TabsTrigger value="content">
                            <FileText className="size-3.5" aria-hidden="true" />
                            <span>Article Body &amp; Details</span>
                        </TabsTrigger>
                        <TabsTrigger value="seo">
                            <Globe className="size-3.5" aria-hidden="true" />
                            <span>SEO &amp; Social Preview</span>
                        </TabsTrigger>
                    </TabsList>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <TabsContent value="content">
                            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                                <Card className="lg:col-span-2">
                                    <CardHeader className="border-b border-tijum-surface/70 pb-4 dark:border-border">
                                        <CardTitle className="text-base sm:text-lg">
                                            Editorial Content
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Write your headline, URL slug,
                                            listing excerpt, and structured HTML
                                            body.
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="space-y-5">
                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="article-title"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Article Headline *
                                            </Label>
                                            <Input
                                                id="article-title"
                                                type="text"
                                                value={data.title}
                                                onChange={(e) =>
                                                    setData(
                                                        'title',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g. 5 Budgeting Mistakes Students Make When Choosing PGs"
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

                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="article-slug"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                URL Slug
                                            </Label>
                                            <Input
                                                id="article-slug"
                                                type="text"
                                                value={data.slug}
                                                onChange={(e) =>
                                                    setData(
                                                        'slug',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g. 5-budgeting-mistakes-students-make"
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
                                                htmlFor="article-excerpt"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Short Excerpt (Search and
                                                Listing)
                                            </Label>
                                            <Textarea
                                                id="article-excerpt"
                                                value={data.excerpt}
                                                onChange={(e) =>
                                                    setData(
                                                        'excerpt',
                                                        e.target.value,
                                                    )
                                                }
                                                rows={2}
                                                placeholder="A concise 2-sentence summary that hooks the reader..."
                                                aria-invalid={Boolean(
                                                    errors.excerpt,
                                                )}
                                            />
                                            <InputError
                                                message={errors.excerpt}
                                                className="text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="article-content"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Main Article Body (HTML / Clean
                                                Text) *
                                            </Label>
                                            <Textarea
                                                id="article-content"
                                                value={data.content}
                                                onChange={(e) =>
                                                    setData(
                                                        'content',
                                                        e.target.value,
                                                    )
                                                }
                                                rows={14}
                                                className="font-mono text-sm"
                                                placeholder="<p>Write your article content using clean HTML tags (p, h3, ul, li, blockquote)...</p>"
                                                aria-invalid={Boolean(
                                                    errors.content,
                                                )}
                                                required
                                            />
                                            <InputError
                                                message={errors.content}
                                                className="text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="article-tags"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Tags (Comma-separated)
                                            </Label>
                                            <Input
                                                id="article-tags"
                                                type="text"
                                                value={data.tags_input}
                                                onChange={(e) =>
                                                    setData(
                                                        'tags_input',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Hyderabad, Meals Included, Budget Tips"
                                                className="h-10.5"
                                            />
                                            <InputError
                                                message={errors.tags}
                                                className="text-xs"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="lg:col-span-1">
                                    <CardHeader className="border-b border-tijum-surface/70 pb-4 dark:border-border">
                                        <CardTitle className="text-base">
                                            Taxonomy &amp; Publishing
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Assign topic, contributor byline,
                                            cover artwork, and schedule.
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="article-category"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Category *
                                            </Label>
                                            <Select
                                                value={
                                                    data.category_id
                                                        ? String(
                                                              data.category_id,
                                                          )
                                                        : 'none'
                                                }
                                                onValueChange={(val) =>
                                                    setData(
                                                        'category_id',
                                                        val === 'none'
                                                            ? ''
                                                            : val,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="article-category"
                                                    size="sm"
                                                    className="w-full"
                                                >
                                                    <SelectValue placeholder="Select Category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        Select Category
                                                    </SelectItem>
                                                    {categories.map((c) => (
                                                        <SelectItem
                                                            key={c.id}
                                                            value={String(c.id)}
                                                        >
                                                            {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.category_id}
                                                className="text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="article-author"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Author
                                            </Label>
                                            <Select
                                                value={
                                                    data.author_id
                                                        ? String(data.author_id)
                                                        : 'none'
                                                }
                                                onValueChange={(val) =>
                                                    setData(
                                                        'author_id',
                                                        val === 'none'
                                                            ? ''
                                                            : val,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="article-author"
                                                    size="sm"
                                                    className="w-full"
                                                >
                                                    <SelectValue placeholder="Select Author" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        Select Author
                                                    </SelectItem>
                                                    {authors.map((a) => (
                                                        <SelectItem
                                                            key={a.id}
                                                            value={String(a.id)}
                                                        >
                                                            {a.name} (
                                                            {a.designation ||
                                                                'Author'}
                                                            )
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.author_id}
                                                className="text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="article-featured-image"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Featured Image URL
                                            </Label>
                                            <Input
                                                id="article-featured-image"
                                                type="text"
                                                value={data.featured_image}
                                                onChange={(e) =>
                                                    setData(
                                                        'featured_image',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="/images/public/food-dining.jpg"
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

                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="article-status"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Status
                                            </Label>
                                            <Select
                                                value={data.status}
                                                onValueChange={(val) =>
                                                    setData(
                                                        'status',
                                                        val as BlogArticle['status'],
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="article-status"
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
                                                    htmlFor="article-scheduled-for"
                                                    className="text-tijum-plum dark:text-foreground"
                                                >
                                                    Scheduled Date
                                                </Label>
                                                <Input
                                                    id="article-scheduled-for"
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
                                                      ? 'Save Article'
                                                      : 'Publish Article'}
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
                                        Article SEO &amp; Schema Metadata
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Customize search snippets, canonical
                                        overrides, and Open Graph imagery.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="article-seo-title"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            SEO Title Tag
                                        </Label>
                                        <Input
                                            id="article-seo-title"
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
                                                    ? `${data.title} | TIJUM Blog`
                                                    : 'Article SEO Title'
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
                                            htmlFor="article-seo-description"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Meta Description
                                        </Label>
                                        <Textarea
                                            id="article-seo-description"
                                            value={data.seo_description}
                                            onChange={(e) =>
                                                setData(
                                                    'seo_description',
                                                    e.target.value,
                                                )
                                            }
                                            rows={3}
                                            placeholder="Search engine summary..."
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
                                                htmlFor="article-canonical"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Canonical URL Override
                                            </Label>
                                            <Input
                                                id="article-canonical"
                                                type="text"
                                                value={data.canonical_override}
                                                onChange={(e) =>
                                                    setData(
                                                        'canonical_override',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Leave empty for default canonical"
                                                className="h-10.5 font-mono text-xs"
                                            />
                                            <InputError
                                                message={
                                                    errors.canonical_override
                                                }
                                                className="text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="article-og-image"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Social Sharing Image
                                            </Label>
                                            <Input
                                                id="article-og-image"
                                                type="text"
                                                value={data.og_image}
                                                onChange={(e) =>
                                                    setData(
                                                        'og_image',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="/images/public/food-dining.jpg"
                                                className="h-10.5 font-mono text-xs"
                                            />
                                            <InputError
                                                message={errors.og_image}
                                                className="text-xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Search Result Preview */}
                                    <div className="space-y-1 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                                        <span className="font-heading text-xs font-bold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                            Search Result Preview
                                        </span>
                                        <div className="truncate text-base font-medium text-blue-700 hover:underline dark:text-blue-400">
                                            {data.seo_title ||
                                                data.title ||
                                                'Article Title'}{' '}
                                            | TIJUM Blog
                                        </div>
                                        <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                                            https://tijum.com/blog/
                                            {data.slug || 'article-slug'}
                                        </div>
                                        <div className="line-clamp-2 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            {data.seo_description ||
                                                data.excerpt ||
                                                'Article summary text appearing in search engine snippet.'}
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
                    </form>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
