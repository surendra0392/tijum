import { Link, usePage, type InertiaLinkProps } from '@inertiajs/react';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface BreadcrumbEntry {
    title?: string;
    label?: string;
    href?: NonNullable<InertiaLinkProps['href']> | string;
    current?: boolean;
}

function getHrefString(
    href?: NonNullable<InertiaLinkProps['href']> | string,
): string | undefined {
    if (!href) return undefined;
    if (typeof href === 'string') return href;
    if (typeof href === 'object' && 'url' in href)
        return (href as { url: string }).url;
    return undefined;
}

export type BreadcrumbsProps = {
    breadcrumbs?: BreadcrumbEntry[];
    items?: BreadcrumbEntry[];
    tone?: 'dark' | 'light';
    showHome?: boolean;
    showSchema?: boolean;
    className?: string;
};

const PRIVATE_PORTAL_PREFIXES = [
    '/admin',
    '/owner',
    '/dashboard',
    '/settings',
    '/reservations',
    '/rewards',
    '/my-support',
    '/support',
    '/notifications',
    '/wishlist',
    '/reviews',
    '/customer',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/two-factor-challenge',
    '/email',
];

const SEGMENT_LABELS: Record<string, string> = {
    owner: 'Partner Overview',
    admin: 'Admin Console',
    dashboard: 'Dashboard',
    system: 'System Management',
    admins: 'Admin Accounts',
    roles: 'Roles & Permissions',
    cities: 'Cities',
    categories: 'Stay Categories',
    properties: 'Properties',
    reservations: 'Reservations',
    settlements: 'Settlements',
    financial: 'Financial Ledger',
    commissions: 'Commissions',
    reviews: 'Reviews',
    cases: 'Protection Cases',
    amenities: 'Amenities',
    partners: 'Partners',
    pricing: 'Pricing',
    onboarding: 'Onboarding',
    operations: 'Marketplace Operations',
    support: 'Support Desk',
    customers: 'Customer Support',
    tickets: 'Support Tickets',
    'check-ins': 'Check-ins',
    'check-outs': 'Check-outs',
    'customer-cases': 'Customer Complaints',
    relocations: 'Alternative Accommodation',
    'relocation-subsidies': 'Relocation Subsidies',
    'financial-reconciliation': 'Financial Reconciliation',
    'partner-commissions': 'Partner Commissions',
    settings: 'Platform Settings',
    notifications: 'Notifications',
    profile: 'Profile',
    security: 'Security & 2FA',
    appearance: 'Appearance',
    rewards: 'Rewards & Wallet',
    campaigns: 'Campaigns',
    points: 'Loyalty Points',
    referrals: 'Referrals',
    coupons: 'Coupons',
    subscribers: 'Subscribers',
    banners: 'Banners',
    emails: 'Emails',
    seo: 'SEO Management',
    redirects: 'Redirects',
    sitemap: 'Sitemap',
    authors: 'Authors',
    pages: 'CMS Pages',
    faqs: 'FAQs',
    templates: 'Templates',
    providers: 'Providers',
    wishlist: 'Wishlist',
    'my-support': 'Support & Grievances',
    create: 'Add New',
    edit: 'Edit',
    media: 'Media',
    'room-types': 'Room Types',
    rooms: 'Inventory',
    verification: 'Verification',
    'business-profile': 'Business Profile',
    documents: 'Documents',
    'operating-cities': 'Operating Cities',
    'application-status': 'Verification Status',
    statement: 'Account Statement',
    explore: 'Explore Stays',
    search: 'Search Stays',
    blog: 'Blog & Guides',
    about: 'About TIJUM',
    'how-it-works': 'How It Works',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    'become-a-partner': 'Become a Partner',
    'grievance-redressal': 'Grievance Redressal',
};

function inferBreadcrumbsFromUrl(rawUrl: string): BreadcrumbEntry[] {
    const cleanUrl = rawUrl.split('?')[0].split('#')[0];
    const segments = cleanUrl.split('/').filter(Boolean);
    if (segments.length === 0) {
        return [];
    }

    const items: BreadcrumbEntry[] = [];

    if (segments[0] === 'owner') {
        items.push({ title: 'Partner Overview', href: '/owner/dashboard' });
        if (segments.length === 1 || segments[1] === 'dashboard') {
            return items;
        }
    } else if (segments[0] === 'admin') {
        items.push({ title: 'Admin Console', href: '/admin/dashboard' });
        if (segments.length === 1 || segments[1] === 'dashboard') {
            return items;
        }
    } else if (segments[0] === 'dashboard') {
        return [{ title: 'Dashboard', href: '/dashboard' }];
    } else if (
        [
            'reservations',
            'my-support',
            'wishlist',
            'customer',
            'rewards',
            'notifications',
            'settings',
        ].includes(segments[0])
    ) {
        items.push({ title: 'Dashboard', href: '/dashboard' });
    }

    const startIdx = segments[0] === 'owner' || segments[0] === 'admin' ? 1 : 0;
    let accumulatedPath =
        segments[0] === 'owner' || segments[0] === 'admin'
            ? `/${segments[0]}`
            : '';

    for (let i = startIdx; i < segments.length; i++) {
        const seg = segments[i];
        accumulatedPath += `/${seg}`;
        const title =
            SEGMENT_LABELS[seg] ||
            seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
        items.push({
            title,
            href: accumulatedPath,
        });
    }

    return items;
}

