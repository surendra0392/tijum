import { Form, Head } from '@inertiajs/react';
import { ArrowRight, KeyRound } from 'lucide-react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Forgot password" />

            {status && (
                <Alert variant="info" className="mb-5">
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

            <Form {...email.form()} className="flex flex-col gap-5">
                {({ processing, errors }) => (
                    <>
                        <div className="flex items-start gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/55 p-3.5 text-xs leading-relaxed text-tijum-plum-muted">
                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-tijum-peach/30 text-tijum-plum">
                                <KeyRound
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </span>
                            <p>
                                We will send a secure password reset link to
                                your registered email address or mobile number.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">
                                Email or Mobile Number
                            </Label>
                            <Input
                                id="email"
                                type="text"
                                name="email"
                                required
                                autoComplete="username"
                                autoFocus
                                placeholder="you@example.com or 10-digit mobile"
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={
                                    errors.email ? 'email-error' : undefined
                                }
                            />
                            <InputError
                                id="email-error"
                                message={errors.email}
                            />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            loading={processing}
                            data-test="email-password-reset-link-button"
                        >
                            <span>Send password reset instructions</span>
                            <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Button>

                        <div className="border-t border-tijum-surface/80 pt-5 text-center">
                            <p className="text-sm text-tijum-plum-muted">
                                Remembered your password?{' '}
                                <TextLink
                                    href={login()}
                                    className="font-semibold text-tijum-plum"
                                >
                                    Back to log in
                                </TextLink>
                            </p>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

ForgotPassword.authMeta = {
    title: 'Reset your password',
    description:
        'Enter your registered email address or mobile number to receive password reset instructions.',
};

ForgotPassword.layout = ForgotPassword.authMeta;
