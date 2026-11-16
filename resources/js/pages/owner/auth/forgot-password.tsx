import { Form, Head } from '@inertiajs/react';
import { ArrowRight, KeyRound } from 'lucide-react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes/owner';
import { email } from '@/routes/owner/password';

type OwnerForgotPasswordProps = {
    status?: string;
};

export default function OwnerForgotPassword({
    status,
}: OwnerForgotPasswordProps) {
    return (
        <>
            <Head title="Partner Forgot Password" />

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
                                Enter the email address registered with your
                                partner account and we will send recovery
                                instructions.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Partner email address</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                autoComplete="email"
                                placeholder="partner@property.in"
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
                        >
                            <span>Send partner reset link</span>
                            <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Button>

                        <div className="border-t border-tijum-surface/80 pt-5 text-center">
                            <p className="text-sm text-tijum-plum-muted">
                                Remembered your credentials?{' '}
                                <TextLink
                                    href={login()}
                                    className="font-semibold text-tijum-plum"
                                >
                                    Return to partner sign in
                                </TextLink>
                            </p>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

OwnerForgotPassword.authMeta = {
    title: 'Reset partner password',
    description:
        'Enter your partner email address to receive a password reset link.',
};

OwnerForgotPassword.layout = OwnerForgotPassword.authMeta;
