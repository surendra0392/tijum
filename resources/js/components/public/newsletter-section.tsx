import { router } from '@inertiajs/react';
import { ArrowRight, Mail, MailCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { subscribe } from '@/routes/public/newsletter';

export function NewsletterSection() {
    const [email, setEmail] = useState('');
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [processing, setProcessing] = useState(false);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email || !marketingConsent) {
            return;
        }

        setProcessing(true);
        router.post(
            subscribe.url(),
            {
                email,
                marketing_consent: marketingConsent,
                source: 'homepage_newsletter',
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSubscribed(true);
                    setEmail('');
                    setMarketingConsent(false);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <section
            aria-labelledby="newsletter-heading"
            className="border-t border-tijum-surface/80 bg-white pt-14 pb-6 sm:pt-16 sm:pb-8"
        >
            <ResponsiveContainer width="wide">
                <div className="rounded-[26px] border border-tijum-surface/90 bg-tijum-cream/45 p-6 sm:p-8 lg:p-10">
                    <div className="grid gap-6 lg:grid-cols-12 lg:items-center lg:gap-10">
                        <div className="space-y-2.5 lg:col-span-5">
                            <div className="flex items-center gap-2.5">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-tijum-plum shadow-2xs">
                                    <Mail
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <h2
                                    id="newsletter-heading"
                                    className="font-heading text-xl font-bold tracking-tight text-tijum-plum sm:text-2xl"
                                >
                                    City living guides &amp; new stays
                                </h2>
                            </div>
                            <p className="max-w-[46ch] text-sm leading-relaxed text-tijum-lavender">
                                Occasional updates on new verified stays, city
                                guides, and seasonal offers. Unsubscribe
                                anytime.
                            </p>
                        </div>

                        <div className="lg:col-span-7">
                            {subscribed ? (
                                <div
                                    role="status"
                                    className="flex items-start gap-3 rounded-2xl border border-tijum-peach bg-white p-5 text-tijum-plum shadow-2xs"
                                >
                                    <MailCheck
                                        className="mt-0.5 size-5 shrink-0 text-[#E05A47]"
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <p className="font-heading text-sm font-semibold">
                                            Subscription received
                                        </p>
                                        <p className="mt-0.5 text-xs text-tijum-lavender sm:text-sm">
                                            Check your inbox for confirmation.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={submit} className="space-y-3.5">
                                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="newsletter-email"
                                                className="text-xs font-semibold text-tijum-plum"
                                            >
                                                Email address
                                            </Label>
                                            <Input
                                                id="newsletter-email"
                                                name="email"
                                                type="email"
                                                value={email}
                                                onChange={(event) =>
                                                    setEmail(event.target.value)
                                                }
                                                placeholder="you@example.com"
                                                autoComplete="email"
                                                spellCheck={false}
                                                required
                                                className="h-11 bg-white"
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            size="lg"
                                            className="h-11"
                                            disabled={
                                                processing || !marketingConsent
                                            }
                                        >
                                            {processing
                                                ? 'Subscribing…'
                                                : 'Subscribe'}
                                            {!processing && (
                                                <ArrowRight aria-hidden="true" />
                                            )}
                                        </Button>
                                    </div>

                                    <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-tijum-lavender">
                                        <input
                                            id="homepage-marketing-consent"
                                            name="marketing_consent"
                                            type="checkbox"
                                            checked={marketingConsent}
                                            onChange={(event) =>
                                                setMarketingConsent(
                                                    event.target.checked,
                                                )
                                            }
                                            className="mt-0.5 size-4 shrink-0 accent-tijum-coral"
                                        />
                                        <span>
                                            I agree to receive optional TIJUM
                                            marketing emails. Transactional
                                            booking updates are sent separately.
                                        </span>
                                    </label>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </ResponsiveContainer>
        </section>
    );
}
