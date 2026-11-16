import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, MailCheck, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';
import { search as publicSearch } from '@/routes/public';

interface Props {
    email: string;
}

export default function NewsletterUnsubscribed({ email }: Props) {
    return (
        <>
            <Head title="Unsubscribed — TIJUM Email Preferences" />

            <section className="bg-tijum-cream py-16 sm:py-24">
                <ResponsiveContainer width="narrow">
                    <div className="space-y-6 rounded-[28px] border border-tijum-surface bg-white p-8 text-center shadow-tijum-soft sm:p-12">
                        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-tijum-peach/30 text-tijum-plum">
                            <MailCheck className="size-8" aria-hidden="true" />
                        </div>

                        <div className="space-y-2.5">
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-tijum-plum sm:text-3xl text-balance">
                                You have been unsubscribed
                            </h1>
                            <p className="mx-auto max-w-md text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                We&apos;ve removed{' '}
                                <strong className="font-heading text-tijum-plum">
                                    {email}
                                </strong>{' '}
                                from optional TIJUM promotional newsletters and
                                marketing emails.
                            </p>
                        </div>

                        {/* Transactional notice */}
                        <div className="flex items-start gap-3.5 rounded-[20px] border border-tijum-surface bg-tijum-cream/65 p-5 text-left">
                            <ShieldCheck
                                className="mt-0.5 size-5 shrink-0 text-tijum-plum"
                                aria-hidden="true"
                            />
                            <div className="space-y-1 text-xs leading-relaxed text-tijum-lavender sm:text-sm">
                                <span className="block font-heading font-bold text-tijum-plum">
                                    Reservation &amp; Security Alerts Still
                                    Active
                                </span>
                                <p>
                                    Essential transactional emails (booking
                                    confirmations, payment receipts, check-in
                                    instructions, and stay protection updates)
                                    will continue whenever you hold or book a
                                    stay.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
                            <Button size="lg" className="w-full sm:w-auto" asChild>
                                <Link href={home()}>
                                    <ArrowLeft
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Return to Homepage</span>
                                </Link>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full sm:w-auto"
                                asChild
                            >
                                <Link href={publicSearch()}>
                                    Explore verified stays
                                </Link>
                            </Button>
                        </div>
                    </div>
                </ResponsiveContainer>
            </section>
        </>
    );
}
