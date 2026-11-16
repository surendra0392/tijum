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
            className="border-y border-tijum-surface bg-tijum-cream py-12 sm:py-16"
        >
            <ResponsiveContainer width="wide">
                <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                    <div className="space-y-3.5 lg:col-span-5">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-tijum-plum text-tijum-cream">
                            <Mail className="size-5" aria-hidden="true" />
                        </span>
                        <p className="font-heading text-xs font-semibold uppercase tracking-wider text-tijum-lavender sm:text-sm">
                            Stay Updated
                        </p>
                        <h2
                            id="newsletter-heading"
                            className="font-heading text-2xl font-bold tracking-tight text-tijum-plum sm:text-3xl leading-tight text-balance"
                        >
                            Practical guides for finding your next stay
                        </h2>
                        <p className="max-w-[55ch] text-sm leading-relaxed text-tijum-lavender sm:text-base text-pretty">
                            Receive optional TIJUM emails about accommodation
                            discovery, city living, and food-inclusive stays.
                        </p>
                    </div>

                    <div className="lg:col-span-7">
                        {subscribed ? (
                            <div
                                role="status"
                                className="flex items-start gap-3 rounded-[20px] border border-tijum-peach bg-white p-6 text-tijum-plum shadow-tijum-card"
                            >
                                <MailCheck
                                    className="mt-0.5 size-5 shrink-0 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="font-heading text-sm font-semibold">
                                        Subscription received
                                    </p>
                                    <p className="mt-1 text-sm text-tijum-lavender">
                                        Check your email for the next step.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <form
                                onSubmit={submit}
                                className="space-y-4 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-7"
                            >
                                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                                    <div className="space-y-2">
                                        <Label htmlFor="newsletter-email">
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
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        disabled={
                                            processing || !marketingConsent
                                        }
                                    >
                                        {processing
                                            ? 'Subscribing'
                                            : 'Subscribe'}
                                        {!processing && (
                                            <ArrowRight aria-hidden="true" />
                                        )}
                                    </Button>
                                </div>

                                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-tijum-lavender">
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
                                        className="mt-1 size-4 shrink-0 accent-tijum-coral"
                                    />
                                    <span>
                                        I explicitly agree to receive optional
                                        TIJUM marketing emails. Transactional
                                        reservation messages are separate.
                                    </span>
                                </label>
                            </form>
                        )}
                    </div>
                </div>
            </ResponsiveContainer>
        </section>
    );
}
