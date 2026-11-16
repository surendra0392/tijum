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
        <div className="mb-5 space-y-5">
            <div className="grid gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full border-tijum-surface bg-white text-sm font-semibold text-tijum-plum hover:border-tijum-coral/60 hover:bg-tijum-cream/70"
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
                            : (label ?? 'Sign in with a passkey')}
                    </span>
                </Button>
                {error && <InputError message={error} className="text-center" />}
            </div>

            <div className="relative flex items-center gap-3">
                <span
                    className="h-px flex-1 bg-tijum-surface"
                    aria-hidden="true"
                />
                <span className="font-heading text-[11px] font-semibold tracking-[0.14em] text-tijum-plum-muted uppercase">
                    {separator ?? 'Or continue with email'}
                </span>
                <span
                    className="h-px flex-1 bg-tijum-surface"
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}
