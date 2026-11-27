import { Link, useForm, usePage } from '@inertiajs/react';
import {
    Building2,
    Clock,
    Mail,
    MapPin,
    Phone,
    Scale,
    Send,
    ShieldCheck,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import InputError from '@/components/input-error';
import { PublicPageHero } from '@/components/public/public-page-hero';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { SocialIcon, WhatsAppIcon } from '@/components/public/social-links';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CONTACT_INFO, LAUNCH_CITIES } from '@/data/public-content';
import { faqs, grievanceRedressal } from '@/routes/public';
import { show as cityShow } from '@/routes/public/cities';
import type { SeoMetadata } from '@/types';

type ContactProps = {
    contact?: {
        phone: string;
        whatsapp: string;
        email: string;
        partners_email: string;
        hours: string;
        address: string;
    };
    social?: {
        facebook: { username: string; url: string };
        instagram: { username: string; url: string };
        whatsapp: { number: string; url: string };
    };
    seo?: SeoMetadata;
};

export default function Contact({ contact, social, seo }: ContactProps) {
    const { publicCities } = usePage().props;
    const activeCities =
        Array.isArray(publicCities) && publicCities.length > 0
            ? publicCities
            : LAUNCH_CITIES;
    const phoneDisplay = contact?.phone ?? CONTACT_INFO.phone.display;
    const whatsappDisplay = contact?.whatsapp ?? CONTACT_INFO.whatsapp.number;
    const whatsappHref = social?.whatsapp?.url ?? CONTACT_INFO.whatsapp.href;
    const supportEmail = contact?.email ?? CONTACT_INFO.emails.support;
    const partnersEmail =
        contact?.partners_email ?? CONTACT_INFO.emails.partners;
    const operatingHours = contact?.hours ?? CONTACT_INFO.hours;
    const officeAddress = contact?.address ?? CONTACT_INFO.officeAddress;

    // Contact form state (submitted to POST /contact)
    const contactForm = useForm<{
        name: string;
        email: string;
        mobile: string;
        subject: 'booking' | 'partner' | 'general';
        message: string;
    }>({
        name: '',
        email: '',
        mobile: '',
        subject: 'booking',
        message: '',
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        contactForm.post('/contact', {
            preserveScroll: true,
            onSuccess: () => {
                setSubmitted(true);
            },
        });
    };

    const handleWhatsAppPrefilled = () => {
        const text = encodeURIComponent(
            `Hi TIJUM Support,\nName: ${contactForm.data.name || 'Guest'}\nSubject: ${contactForm.data.subject}\nMessage: ${contactForm.data.message || 'I would like to inquire about stays.'}`,
        );
        window.open(
            `${whatsappHref}?text=${text}`,
            '_blank',
            'noopener,noreferrer',
        );
    };

    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle="Contact Us — Customer Support, Partner Desk & WhatsApp | TIJUM"
                fallbackDescription="Contact TIJUM via WhatsApp (+91 8142334033), call, or email support@tijum.com. Connect with us on Instagram and Facebook (@tijum.official) for accommodations across Hyderabad, Vijayawada, Guntur, and Visakhapatnam."
            />

            <PublicPageHero
                eyebrow="Contact &amp; Support"
                title="We’re here to help you stay easy and eat well."
                description="Have questions about hostel rooms, meal schedules, or booking online? Reach our dedicated support team directly via WhatsApp, phone, email, or social channels."
                breadcrumbs={[{ label: 'Contact Us', current: true }]}
                badges={
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="peach">Customer Helpdesk</Badge>
                        <Badge
                            variant="outline"
                            className="border-tijum-plum/20 text-tijum-plum"
                        >
                            Launch Cities: HYD · VJA · GNT · VTZ
                        </Badge>
                    </div>
                }
            />

            {/* Quick Touchpoints Grid */}
            <section className="bg-tijum-cream py-12 sm:py-16">
                <ResponsiveContainer width="wide" className="space-y-10">
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {/* WhatsApp Direct */}
                        <div className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-white p-6 shadow-tijum-card transition-all duration-300 hover:shadow-tijum-soft">
                            <div className="space-y-3">
                                <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                    <WhatsAppIcon className="size-5" />
                                </span>
                                <h2 className="font-heading text-lg font-bold text-tijum-plum">
                                    WhatsApp Chat
                                </h2>
                                <p className="text-xs leading-relaxed text-tijum-plum-muted">
                                    Fastest response for booking inquiries, meal
                                    details, and reservation help.
                                </p>
                                <p className="font-heading text-base font-bold text-emerald-700">
                                    {whatsappDisplay}
                                </p>
                            </div>
                            <Button
                                asChild
                                variant="default"
                                size="sm"
                                className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500"
                            >
                                <a
                                    href={
                                        social?.whatsapp?.url ??
                                        'https://wa.me/918142334033'
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Chat with TIJUM on WhatsApp at 8142334033"
                                >
                                    <WhatsAppIcon className="size-4" />
                                    Chat on WhatsApp
                                </a>
                            </Button>
                        </div>

                        {/* Phone Call */}
                        <div className="flex flex-col justify-between rounded-2xl border border-tijum-surface bg-white p-6 shadow-tijum-card transition-all duration-300 hover:shadow-tijum-soft">
                            <div className="space-y-3">
                                <span className="flex size-11 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                    <Phone
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <h2 className="font-heading text-lg font-bold text-tijum-plum">
                                    Phone Support
                                </h2>
                                <p className="text-xs leading-relaxed text-tijum-plum-muted">
                                    Speak directly with our support desk during
                                    business hours.
                                </p>
                                <p className="font-heading text-base font-bold text-tijum-plum">
                                    {phoneDisplay}
                                </p>
                                <p className="text-[11px] text-tijum-plum-muted">
                                    {operatingHours}
                                </p>
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="mt-5 w-full"
                            >
                                <a
                                    href={`tel:${phoneDisplay.replace(/\s+/g, '')}`}
                                >
                                    <Phone
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    Call {phoneDisplay}
                                </a>
                            </Button>
                        </div>

                        {/* Email Support */}
                        <div className="flex flex-col justify-between rounded-2xl border border-tijum-surface bg-white p-6 shadow-tijum-card transition-all duration-300 hover:shadow-tijum-soft">
                            <div className="space-y-3">
                                <span className="flex size-11 items-center justify-center rounded-xl bg-tijum-plum/10 text-tijum-plum">
                                    <Mail
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <h2 className="font-heading text-lg font-bold text-tijum-plum">
                                    Email Helpdesk
                                </h2>
                                <p className="text-xs leading-relaxed text-tijum-plum-muted">
                                    Send us your queries, partner proposals, or
                                    feedback.
                                </p>
                                <div className="space-y-1 text-xs">
                                    <p className="font-medium text-tijum-plum">
                                        Guests:{' '}
                                        <a
                                            href={`mailto:${supportEmail}`}
                                            className="underline hover:text-tijum-coral"
                                        >
                                            {supportEmail}
                                        </a>
                                    </p>
                                    <p className="font-medium text-tijum-plum">
                                        Partners:{' '}
                                        <a
                                            href={`mailto:${partnersEmail}`}
                                            className="underline hover:text-tijum-coral"
                                        >
                                            {partnersEmail}
                                        </a>
                                    </p>
                                </div>
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="mt-5 w-full"
                            >
                                <a href={`mailto:${supportEmail}`}>
                                    <Mail
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    Send Email
                                </a>
                            </Button>
                        </div>

                        {/* Social Community */}
                        <div className="flex flex-col justify-between rounded-2xl border border-tijum-peach/60 bg-white p-6 shadow-tijum-card transition-all duration-300 hover:shadow-tijum-soft">
                            <div className="space-y-3">
                                <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 text-white">
                                    <SocialIcon
                                        name="Instagram"
                                        className="size-5"
                                    />
                                </span>
                                <h2 className="font-heading text-lg font-bold text-tijum-plum">
                                    Follow Socials
                                </h2>
                                <p className="text-xs leading-relaxed text-tijum-plum-muted">
                                    Daily updates, hostel spotlights, and
                                    student living guides.
                                </p>
                                <div className="space-y-1 text-xs font-semibold text-tijum-plum">
                                    <p>Instagram: tijum.official</p>
                                    <p>Facebook: tijum.official</p>
                                </div>
                            </div>
                            <div className="mt-5 flex gap-2">
                                <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <a
                                        href={
                                            social?.instagram?.url ??
                                            'https://instagram.com/tijum.official'
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Follow TIJUM on Instagram"
                                    >
                                        <SocialIcon
                                            name="Instagram"
                                            className="size-3.5"
                                        />
                                        Instagram
                                    </a>
                                </Button>
                                <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <a
                                        href={
                                            social?.facebook?.url ??
                                            'https://facebook.com/tijum.official'
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Follow TIJUM on Facebook"
                                    >
                                        <SocialIcon
                                            name="Facebook"
                                            className="size-3.5"
                                        />
                                        Facebook
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </ResponsiveContainer>
            </section>

            {/* Form & Operating Corridor Split */}
            <section className="bg-white py-14 sm:py-16 lg:py-20">
                <ResponsiveContainer width="wide" className="space-y-12">
                    <div className="grid gap-12 lg:grid-cols-12">
                        {/* Inquiry Form */}
                        <div className="lg:col-span-7">
                            <Card className="rounded-[24px] border-tijum-surface shadow-tijum-card">
                                <CardHeader className="space-y-2 pb-6">
                                    <Badge
                                        variant="peach"
                                        className="self-start"
                                    >
                                        Send a Message
                                    </Badge>
                                    <CardTitle className="font-heading text-2xl font-bold text-tijum-plum">
                                        How can we help you today?
                                    </CardTitle>
                                    <CardDescription>
                                        Leave your details and message. Our
                                        customer team will reach back via phone,
                                        WhatsApp, or email.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {submitted ? (
                                        <div className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-950">
                                            <div className="flex items-center gap-3">
                                                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                                                    <ShieldCheck className="size-5" />
                                                </span>
                                                <div>
                                                    <h3 className="font-heading text-lg font-bold">
                                                        Thank you,{' '}
                                                        {contactForm.data.name ||
                                                            'valued customer'}
                                                        !
                                                    </h3>
                                                    <p className="text-xs text-emerald-800">
                                                        We have received your
                                                        message and will connect
                                                        within business hours.
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-xs leading-relaxed text-emerald-800">
                                                Need an urgent response? You can
                                                send your inquiry straight to
                                                our active WhatsApp desk right
                                                now:
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <Button
                                                    type="button"
                                                    onClick={
                                                        handleWhatsAppPrefilled
                                                    }
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    <WhatsAppIcon className="size-4" />
                                                    Forward Message to WhatsApp
                                                    Desk
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        contactForm.reset();
                                                        setSubmitted(false);
                                                    }}
                                                >
                                                    Send another inquiry
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <form
                                            onSubmit={handleSubmit}
                                            className="space-y-5"
                                        >
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="contact-name">
                                                        Your Full Name *
                                                    </Label>
                                                    <Input
                                                        id="contact-name"
                                                        type="text"
                                                        value={contactForm.data.name}
                                                        onChange={(e) =>
                                                            contactForm.setData(
                                                                'name',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Enter your name"
                                                        required
                                                    />
                                                    <InputError
                                                        message={
                                                            contactForm.errors
                                                                .name
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="contact-mobile">
                                                        Mobile Number (WhatsApp)
                                                        *
                                                    </Label>
                                                    <Input
                                                        id="contact-mobile"
                                                        type="tel"
                                                        value={contactForm.data.mobile}
                                                        onChange={(e) =>
                                                            contactForm.setData(
                                                                'mobile',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="+91 9876543210"
                                                        required
                                                    />
                                                    <InputError
                                                        message={
                                                            contactForm.errors
                                                                .mobile
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="contact-email">
                                                        Email Address *
                                                    </Label>
                                                    <Input
                                                        id="contact-email"
                                                        type="email"
                                                        value={contactForm.data.email}
                                                        onChange={(e) =>
                                                            contactForm.setData(
                                                                'email',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="you@example.com"
                                                        required
                                                    />
                                                    <InputError
                                                        message={
                                                            contactForm.errors
                                                                .email
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="contact-subject">
                                                        Topic / Purpose *
                                                    </Label>
                                                    <Select
                                                        value={contactForm.data.subject}
                                                        onValueChange={(
                                                            value:
                                                                | 'booking'
                                                                | 'partner'
                                                                | 'general',
                                                        ) =>
                                                            contactForm.setData(
                                                                'subject',
                                                                value,
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger
                                                            id="contact-subject"
                                                            className="h-12 w-full text-base md:text-sm"
                                                        >
                                                            <SelectValue placeholder="Select topic / purpose" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="booking">
                                                                Stay / Booking
                                                                Assistance
                                                            </SelectItem>
                                                            <SelectItem value="partner">
                                                                List a Hostel,
                                                                PG or Homestay
                                                            </SelectItem>
                                                            <SelectItem value="general">
                                                                General Inquiry
                                                                or Feedback
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <InputError
                                                        message={
                                                            contactForm.errors
                                                                .subject
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="contact-message">
                                                    Your Message *
                                                </Label>
                                                <Textarea
                                                    id="contact-message"
                                                    value={contactForm.data.message}
                                                    onChange={(e) =>
                                                        contactForm.setData(
                                                            'message',
                                                            e.target.value,
                                                        )
                                                    }
                                                    rows={4}
                                                    placeholder="Tell us about the property, dates, food requirements, or questions you have..."
                                                    required
                                                />
                                                <InputError
                                                    message={
                                                        contactForm.errors
                                                            .message
                                                    }
                                                />
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                                <p className="text-xs text-tijum-plum-muted">
                                                    Direct WhatsApp:{' '}
                                                    <span className="font-semibold text-tijum-plum">
                                                        {whatsappDisplay}
                                                    </span>
                                                </p>
                                                <Button
                                                    type="submit"
                                                    disabled={contactForm.processing}
                                                    className="min-w-36"
                                                >
                                                    <Send
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                    {contactForm.processing
                                                        ? 'Sending…'
                                                        : 'Send Message'}
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Location, Operation & Statutory Box */}
                        <div className="space-y-6 lg:col-span-5">
                            {/* Registered Office & Operating Hours */}
                            <Card className="rounded-[24px] border-tijum-surface bg-tijum-cream/40 shadow-tijum-card">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-tijum-plum">
                                        <MapPin
                                            className="size-5 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        Corporate Office
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-xs leading-relaxed text-tijum-plum-muted">
                                    <p className="font-medium text-tijum-plum">
                                        {officeAddress}
                                    </p>
                                    <div className="flex items-center gap-2 border-t border-tijum-surface/80 pt-3 text-tijum-plum">
                                        <Clock
                                            className="size-4 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            Operating Desk: {operatingHours}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Launch Corridors */}
                            <Card className="rounded-[24px] border-tijum-surface shadow-tijum-card">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-tijum-plum">
                                        <Building2
                                            className="size-5 text-tijum-plum"
                                            aria-hidden="true"
                                        />
                                        Our Launch Cities
                                    </CardTitle>
                                    <CardDescription>
                                        Verified stays with transparent food
                                        inclusions active in:
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {activeCities.map((city) => (
                                            <Link
                                                key={city.slug}
                                                href={cityShow(city.slug)}
                                                className="inline-flex min-h-9 items-center rounded-full border border-tijum-surface bg-white px-3.5 font-heading text-xs font-semibold text-tijum-plum transition-colors hover:border-tijum-coral hover:text-tijum-coral"
                                            >
                                                {city.name}
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Statutory Grievance vs General Support Notice */}
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-xs text-amber-950">
                                <div className="flex items-center gap-2 font-heading text-sm font-bold text-amber-900">
                                    <Scale
                                        className="size-4 text-amber-700"
                                        aria-hidden="true"
                                    />
                                    <span>Statutory Grievance Redressal</span>
                                </div>
                                <p className="mt-2 leading-relaxed text-amber-900/90">
                                    For unresolved disputes or regulatory
                                    escalations under the Consumer Protection
                                    Act, 2019 and E-Commerce Rules, 2020, visit
                                    our dedicated Grievance Redressal Cell with
                                    mandated statutory turnaround times.
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="border-amber-300 bg-white hover:bg-amber-100"
                                    >
                                        <Link href={grievanceRedressal()}>
                                            View Grievance Officer &amp; SLAs →
                                        </Link>
                                    </Button>
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href={faqs()}>Browse FAQs</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ResponsiveContainer>
            </section>
        </>
    );
}
