import { Facebook, Instagram } from 'lucide-react';
import type { ComponentProps } from 'react';
import { SOCIAL_LINKS, type SocialLinkItem } from '@/data/public-content';
import { cn } from '@/lib/utils';

export function WhatsAppIcon({ className, ...props }: ComponentProps<'svg'>) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="currentColor"
            className={cn('size-4', className)}
            aria-hidden="true"
            {...props}
        >
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.44 0-2.85-.38-4.09-1.11l-.29-.17-3.04.8 1.05-2.96-.19-.3a8.19 8.19 0 0 1-1.26-4.5c0-4.54 3.7-8.24 8.24-8.24m4.52 11.23c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.78.98-.15.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.31-.23.25-.87.85-.87 2.08 0 1.23.89 2.41 1.02 2.58.12.17 1.76 2.68 4.26 3.76.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.07-.1-.23-.17-.48-.29" />
        </svg>
    );
}

export function SocialIcon({
    name,
    className,
}: {
    name: SocialLinkItem['name'];
    className?: string;
}) {
    switch (name) {
        case 'WhatsApp':
            return <WhatsAppIcon className={className} />;
        case 'Instagram':
            return (
                <Instagram
                    className={cn('size-4', className)}
                    aria-hidden="true"
                />
            );
        case 'Facebook':
            return (
                <Facebook
                    className={cn('size-4', className)}
                    aria-hidden="true"
                />
            );
    }
}

type SocialLinksProps = {
    variant?: 'footer' | 'card' | 'inline';
    className?: string;
    showDescription?: boolean;
};

export function SocialLinks({
    variant = 'footer',
    className,
    showDescription = false,
}: SocialLinksProps) {
    if (variant === 'card') {
        return (
            <div className={cn('grid gap-4 sm:grid-cols-3', className)}>
                {SOCIAL_LINKS.map((item) => (
                    <a
                        key={item.name}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={item.ariaLabel}
                        className="group flex flex-col justify-between rounded-2xl border border-tijum-surface bg-white p-5 shadow-tijum-card transition-all duration-300 hover:-translate-y-0.5 hover:border-tijum-coral/50 hover:shadow-tijum-soft focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                    >
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="flex size-10 items-center justify-center rounded-xl bg-tijum-cream text-tijum-plum transition-colors group-hover:bg-tijum-coral group-hover:text-white">
                                    <SocialIcon
                                        name={item.name}
                                        className="size-5"
                                    />
                                </span>
                                <span className="rounded-full bg-tijum-cream/60 px-2.5 py-0.5 font-heading text-[11px] font-semibold text-tijum-plum-muted group-hover:text-tijum-plum">
                                    {item.name}
                                </span>
                            </div>
                            <h3 className="font-heading text-base font-bold text-tijum-plum">
                                {item.display}
                            </h3>
                            {showDescription && (
                                <p className="text-xs leading-relaxed text-tijum-plum-muted">
                                    {item.description}
                                </p>
                            )}
                        </div>
                        <span className="mt-4 inline-flex items-center text-xs font-semibold text-tijum-coral transition-colors group-hover:text-tijum-plum">
                            {item.name === 'WhatsApp'
                                ? 'Open WhatsApp Chat →'
                                : `Follow on ${item.name} →`}
                        </span>
                    </a>
                ))}
            </div>
        );
    }

    if (variant === 'inline') {
        return (
            <div className={cn('flex flex-wrap items-center gap-2', className)}>
                {SOCIAL_LINKS.map((item) => (
                    <a
                        key={item.name}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={item.ariaLabel}
                        title={`${item.name}: ${item.display}`}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-tijum-surface bg-white px-3 text-xs font-medium text-tijum-plum transition-all duration-200 hover:border-tijum-coral hover:bg-tijum-cream hover:text-tijum-coral focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                    >
                        <SocialIcon name={item.name} className="size-4" />
                        <span className="font-heading">{item.display}</span>
                    </a>
                ))}
            </div>
        );
    }

    // Default 'footer' variant: elegant icon-only buttons for footer/dark backgrounds
    return (
        <div className={cn('flex items-center gap-2.5', className)}>
            {SOCIAL_LINKS.map((item) => (
                <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.ariaLabel}
                    title={`${item.name} (${item.display})`}
                    className="flex size-9 items-center justify-center rounded-full border border-tijum-cream/20 bg-tijum-cream/10 text-tijum-cream transition-all duration-200 hover:border-tijum-coral hover:bg-tijum-coral hover:text-white focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <SocialIcon
                        name={item.name}
                        className="size-4.5 transition-transform duration-200 hover:scale-110"
                    />
                </a>
            ))}
        </div>
    );
}
