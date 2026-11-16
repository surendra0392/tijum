import { Form, Head } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirm password" />

            <div className="mb-5 flex items-start gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/55 p-3.5 text-xs leading-relaxed text-tijum-plum-muted">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-tijum-peach/30 text-tijum-plum">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
                <p>
                    Security checkpoint required before modifying sensitive
                    account or authentication preferences.
                </p>
            </div>

            <PasskeyVerify
                routes={{
                    options: confirmOptions(),
                    submit: confirmStore(),
                }}
                label="Confirm with passkey"
                loadingLabel="Confirming..."
                separator="Or confirm with password"
            />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                placeholder="Enter your current password"
                                autoComplete="current-password"
                                autoFocus
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={
                                    errors.password
                                        ? 'password-error'
                                        : undefined
                                }
                            />
                            <InputError
                                id="password-error"
                                message={errors.password}
                            />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            loading={processing}
                            data-test="confirm-password-button"
                        >
                            Confirm password
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.authMeta = {
    title: 'Confirm password',
    description:
        'This is a protected security area. Confirm your password before continuing.',
};

ConfirmPassword.layout = ConfirmPassword.authMeta;
