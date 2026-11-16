import { Database, Eye, Key, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { PublicCtaBand } from '@/components/public/public-cta-band';
import { PublicPageHero } from '@/components/public/public-page-hero';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { faqs, grievanceRedressal } from '@/routes/public';
import type { SeoMetadata } from '@/types';

interface PrivacyProps {
    seo?: SeoMetadata;
}

const privacySections = [
    {
        id: 'info-collected',
        title: '1. Information We Collect',
        icon: Database,
        intro: 'We collect information necessary to provide safe stay discovery, reservations, and property partner operations:',
        bullets: [
            'Account Information: Full name, valid mobile number, email address, password hash, and preferences.',
            'Mobile Phone Verification: Mobile numbers are verified via SMS OTP for dual-identifier sign-in and critical booking alerts.',
            'Property Partner Details: Owner name, contact phone, trade name, accommodation category, physical location, photos, inventories, and settlement banking details.',
            'Booking & Transaction Data: Reservation history, room types, immutable pricing snapshots, gateway payment references (Razorpay), and check-in preferences.',
            'Technical & Device Data: IP address, browser details, device tokens, and search preferences used for relevant discovery.',
        ],
    },
    {
        id: 'how-we-use',
        title: '2. Purpose of Data Processing',
        icon: UserCheck,
        intro: 'TIJUM uses personal information strictly for legitimate marketplace operations:',
        bullets: [
            'Identity & Access Management: Authenticating customers and partners securely via email or registered mobile.',
            'Reservation Fulfillment: Delivering booking confirmations, check-in timing updates, and room allocation alerts.',
            'Financial Processing: Creating inventory holds and verifying payment status directly with payment gateways.',
            'Safety & Fraud Prevention: Preventing duplicate or unauthorized accounts and validating property submissions.',
            'Customer Support & Compliance: Investigating stay protection cases, relocations, and statutory grievance timelines.',
        ],
    },
    {
        id: 'sharing-disclosure',
        title: '3. Data Sharing & Third Parties',
        icon: Eye,
        intro: 'We do not sell, rent, or trade your personal information. Data is shared solely within strict operational boundaries:',
        bullets: [
            'Property Partners: On booking confirmation, the host receives guest name, mobile contact, check-in date, and room type solely to prepare check-in and allocate a physical room.',
            'Payment Processors: Card and UPI checkouts run directly through PCI-DSS compliant gateways (Razorpay). TIJUM never stores card numbers or bank PINs.',
            'Communications Infrastructure: Verified SMS/email providers deliver time-critical booking confirmations and OTP alerts.',
            'Legal Mandates: Information may be disclosed when legally compelled under applicable Indian laws or judicial orders.',
        ],
    },
    {
        id: 'security-retention',
        title: '4. Data Security & Storage',
        icon: Lock,
        intro: 'We maintain strong administrative, technical, and access safeguards across the platform:',
        bullets: [
            'Encryption & Protection: TLS encryption protects data in transit alongside Bcrypt/Argon2 password hashing.',
            'Role-Based Controls: Administrative and support views enforce strict role separation and audit trails.',
            'Retention Schedule: Reservation and account records remain only while active or required under statutory tax and consumer compliance periods.',
        ],
    },
    {
        id: 'user-rights',
        title: '5. Your Rights & Statutory Redressal',
        icon: Key,
        intro: 'Under Indian technology rules and the Digital Personal Data Protection Act (DPDPA 2023), you hold the right to:',
        bullets: [
            'Access & Correction: Review and update your name, phone number, and email in Dashboard settings.',
            'Account Deletion: Request closure and erasure of non-mandatory historical records.',
            'Communication Controls: Opt out of optional marketing emails at any time without affecting reservation alerts.',
            'Grievance Escalation: Reach our Grievance Redressal Officer directly on any privacy or data concern.',
        ],
    },
];

export default function Privacy({ seo }: PrivacyProps) {
    return (
        <>
            <PublicSeoHead seo={seo} fallbackTitle="Privacy Policy — TIJUM" />

            <PublicPageHero
                eyebrow="Legal & Privacy"
                title="Privacy Policy"
                description="How TIJUM collects, safeguards, processes, and shares customer and property partner information transparently."
                breadcrumbs={[{ label: 'Privacy Policy', current: true }]}
                badges={
                    <Badge variant="peach" className="gap-1.5">
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                        Data Protection &amp; Privacy
                    </Badge>
                }
            />

            <section
                aria-label="Privacy policy details"
                className="bg-tijum-cream py-12 sm:py-16"
            >
                <ResponsiveContainer width="wide" className="space-y-10">
                    <div className="rounded-[20px] border border-tijum-surface bg-white p-5 text-sm leading-relaxed text-tijum-lavender shadow-tijum-card sm:p-6">
                        <strong className="font-heading text-tijum-plum">
                            Effective Date: November 14, 2026.
                        </strong>{' '}
                        This Privacy Policy outlines how TIJUM collects, uses,
                        and protects personal data across our website, apps, and
                        booking workflows.
                    </div>

                    <div className="grid gap-10 lg:grid-cols-12">
                        <aside className="lg:col-span-4">
                            <nav
                                aria-label="Privacy sections"
                                className="rounded-[24px] border border-tijum-surface bg-white p-5 shadow-tijum-card lg:sticky lg:top-24 sm:p-6"
                            >
                                <p className="font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                    Contents
                                </p>
                                <ul className="mt-3 space-y-1">
                                    {privacySections.map((sec) => (
                                        <li key={sec.id}>
                                            <a
                                                href={`#${sec.id}`}
                                                className="block rounded-xl px-3 py-2 font-heading text-xs font-semibold text-tijum-plum transition-colors hover:bg-tijum-cream hover:text-tijum-coral sm:text-sm"
                                            >
                                                {sec.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </aside>

                        <div className="space-y-6 lg:col-span-8">
                            {privacySections.map((section) => {
                                const Icon = section.icon;

                                return (
                                    <article
                                        key={section.id}
                                        id={section.id}
                                        className="scroll-mt-24 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                                <Icon
                                                    className="size-5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <h2 className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                                {section.title}
                                            </h2>
                                        </div>

                                        <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                            {section.intro}
                                        </p>

                                        <ul className="mt-4 max-w-[68ch] space-y-2.5 border-t border-tijum-surface pt-4 text-sm leading-relaxed text-tijum-lavender">
                                            {section.bullets.map((bullet) => {
                                                const [lead, ...rest] =
                                                    bullet.split(':');
                                                const hasLead = rest.length > 0;
                                                return (
                                                    <li
                                                        key={bullet}
                                                        className="flex items-start gap-2.5"
                                                    >
                                                        <span
                                                            className="mt-2 size-1.5 shrink-0 rounded-full bg-tijum-coral"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {hasLead ? (
                                                                <>
                                                                    <strong className="font-heading text-tijum-plum">
                                                                        {lead}:
                                                                    </strong>{' '}
                                                                    {rest.join(
                                                                        ':',
                                                                    )}
                                                                </>
                                                            ) : (
                                                                bullet
                                                            )}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </article>
                                );
                            })}

                            <PublicCtaBand
                                eyebrow="Data Protection"
                                title="Privacy or data access inquiry?"
                                description="Contact our designated Grievance Redressal Officer or check common security and booking FAQs."
                                primaryAction={{
                                    label: 'Contact Grievance Officer',
                                    href: grievanceRedressal(),
                                }}
                                secondaryAction={{
                                    label: 'Security FAQs',
                                    href: faqs(),
                                }}
                            />
                        </div>
                    </div>
                </ResponsiveContainer>
            </section>
        </>
    );
}
