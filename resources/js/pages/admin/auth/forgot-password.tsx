import { Form, Head } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes/admin';
import { email } from '@/routes/admin/password';

type AdminForgotPasswordProps = {
    status?: string;
};

export default function AdminForgotPassword({
    status,
}: AdminForgotPasswordProps) {
    return (
        <>
            <Head title="Admin Forgot Password" />

            {status && (
                <Alert variant="info" className="mb-5">
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

            <Form {...email.form()} className="flex flex-col gap-5">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Administrator email</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                autoComplete="email"
                                placeholder="admin@tijum.in"
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
                            variant="plum"
                            className="w-full"
                            loading={processing}
                        >
                            <Mail className="size-4" aria-hidden="true" />
                            <span>Send administrator reset link</span>
                        </Button>

                        <div className="border-t border-tijum-surface/80 pt-5 text-center dark:border-border">
                            <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                Remembered your password?{' '}
                                <TextLink
                                    href={login()}
                                    className="font-semibold text-tijum-plum dark:text-tijum-peach"
                                >
                                    Return to admin sign in
                                </TextLink>
                            </p>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

AdminForgotPassword.authMeta = {
    title: 'Administrator password recovery',
    description:
        'Request an isolated administrator reset link sent only to your verified admin email.',
};

AdminForgotPassword.layout = AdminForgotPassword.authMeta;
