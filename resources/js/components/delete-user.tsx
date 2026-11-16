import { Form } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import PasswordInput from '@/components/password-input';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <Card className="border-status-error-border bg-white dark:bg-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-status-error-fg">
                    <AlertTriangle className="size-5" aria-hidden="true" />
                    <span>Account management &amp; deletion</span>
                </CardTitle>
                <CardDescription>
                    Permanently remove your TIJUM customer account, personal
                    profile details, and linked passkeys.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-fg">
                    <p className="font-heading font-semibold">
                        Permanent action — cannot be undone
                    </p>
                    <p className="mt-1 text-status-error-fg/90">
                        Deleting your customer account removes your personal
                        data and saved passkeys permanently. Any independent
                        Owner or Admin portal accounts remain completely
                        separate and unaffected.
                    </p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button
                            type="button"
                            variant="destructive"
                            data-test="delete-user-button"
                        >
                            Delete Customer Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>
                            Delete your TIJUM customer account?
                        </DialogTitle>
                        <DialogDescription>
                            This permanently removes your customer account,
                            profile details, and registered passkeys. Please
                            enter your current customer password to confirm.
                        </DialogDescription>

                        <Form
                            {...ProfileController.destroy()}
                            options={{
                                preserveScroll: true,
                            }}
                            onError={() => passwordInput.current?.focus()}
                            resetOnSuccess
                            className="space-y-5"
                        >
                            {({ resetAndClearErrors, processing, errors }) => (
                                <>
                                    <FormField
                                        id="delete-account-password"
                                        label="Current password"
                                        required
                                        error={errors.password}
                                    >
                                        {(a11y) => (
                                            <PasswordInput
                                                {...a11y}
                                                name="password"
                                                ref={passwordInput}
                                                placeholder="Enter your password"
                                                autoComplete="current-password"
                                                required
                                            />
                                        )}
                                    </FormField>

                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                autoFocus
                                                onClick={() =>
                                                    resetAndClearErrors()
                                                }
                                            >
                                                Cancel
                                            </Button>
                                        </DialogClose>

                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            loading={processing}
                                            data-test="confirm-delete-user-button"
                                        >
                                            Delete Account
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
