import { Form, Head } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, KeyRound, Mail, MailCheck } from 'lucide-react';
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

            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-tijum-surface/85 bg-tijum-cream/55 p-3.5">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-tijum-coral shadow-2xs ring-1 ring-tijum-surface/70">
                    <KeyRound className="size-4" aria-hidden="true" />
                </span>
                <p className="text-xs leading-relaxed text-tijum-plum-muted">
                    We will send a secure reset link to your registered email
                    address or mobile number.
                </p>
            </div>

            {status && (
                <Alert variant="success" className="mb-5">
                    <MailCheck aria-hidden="true" />
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

            <Form {...email.form()} className="flex flex-col gap-5">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="email"
                                className="text-[13px] font-semibold text-tijum-plum"
                            >
                                Email or mobile number
                            </Label>
                            <div className="relative">
                                <Mail
                                    className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                    aria-hidden="true"
                                />
                                <Input
                                    id="email"
                                    type="text"
                                    name="email"
                                    required
                                    autoComplete="username"
                                    autoFocus
                                    placeholder="you@example.com or 10-digit mobile"
                                    className="bg-white pl-10 shadow-2xs"
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={
                                        errors.email ? 'email-error' : undefined
                                    }
                                />
                            </div>
                            <InputError
                                id="email-error"
                                message={errors.email}
                            />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="h-12 w-full rounded-xl"
                            loading={processing}
                            data-test="email-password-reset-link-button"
                        >
                            <span>Send reset instructions</span>
                            <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Button>

                        <div className="pt-1 text-center">
                            <TextLink
                                href={login()}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-tijum-plum no-underline hover:text-tijum-coral"
                            >
                                <ArrowLeft
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Back to log in</span>
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

ForgotPassword.authMeta = {
    title: 'Forgot password?',
    description:
        'Enter your registered email or mobile number and we will send password reset instructions.',
};

ForgotPassword.layout = ForgotPassword.authMeta;
