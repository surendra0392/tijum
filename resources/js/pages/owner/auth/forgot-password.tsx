import { Form, Head } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, KeyRound, Mail, MailCheck } from 'lucide-react';
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

            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-tijum-surface/85 bg-tijum-cream/50 p-3.5">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-plum text-tijum-peach shadow-2xs">
                    <KeyRound className="size-4" aria-hidden="true" />
                </span>
                <p className="text-xs leading-relaxed text-tijum-plum-muted">
                    Enter the business email registered with your partner
                    account to receive a secure reset link.
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
                                Partner email address
                            </Label>
                            <div className="relative">
                                <Mail
                                    className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-tijum-plum-muted/80"
                                    aria-hidden="true"
                                />
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    placeholder="partner@property.in"
                                    className="bg-tijum-cream/25 pl-10 focus-visible:bg-white"
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
                        >
                            <span>Send partner reset link</span>
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
                                <span>Return to partner sign in</span>
                            </TextLink>
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
        'Enter your partner email address to receive password recovery instructions.',
};

OwnerForgotPassword.layout = OwnerForgotPassword.authMeta;
