import { Link } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { TIJUM_BRAND_ASSETS } from '@/components/brand/brand-logo';
import { PWAInstallButton } from '@/components/pwa/PWAInstallPrompt';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { becomeAPartner } from '@/routes/public';

export function MobileAppFloating() {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Floating Right-Edge Actions Dock (hidden on mobile view to avoid obstructing content) */}
            <div className="pointer-events-none fixed top-1/2 right-0 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 md:flex">
                {/* 1. Floating App Pill Trigger */}
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Download TIJUM Mobile App"
                    style={{ cursor: 'pointer' }}
                    className="group pointer-events-auto flex cursor-pointer items-center gap-2 rounded-l-full border border-r-0 border-tijum-surface bg-tijum-cream/95 py-1.5 pr-2.5 pl-3.5 shadow-md backdrop-blur-sm transition-all duration-300 hover:border-tijum-coral/50 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <span className="font-heading text-xs font-bold tracking-wider text-tijum-plum transition-colors duration-300 group-hover:text-[#ff7a67]">
                        APP
                    </span>
                    <span
                        className="h-5 w-px bg-tijum-surface/80"
                        aria-hidden="true"
                    />
                    {/* Realistic modern smartphone frame with centered TIJUM app logo */}
                    <span className="relative flex h-9 w-6 shrink-0 items-center justify-center">
                        <svg
                            viewBox="0 0 24 38"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="size-full text-tijum-plum/85 transition-colors duration-300 group-hover:text-[#ff7a67]"
                            aria-hidden="true"
                        >
                            {/* Smartphone Chassis */}
                            <rect
                                x="1.5"
                                y="1.5"
                                width="21"
                                height="35"
                                rx="5"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            />
                            {/* Top Speaker Grill / Camera Earpiece */}
                            <line
                                x1="9"
                                y1="4.5"
                                x2="15"
                                y2="4.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                            {/* Bottom Home Indicator Bar */}
                            <line
                                x1="8.5"
                                y1="33"
                                x2="15.5"
                                y2="33"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                        <img
                            src={TIJUM_BRAND_ASSETS.symbolPng}
                            alt="TIJUM Icon"
                            width={14}
                            height={14}
                            className="pointer-events-none absolute z-10 size-3.5 object-contain"
                        />
                    </span>
                </button>

                {/* 2. Floating Vertical Edge Tab: LIST YOUR PROPERTY (Inverts colors on hover, stays pinned to right edge without movement) */}
                <Link
                    href={becomeAPartner()}
                    aria-label="List your property on TIJUM"
                    style={{ cursor: 'pointer' }}
                    className="group pointer-events-auto flex cursor-pointer flex-col items-center justify-center rounded-l-2xl border border-r-0 border-tijum-coral/35 bg-tijum-plum px-2.5 py-4 shadow-md transition-all duration-300 hover:border-[#ff7a67] hover:bg-[#ff7a67] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <Building2
                        className="size-3.5 text-[#ff7a67] transition-all duration-300 group-hover:scale-110 group-hover:text-[#442f41]"
                        aria-hidden="true"
                    />
                    <span
                        className="mt-2.5 font-heading text-[10px] font-bold tracking-[0.16em] text-tijum-cream uppercase transition-colors duration-300 group-hover:text-[#442f41]"
                        style={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                        }}
                    >
                        LIST YOUR PROPERTY
                    </span>
                </Link>
            </div>

            {/* Mobile App Coming Soon Modal (Image 2) */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-[calc(100%-2rem)] rounded-[28px] border border-tijum-surface bg-tijum-cream p-7 text-center shadow-2xl sm:max-w-md sm:p-9">
                    <DialogHeader className="items-center text-center">
                        {/* Large Smartphone Outline with TIJUM symbol */}
                        <div
                            className="relative mx-auto flex h-20 w-13 items-center justify-center"
                            aria-hidden="true"
                        >
                            <svg
                                viewBox="0 0 44 70"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="size-full text-tijum-plum/85"
                            >
                                <rect
                                    x="2"
                                    y="2"
                                    width="40"
                                    height="66"
                                    rx="9"
                                    stroke="currentColor"
                                    strokeWidth="2.8"
                                />
                                <line
                                    x1="17"
                                    y1="8"
                                    x2="27"
                                    y2="8"
                                    stroke="currentColor"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                />
                                <line
                                    x1="16"
                                    y1="61"
                                    x2="28"
                                    y2="61"
                                    stroke="currentColor"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <img
                                src={TIJUM_BRAND_ASSETS.symbolPng}
                                alt="TIJUM Symbol"
                                width={32}
                                height={32}
                                className="pointer-events-none absolute z-10 size-7.5 object-contain"
                            />
                        </div>

                        <DialogTitle className="mt-4 font-heading text-2xl font-bold tracking-tight text-tijum-plum sm:text-[26px]">
                            Mobile App Coming Soon
                        </DialogTitle>

                        <p
                            className="mt-1 text-xs font-bold tracking-widest text-[#ff7a67] uppercase"
                            style={{ color: '#ff7a67' }}
                        >
                            iOS & Android
                        </p>

                        <DialogDescription className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-tijum-lavender sm:text-sm">
                            Our mobile application is currently in development.
                            Get ready to experience seamless room booking, daily
                            & monthly flexible stays, and verified
                            food-inclusive hostels and co-living right from your
                            pocket.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-6 space-y-2.5">
                        <PWAInstallButton
                            className="h-11 w-full rounded-full"
                            label="Install Web App now"
                            onActionComplete={() => setOpen(false)}
                        />
                        <Button
                            type="button"
                            onClick={() => setOpen(false)}
                            style={{ cursor: 'pointer' }}
                            className="h-12 w-full cursor-pointer rounded-full bg-tijum-plum font-heading text-xs font-bold tracking-widest text-tijum-cream transition-all duration-300 hover:bg-tijum-plum/90 hover:shadow-md"
                        >
                            UNDERSTOOD
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
