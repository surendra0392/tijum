import type { PropsWithChildren } from 'react';
import AuthCardLayout from '@/layouts/auth/auth-card-layout';
import { login as customerLogin } from '@/routes';

type AuthMeta = {
    title?: string;
    description?: string;
    maxWidth?: 'default' | 'comfortable' | 'wide';
};

type OwnerAuthLayoutProps = PropsWithChildren<{
    title?: string;
    description?: string;
    maxWidth?: 'default' | 'comfortable' | 'wide';
}>;

export default function OwnerAuthLayout({
    children,
    title,
    description,
    maxWidth,
}: OwnerAuthLayoutProps) {
    const pageType = (
        children as {
            type?: { authMeta?: AuthMeta; layout?: AuthMeta };
        }
    )?.type;
    const meta: AuthMeta = pageType?.authMeta ?? pageType?.layout ?? {};
    const resolvedTitle = title ?? meta.title ?? '';
    const resolvedDescription = description ?? meta.description ?? '';
    const resolvedMaxWidth = maxWidth ?? meta.maxWidth ?? 'default';

    return (
        <AuthCardLayout
            portalLabel="Partner Portal"
            title={resolvedTitle}
            description={resolvedDescription}
            maxWidth={resolvedMaxWidth}
            switchPrompt="Looking to book a stay?"
            switchLabel="Customer Sign In"
            switchHref={customerLogin.url()}
        >
            {children}
        </AuthCardLayout>
    );
}
