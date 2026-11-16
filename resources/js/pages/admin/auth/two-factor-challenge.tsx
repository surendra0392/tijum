import { Form, Head } from '@inertiajs/react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes/admin';
import { verify } from '@/routes/admin/two-factor/challenge';

type AdminTwoFactorChallengeProps = {
    status?: string;
};

export default function AdminTwoFactorChallenge({
    status,
}: AdminTwoFactorChallengeProps) {
    const [useRecovery, setUseRecovery] = useState(false);

    return (
        <>
            <Head title="Admin Two-Factor Challenge" />

            {status && (
                <Alert variant="info" className="mb-5">
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

            <Form
                {...verify.form()}
                resetOnError
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        {useRecovery ? (
                            <div className="grid gap-2">
                                <Label htmlFor="recovery_code">
                                    Emergency recovery code
                                </Label>
                                <Input
                                    id="recovery_code"
                                    type="text"
                                    name="recovery_code"
                                    required
                                    autoFocus
                                    autoComplete="off"
                                    placeholder="xxxxxxxxxx-xxxxxxxxxx"
                                    className="font-mono text-sm"
                                    aria-invalid={Boolean(errors.recovery_code)}
                                    aria-describedby={
                                        errors.recovery_code
                                            ? 'recovery-code-error'
                                            : undefined
                                    }
                                />
                                <InputError
                                    id="recovery-code-error"
                                    message={errors.recovery_code}
                                />
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="code">
                                    6-digit authenticator code
                                </Label>
                                <Input
                                    id="code"
                                    type="text"
                                    name="code"
                                    required
                                    autoFocus
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    placeholder="000000"
                                    className="h-13 text-center font-heading text-xl font-bold tracking-[0.42em] tabular-nums"
                                    aria-invalid={Boolean(errors.code)}
                                    aria-describedby={
                                        errors.code ? 'code-error' : undefined
                                    }
                                />
                                <InputError
                                    id="code-error"
                                    message={errors.code}
                                />
                            </div>
                        )}

                        <Button
                            type="submit"
                            size="lg"
                            variant="plum"
                            className="w-full"
                            loading={processing}
                            data-test="admin-two-factor-submit"
                        >
                            <ShieldCheck
                                className="size-4"
                                aria-hidden="true"
                            />
                            <span>Verify &amp; open console</span>
                        </Button>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 pt-4 text-sm dark:border-border">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setUseRecovery((mode) => !mode)}
                                className="gap-1.5 text-xs"
                            >
                                <KeyRound
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>
                                    {useRecovery
                                        ? 'Use authenticator code'
                                        : 'Use recovery code'}
                                </span>
                            </Button>

                            <TextLink
                                href={login()}
                                className="text-xs font-semibold text-tijum-plum-muted no-underline hover:text-tijum-plum hover:underline dark:text-muted-foreground dark:hover:text-foreground"
                            >
                                Cancel sign in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

AdminTwoFactorChallenge.authMeta = {
    title: 'Verify two-factor code',
    description:
        'Confirm your TOTP authenticator code or single-use recovery code before entering the Admin Console.',
};

AdminTwoFactorChallenge.layout = AdminTwoFactorChallenge.authMeta;
