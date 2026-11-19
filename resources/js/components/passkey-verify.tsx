import type { UrlMethodPair } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { usePasskeyVerify } from '@laravel/passkeys/react';
import { KeyRound } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    routes?: {
        options: UrlMethodPair;
        submit: UrlMethodPair;
    };
    label?: string;
    loadingLabel?: string;
    separator?: string;
};

export default function PasskeyVerify({
    routes,
    label,
    loadingLabel,
    separator,
}: Props = {}) {
    const { verify, isLoading, error, isSupported } = usePasskeyVerify({
        ...(routes && {
            routes: {
                options: routes.options.url,
                submit: routes.submit.url,
            },
        }),
        onSuccess: (response) => {
            router.visit(response.redirect ?? '/dashboard');
        },
    });

    if (!isSupported) {
        return null;
    }

    return (
        <div className="mb-5 space-y-4">
            <div className="grid gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-12 w-full rounded-xl border-tijum-surface bg-white text-sm font-semibold text-tijum-plum shadow-2xs hover:border-tijum-plum/35 hover:bg-tijum-cream/55"
                    onClick={verify}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Spinner />
                    ) : (
                        <KeyRound
                            className="size-4 text-tijum-coral"
                            aria-hidden="true"
                        />
                    )}
                    <span>
                        {isLoading
                            ? (loadingLabel ?? 'Authenticating...')
                            : (label ?? 'Continue with passkey')}
                    </span>
                </Button>
                {error && <InputError message={error} className="text-center" />}
            </div>

            <div className="relative flex items-center gap-3">
                <span
                    className="h-px flex-1 bg-tijum-surface/85"
                    aria-hidden="true"
                />
                <span className="text-xs font-medium text-tijum-plum-muted">
                    {separator ?? 'or sign in with password'}
                </span>
                <span
                    className="h-px flex-1 bg-tijum-surface/85"
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}
