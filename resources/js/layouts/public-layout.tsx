import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    Compass,
    Heart,
    HelpCircle,
    LogIn,
    Menu,
    Phone,
    Search,
    UserRound,
    Utensils,
} from 'lucide-react';
import type { ComponentProps, MouseEvent, PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import BrandLogo from '@/components/brand/brand-logo';
import { PWAInstallButton } from '@/components/pwa/PWAInstallPrompt';
import { BackToTop } from '@/components/public/back-to-top';
import { MobileAppFloating } from '@/components/public/mobile-app-floating';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import {
    clearWishlistLocal,
    getWishlistIds,
    subscribeToWishlist,
    syncWishlistIds,
} from '@/lib/wishlist';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { dashboard, home, login, register, reviewPolicy } from '@/routes';
import { index as wishlistIndex } from '@/routes/customer/wishlist';
import { login as ownerLogin, register as ownerRegister } from '@/routes/owner';
import {
    about,
    becomeAPartner,
    contact,
    faqs,
    grievanceRedressal,
    howItWorks,
    privacy,
    search,
    terms,
} from '@/routes/public';
import { SocialLinks } from '@/components/public/social-links';
import { index as blogIndex } from '@/routes/public/blog';
import { show as cityShow } from '@/routes/public/cities';

const destinations = [
    { name: 'Hyderabad', slug: 'hyderabad' },
    { name: 'Guntur', slug: 'guntur' },
    { name: 'Vijayawada', slug: 'vijayawada' },
    { name: 'Visakhapatnam', slug: 'visakhapatnam' },
];

export default function PublicLayout({ children }: PropsWithChildren) {
    const page = usePage();
    const customer = page.props.auth?.user;
    const serverWishlistIds = page.props.wishlistIds;
    const currentPath = page.url.split('?')[0].split('#')[0] || '/';
    const [mobileOpen, setMobileOpen] = useState(false);
    const [wishlistCount, setWishlistCount] = useState(() =>
        customer && Array.isArray(serverWishlistIds)
            ? serverWishlistIds.length
            : 0,
    );

    useEffect(() => {
        if (!customer) {
            clearWishlistLocal();
            setWishlistCount(0);
            return;
        }

        if (Array.isArray(serverWishlistIds)) {
            syncWishlistIds(serverWishlistIds);
            setWishlistCount(serverWishlistIds.length);
        } else {
            setWishlistCount(getWishlistIds().length);
        }

        const unsubWishlist = subscribeToWishlist(() => {
            setWishlistCount(getWishlistIds().length);
        });
        const handleStorage = (event: StorageEvent) => {
            if (event.key === 'tijum_wishlist_ids') {
                setWishlistCount(getWishlistIds().length);
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => {
            unsubWishlist();
            window.removeEventListener('storage', handleStorage);
        };
    }, [customer, serverWishlistIds]);

    const isActive = (targetPath: string) => {
        if (targetPath === '/') {
            return currentPath === '/';
        }

        return (
            currentPath === targetPath ||
            currentPath.startsWith(`${targetPath}/`)
        );
    };

    const handleHomeAnchor = (id: string) => (event: MouseEvent<Element>) => {
        setMobileOpen(false);

        if (currentPath !== '/') {
            return;
        }

        const target = document.getElementById(id);
        if (!target) {
            return;
        }

        event.preventDefault();
        target.scrollIntoView({ block: 'start' });
        window.history.replaceState(null, '', `#${id}`);
    };

    const navLinkClass = (active: boolean) =>
        cn(
            'relative inline-flex h-11 items-center rounded-lg px-3 font-heading text-sm font-medium text-tijum-plum transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none',
            active
                ? 'bg-tijum-peach/25 font-semibold'
                : 'hover:bg-tijum-peach/15',
        );

    const mobileLinkClass =
        'flex min-h-12 items-center gap-3 border-b border-tijum-cream/12 py-3 font-heading text-base font-semibold text-tijum-cream transition-colors duration-300 hover:text-tijum-peach focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tijum-peach';

    return (
        <div className="tijum-public flex min-h-dvh flex-col">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-tijum-plum focus:px-4 focus:py-2 focus:font-heading focus:text-sm focus:font-semibold focus:text-tijum-cream"
            >
                Skip to main content
            </a>

            <header className="sticky top-0 z-40 border-b border-tijum-surface/80 bg-tijum-cream/95 backdrop-blur-xl">
                <ResponsiveContainer width="wide">
                    <div className="flex h-[72px] items-center justify-between gap-4">
                        <Link
                            href={home()}
                            aria-label="TIJUM home"
                            className="shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                        >
                            <BrandLogo
                                variant="horizontal"
                                tone="light"
                                size="sm"
                            />
                        </Link>

                        <nav
                            aria-label="Primary public navigation"
                            className="hidden items-center gap-1 xl:flex"
                        >
                            <Link
                                href={search()}
                                aria-current={
                                    isActive('/search') || isActive('/explore')
                                        ? 'page'
                                        : undefined
                                }
                                className={navLinkClass(
                                    isActive('/search') || isActive('/explore'),
                                )}
                            >
                                Explore stays
                            </Link>
                            <Link
                                href={`${home.url()}#launch-cities`}
                                onClick={handleHomeAnchor('launch-cities')}
                                className={navLinkClass(false)}
                            >
                                Cities
                            </Link>
                            <Link
                                href={howItWorks()}
                                aria-current={
                                    isActive('/how-it-works')
                                        ? 'page'
                                        : undefined
                                }
                                className={navLinkClass(
                                    isActive('/how-it-works'),
                                )}
                            >
                                How it works
                            </Link>
                            <Link
                                href={`${home.url()}#food-and-stays`}
                                onClick={handleHomeAnchor('food-and-stays')}
                                className={navLinkClass(false)}
                            >
                                Food &amp; stays
                            </Link>
                            <Link
                                href={about()}
                                aria-current={
                                    isActive('/about') ? 'page' : undefined
                                }
                                className={navLinkClass(isActive('/about'))}
                            >
                                About
                            </Link>
                            <Link
                                href={contact()}
                                aria-current={
                                    isActive('/contact') ? 'page' : undefined
                                }
                                className={navLinkClass(isActive('/contact'))}
                            >
                                Contact
                            </Link>
                            <Link
                                href={becomeAPartner()}
                                aria-current={
                                    isActive('/become-a-partner')
                                        ? 'page'
                                        : undefined
                                }
                                className={navLinkClass(
                                    isActive('/become-a-partner'),
                                )}
                            >
                                List your property
                            </Link>
                        </nav>

                        <div className="hidden shrink-0 items-center gap-2 xl:flex">
                            {customer ? (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="relative gap-1.5"
                                        asChild
                                    >
                                        <Link
                                            href={wishlistIndex()}
                                            aria-label={
                                                wishlistCount > 0
                                                    ? `Saved stays (${wishlistCount})`
                                                    : 'Saved stays'
                                            }
                                            title="Saved stays"
                                        >
                                            <Heart
                                                className={cn(
                                                    'size-4',
                                                    wishlistCount > 0 &&
                                                        'fill-tijum-coral text-tijum-coral',
                                                )}
                                                aria-hidden="true"
                                            />
                                            <span>Saved</span>
                                            {wishlistCount > 0 && (
                                                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-tijum-coral px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">
                                                    {wishlistCount}
                                                </span>
                                            )}
                                        </Link>
                                    </Button>
                                    <Button variant="plum" size="sm" asChild>
                                        <Link href={dashboard()}>
                                            <UserRound aria-hidden="true" />
                                            My account
                                        </Link>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={login()}>Log in</Link>
                                    </Button>
                                    <Button size="sm" asChild>
                                        <Link href={register()}>
                                            Create account
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2 xl:hidden">
                            {customer ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="relative"
                                    asChild
                                >
                                    <Link
                                        href={wishlistIndex()}
                                        aria-label={
                                            wishlistCount > 0
                                                ? `Saved stays (${wishlistCount})`
                                                : 'Saved stays'
                                        }
                                    >
                                        <Heart
                                            className={cn(
                                                'size-4.5',
                                                wishlistCount > 0 &&
                                                    'fill-tijum-coral text-tijum-coral',
                                            )}
                                            aria-hidden="true"
                                        />
                                        {wishlistCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-tijum-coral text-[9px] font-bold text-white">
                                                {wishlistCount}
                                            </span>
                                        )}
                                    </Link>
                                </Button>
                            ) : (
                                <Button size="sm" asChild>
                                    <Link href={register()}>Join</Link>
                                </Button>
                            )}
                            <Sheet
                                open={mobileOpen}
                                onOpenChange={setMobileOpen}
                            >
                                <SheetTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Open navigation menu"
                                    >
                                        <Menu aria-hidden="true" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent
                                    side="right"
                                    className="flex w-full max-w-md flex-col overflow-y-auto border-l border-tijum-cream/15 bg-tijum-plum p-6 text-tijum-cream sm:p-8"
                                >
                                    <SheetHeader className="border-b border-tijum-cream/15 pb-6 text-left">
                                        <SheetTitle>
                                            <BrandLogo
                                                variant="horizontal"
                                                tone="dark"
                                            />
                                        </SheetTitle>
                                        <SheetDescription className="max-w-sm text-sm leading-relaxed text-tijum-cream/75">
                                            Comfortable stays with transparent
                                            room pricing and meal information.
                                        </SheetDescription>
                                    </SheetHeader>

                                    <nav
                                        aria-label="Mobile public navigation"
                                        className="mt-4 flex flex-col"
                                    >
                                        <Link
                                            href={search()}
                                            onClick={() => setMobileOpen(false)}
                                            className={mobileLinkClass}
                                        >
                                            <Search aria-hidden="true" />
                                            Explore stays
                                        </Link>
                                        <Link
                                            href={`${home.url()}#launch-cities`}
                                            onClick={handleHomeAnchor(
                                                'launch-cities',
                                            )}
                                            className={mobileLinkClass}
                                        >
                                            <Compass aria-hidden="true" />
                                            Cities
                                        </Link>
                                        <Link
                                            href={howItWorks()}
                                            onClick={() => setMobileOpen(false)}
                                            className={mobileLinkClass}
                                        >
                                            <ArrowRight aria-hidden="true" />
                                            How it works
                                        </Link>
                                        <Link
                                            href={`${home.url()}#food-and-stays`}
                                            onClick={handleHomeAnchor(
                                                'food-and-stays',
                                            )}
                                            className={mobileLinkClass}
                                        >
                                            <Utensils aria-hidden="true" />
                                            Food &amp; stays
                                        </Link>
                                        <Link
                                            href={becomeAPartner()}
                                            onClick={() => setMobileOpen(false)}
                                            className={mobileLinkClass}
                                        >
                                            <Building2 aria-hidden="true" />
                                            List your property
                                        </Link>
                                        {customer && (
                                            <Link
                                                href={wishlistIndex()}
                                                onClick={() =>
                                                    setMobileOpen(false)
                                                }
                                                className={mobileLinkClass}
                                            >
                                                <Heart aria-hidden="true" />
                                                <span>
                                                    Saved stays
                                                    {wishlistCount > 0
                                                        ? ` (${wishlistCount})`
                                                        : ''}
                                                </span>
                                            </Link>
                                        )}
                                        <Link
                                            href={faqs()}
                                            onClick={() => setMobileOpen(false)}
                                            className={mobileLinkClass}
                                        >
                                            <HelpCircle aria-hidden="true" />
                                            Help &amp; FAQs
                                        </Link>
                                        <Link
                                            href={about()}
                                            onClick={() => setMobileOpen(false)}
                                            className={mobileLinkClass}
                                        >
                                            <Compass aria-hidden="true" />
                                            About TIJUM
                                        </Link>
                                        <Link
                                            href={contact()}
                                            onClick={() => setMobileOpen(false)}
                                            className={mobileLinkClass}
                                        >
                                            <Phone aria-hidden="true" />
                                            Contact &amp; Support
                                        </Link>
                                    </nav>

                                    <div className="mt-6 border-t border-tijum-cream/15 pt-5">
                                        <SocialLinks variant="footer" />
                                    </div>

                                    <div className="mt-auto space-y-3 pt-6">
                                        <PWAInstallButton
                                            className="w-full border-tijum-cream/35 bg-tijum-cream/10 text-tijum-cream hover:bg-tijum-cream/20 hover:text-tijum-cream"
                                            onActionComplete={() =>
                                                setMobileOpen(false)
                                            }
                                        />
                                        {customer ? (
                                            <Button className="w-full" asChild>
                                                <Link
                                                    href={dashboard()}
                                                    onClick={() =>
                                                        setMobileOpen(false)
                                                    }
                                                >
                                                    My account
                                                </Link>
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    className="w-full"
                                                    asChild
                                                >
                                                    <Link
                                                        href={register()}
                                                        onClick={() =>
                                                            setMobileOpen(false)
                                                        }
                                                    >
                                                        Create account
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-tijum-cream/45 bg-transparent text-tijum-cream hover:bg-tijum-cream/10 hover:text-tijum-cream"
                                                    asChild
                                                >
                                                    <Link
                                                        href={login()}
                                                        onClick={() =>
                                                            setMobileOpen(false)
                                                        }
                                                    >
                                                        <LogIn aria-hidden="true" />
                                                        Log in
                                                    </Link>
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </ResponsiveContainer>
            </header>

            <main id="main-content" className="min-w-0 flex-1">
                {children}
            </main>

            <footer className="bg-tijum-plum text-tijum-cream">
                <ResponsiveContainer width="wide" className="py-14 lg:py-16">
                    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
                        <div className="space-y-5 sm:col-span-2 lg:col-span-4">
                            <BrandLogo
                                variant="stacked"
                                tone="dark"
                                size="md"
                                showTagline
                                loading="lazy"
                            />
                            <p className="max-w-sm text-sm leading-relaxed text-tijum-cream/75">
                                Discover affordable Hostels/PG, Homestays, and
                                Co-Living with clear room pricing and exact meal
                                information before you book.
                            </p>
                            <div className="pt-1">
                                <SocialLinks variant="footer" />
                            </div>
                        </div>

                        <FooterGroup title="Discover">
                            <FooterLink href={search()}>
                                Explore stays
                            </FooterLink>
                            <FooterLink href={howItWorks()}>
                                How it works
                            </FooterLink>
                            <FooterLink href={about()}>About TIJUM</FooterLink>
                            <FooterLink href={blogIndex()}>
                                Living guides
                            </FooterLink>
                        </FooterGroup>

                        <FooterGroup title="Destinations">
                            {destinations.map((destination) => (
                                <FooterLink
                                    key={destination.slug}
                                    href={cityShow(destination.slug)}
                                >
                                    {destination.name}
                                </FooterLink>
                            ))}
                        </FooterGroup>

                        <FooterGroup title="Support">
                            <FooterLink href={contact()}>Contact us</FooterLink>
                            <FooterLink href={faqs()}>
                                Help &amp; FAQs
                            </FooterLink>
                            <FooterLink href={terms()}>
                                Terms of service
                            </FooterLink>
                            <FooterLink href={privacy()}>
                                Privacy policy
                            </FooterLink>
                            <FooterLink href={reviewPolicy()}>
                                Review policy
                            </FooterLink>
                            <FooterLink href={grievanceRedressal()}>
                                Grievance redressal
                            </FooterLink>
                        </FooterGroup>

                        <FooterGroup title="Property partners">
                            <FooterLink href={becomeAPartner()}>
                                Partner overview
                            </FooterLink>
                            <FooterLink href={ownerRegister()}>
                                Register property
                            </FooterLink>
                            <FooterLink href={ownerLogin()}>
                                Partner login
                            </FooterLink>
                        </FooterGroup>
                    </div>

                    <div className="mt-12 flex flex-col gap-3 border-t border-tijum-cream/15 pt-6 text-xs text-tijum-cream/65 sm:flex-row sm:items-center sm:justify-between">
                        <p>© 2026 TIJUM. All rights reserved.</p>
                        <p>Stay easy. Eat well. Spend less.</p>
                    </div>
                </ResponsiveContainer>
            </footer>

            <BackToTop />
            <MobileAppFloating />
        </div>
    );
}

function FooterGroup({
    title,
    children,
}: PropsWithChildren<{ title: string }>) {
    return (
        <div className="space-y-4 lg:col-span-2">
            <h2 className="font-heading text-sm font-semibold text-tijum-peach">
                {title}
            </h2>
            <ul className="space-y-3 text-sm text-tijum-cream/75">
                {children}
            </ul>
        </div>
    );
}

function FooterLink({
    href,
    children,
}: PropsWithChildren<{ href: ComponentProps<typeof Link>['href'] }>) {
    return (
        <li>
            <Link
                href={href}
                className="rounded-sm transition-colors duration-300 hover:text-tijum-peach focus-visible:ring-2 focus-visible:ring-tijum-peach focus-visible:outline-none"
            >
                {children}
            </Link>
        </li>
    );
}
