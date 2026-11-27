import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowRightLeft,
    CheckCircle,
    ExternalLink,
    FileText,
    Globe,
    Save,
    Server,
} from 'lucide-react';
import InputError from '@/components/input-error';
import { StatCard } from '@/components/shared/info-card';
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
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/layouts/admin-layout';
import type { SeoSetting } from '@/types/cms';

interface Props {
    settings: SeoSetting;
    stats: {
        total_indexed_properties: number;
        total_published_articles: number;
        total_published_pages: number;
        total_active_redirects: number;
        total_redirect_hits: number;
        sitemap_url: string;
        robots_url: string;
    };
}

export default function AdminSeoIndex({ settings, stats }: Props) {
    const form = useForm({
        site_name: settings.site_name || 'TIJUM',
        title_template:
            settings.title_template ||
            '%s | TIJUM — Food-Inclusive Hostels & PGs',
        default_meta_description: settings.default_meta_description || '',
        default_og_image: settings.default_og_image || '',
        default_robots: settings.default_robots || 'index, follow',
        google_site_verification: settings.google_site_verification || '',
        bing_site_verification: settings.bing_site_verification || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/seo/settings');
    };

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'SEO Management', href: '/admin/seo' },
            ]}
        >
            <Head title="SEO Infrastructure & Settings — TIJUM Operations" />

            <div className="space-y-6 pb-10">
                <PageHeader
                    eyebrow="Technical SEO & Indexing"
                    title="Search Engine Optimization (SEO)"
                    description="Technical SEO health, organic indexing configuration, meta tag standards, and webmaster verifications."
                />

                {/* Health & Metrics Cards */}
                <section
                    aria-label="SEO infrastructure metrics"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Indexed Properties"
                        value={stats.total_indexed_properties.toLocaleString()}
                        helperText="Live & booking eligible"
                        icon={CheckCircle}
                    />
                    <StatCard
                        label="Published Articles"
                        value={stats.total_published_articles.toLocaleString()}
                        helperText="In marketplace blog"
                        icon={FileText}
                    />
                    <StatCard
                        label="CMS Landing Pages"
                        value={stats.total_published_pages.toLocaleString()}
                        helperText="Standard & city pages"
                        icon={Globe}
                    />
                    <StatCard
                        label="Active Redirects"
                        value={stats.total_active_redirects.toLocaleString()}
                        helperText={`${stats.total_redirect_hits.toLocaleString()} historical hits`}
                        icon={ArrowRightLeft}
                    />
                </section>

                {/* Quick Links to Feeds */}
                <Card className="py-4">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button asChild variant="outline" size="sm">
                                <a
                                    href={stats.sitemap_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Globe
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>View Dynamic Sitemap XML</span>
                                    <ExternalLink
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </a>
                            </Button>

                            <Button asChild variant="outline" size="sm">
                                <a
                                    href={stats.robots_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Server
                                        className="size-4 text-tijum-plum-muted dark:text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <span>View robots.txt Directives</span>
                                    <ExternalLink
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </a>
                            </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/seo/sitemap">
                                    <FileText
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Inspect Sitemap URLs</span>
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/seo/redirects">
                                    <ArrowRightLeft
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Manage 301/302 Redirects</span>
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Global SEO Settings Form */}
                <Card>
                    <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                        <CardTitle className="text-base sm:text-lg">
                            Global Search Settings
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Standard fallback metadata rendered in initial
                            server HTML for search crawlers and social previews.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="site_name">
                                        Marketplace Brand Name
                                    </Label>
                                    <Input
                                        id="site_name"
                                        value={form.data.site_name}
                                        onChange={(e) =>
                                            form.setData(
                                                'site_name',
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <InputError
                                        message={form.errors.site_name}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="title_template">
                                        Title Template (%s placeholder)
                                    </Label>
                                    <Input
                                        id="title_template"
                                        value={form.data.title_template}
                                        onChange={(e) =>
                                            form.setData(
                                                'title_template',
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        Used when rendering page-specific titles
                                    </p>
                                    <InputError
                                        message={form.errors.title_template}
                                        className="text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="default_meta_description">
                                    Default Meta Description
                                </Label>
                                <Textarea
                                    id="default_meta_description"
                                    rows={3}
                                    value={form.data.default_meta_description}
                                    onChange={(e) =>
                                        form.setData(
                                            'default_meta_description',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Describe TIJUM's food-inclusive accommodation marketplace in 150-160 characters..."
                                />
                                <InputError
                                    message={
                                        form.errors.default_meta_description
                                    }
                                    className="text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="default_og_image">
                                        Default Social Share Image (OG URL)
                                    </Label>
                                    <Input
                                        id="default_og_image"
                                        value={form.data.default_og_image}
                                        onChange={(e) =>
                                            form.setData(
                                                'default_og_image',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="https://tijum.com/images/og-cover.jpg"
                                    />
                                    <InputError
                                        message={form.errors.default_og_image}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="default_robots">
                                        Default Robots Directive
                                    </Label>
                                    <Input
                                        id="default_robots"
                                        value={form.data.default_robots}
                                        onChange={(e) =>
                                            form.setData(
                                                'default_robots',
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        Usually &ldquo;index, follow&rdquo; for
                                        public marketplace pages
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-tijum-surface/80 pt-5 dark:border-border">
                                <h3 className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    Webmaster Verification Tokens
                                </h3>
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="google_site_verification">
                                            Google Search Console Verification
                                            Token
                                        </Label>
                                        <Input
                                            id="google_site_verification"
                                            value={
                                                form.data
                                                    .google_site_verification
                                            }
                                            onChange={(e) =>
                                                form.setData(
                                                    'google_site_verification',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="e.g. google-site-verification code"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="bing_site_verification">
                                            Bing Webmaster Tools Verification
                                            Token
                                        </Label>
                                        <Input
                                            id="bing_site_verification"
                                            value={
                                                form.data.bing_site_verification
                                            }
                                            onChange={(e) =>
                                                form.setData(
                                                    'bing_site_verification',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="e.g. bing verification code"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end border-t border-tijum-surface/80 pt-5 dark:border-border">
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
                                    <span>Save SEO Configuration</span>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