export function Breadcrumbs({
    breadcrumbs,
    items,
    tone = 'dark',
    showHome,
    showSchema = true,
    className,
}: BreadcrumbsProps) {
    const page = usePage();
    const isLight = tone === 'light';

    const normalizedItems = useMemo(() => {
        const rawList = items ?? breadcrumbs;
        if (rawList && rawList.length > 0) {
            return rawList.map((item) => ({
                title: item.title ?? item.label ?? '',
                href: item.href,
                current: item.current,
            }));
        }

        // Infer sensible breadcrumbs from current page URL
        return inferBreadcrumbsFromUrl(page.url);
    }, [items, breadcrumbs, page.url]);

    if (normalizedItems.length === 0) {
        return null;
    }

    const cleanPath = page.url.split('?')[0].split('#')[0];
    const isPrivateRoute = PRIVATE_PORTAL_PREFIXES.some(
        (prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`),
    );
    const hasServerSeoSchema = Boolean(
        (page.props as { seo?: { structuredData?: unknown } }).seo?.structuredData,
    );
    const shouldRenderSchema = showSchema !== false && !isPrivateRoute && !hasServerSeoSchema;
    const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://tijum.com';

    // Build Schema.org BreadcrumbList JSON-LD only when public & not already emitted server-side
    const schemaData = shouldRenderSchema
        ? {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: normalizedItems.map((item, index) => {
                  const hrefStr = getHrefString(item.href);
                  return {
                      '@type': 'ListItem',
                      position: index + 1,
                      name: item.title,
                      item: hrefStr
                          ? hrefStr.startsWith('http')
                              ? hrefStr
                              : `${origin}${hrefStr}`
                          : undefined,
                  };
              }),
          }
        : null;

    return (
        <nav
            aria-label="Breadcrumb"
            className={cn('flex items-center text-xs sm:text-sm', className)}
        >
            {schemaData && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(schemaData).replaceAll('<', '\\u003c'),
                    }}
                />
            )}
            <ol className="flex flex-wrap items-center gap-1.5 leading-none">
                {showHome && normalizedItems[0]?.title !== 'Home' && (
                    <li className="flex items-center gap-1.5">
                        <Link
                            href="/"
                            className={cn(
                                'flex items-center gap-1 font-medium underline-offset-2 transition-colors hover:underline',
                                isLight
                                    ? 'text-tijum-cream/75 hover:text-tijum-cream'
                                    : 'text-tijum-lavender hover:text-tijum-plum',
                            )}
                        >
                            <Home className="size-3.5" aria-hidden="true" />
                            <span>Home</span>
                        </Link>
                        <ChevronRight
                            className={cn(
                                'size-3.5 shrink-0 select-none',
                                isLight
                                    ? 'text-tijum-cream/40'
                                    : 'text-tijum-lavender/60',
                            )}
                            aria-hidden="true"
                        />
                    </li>
                )}

                {normalizedItems.map((item, index) => {
                    const isLast =
                        index === normalizedItems.length - 1 || item.current;

                    return (
                        <Fragment key={`${item.title}-${index}`}>
                            {index > 0 && (
                                <ChevronRight
                                    className={cn(
                                        'size-3.5 shrink-0 select-none',
                                        isLight
                                            ? 'text-tijum-cream/40'
                                            : 'text-tijum-lavender/60',
                                    )}
                                    aria-hidden="true"
                                />
                            )}
                            <li className="flex items-center gap-1.5">
                                {isLast || !item.href ? (
                                    <span
                                        aria-current="page"
                                        className={cn(
                                            'max-w-[200px] truncate font-heading font-semibold tracking-tight sm:max-w-xs',
                                            isLight
                                                ? 'text-tijum-peach'
                                                : 'text-tijum-plum',
                                        )}
                                        title={item.title}
                                    >
                                        {item.title}
                                    </span>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            'font-medium underline-offset-2 transition-colors hover:underline',
                                            isLight
                                                ? 'text-tijum-cream/75 hover:text-tijum-cream'
                                                : 'text-tijum-lavender hover:text-tijum-plum',
                                        )}
                                    >
                                        {item.title}
                                    </Link>
                                )}
                            </li>
                        </Fragment>
                    );
                })}
            </ol>
        </nav>
    );
}

export default Breadcrumbs;
