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
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className={cn('size-4', className)}
            aria-hidden="true"
            {...props}
        >
            <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
            <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
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

    // Default 'footer' variant: styled for dark plum background
    return (
        <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
            {SOCIAL_LINKS.map((item) => (
                <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.ariaLabel}
                    title={`${item.name} (${item.display}) - ${item.description}`}
                    className="group inline-flex items-center gap-2 rounded-full border border-tijum-cream/20 bg-tijum-cream/10 px-3.5 py-1.5 text-xs text-tijum-cream transition-all duration-200 hover:border-tijum-peach hover:bg-tijum-cream/20 hover:text-tijum-peach focus-visible:ring-2 focus-visible:ring-tijum-peach focus-visible:outline-none"
                >
                    <SocialIcon
                        name={item.name}
                        className="size-3.5 transition-transform duration-200 group-hover:scale-110"
                    />
                    <span className="font-heading font-medium tracking-wide">
                        {item.name === 'WhatsApp'
                            ? item.display
                            : `${item.name} ${item.display}`}
                    </span>
                </a>
            ))}
        </div>
    );
}
