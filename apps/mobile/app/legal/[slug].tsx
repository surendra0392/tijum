import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PublicApi } from '../../src/api/public';
import { Colors } from '../../src/theme/colors';
import { BorderRadius, Spacing } from '../../src/theme/spacing';

interface LegalSection {
    title: string;
    intro?: string;
    bullets: string[];
}

const TERMS_SECTIONS: LegalSection[] = [
    {
        title: '1. Acceptance of Terms & Eligibility',
        intro: 'By registering an account, searching stays, or listing a property on TIJUM, you agree to these Terms of Service, our Privacy Policy, and marketplace standards:',
        bullets: [
            'Age Requirement: Users must be at least 18 years old or have legal parent/guardian consent when an enrolled student.',
            'Verified Contact Info: Provide truthful contact details including a valid mobile number and email address.',
            'Account Security: Maintain confidentiality over credentials and activity occurring within your account.',
        ],
    },
    {
        title: '2. Asset-Light Marketplace Model',
        intro: 'TIJUM operates strictly as a digital discovery and reservation platform connecting customers with independent operators of Hostels/PG, Homestays, and Co-Living properties:',
        bullets: [
            'No Property Ownership: TIJUM does not own, lease, or run physical buildings or residential kitchens.',
            'Host Operations: Independent partners remain solely responsible for physical room condition, local compliance, safety, and meal preparation.',
        ],
    },
    {
        title: '3. Reservations, Inventory Hold & Payments',
        intro: 'Reservations follow a clear backend-verified checkout and confirmation lifecycle:',
        bullets: [
            '15-Minute Inventory Hold: Selecting an available room type places a 15-minute hold while you review quotes and complete payment.',
            'Automatic Confirmation: Confirmed status triggers automatically on backend-verified gateway payment—no manual owner approval bottleneck.',
            'Transparent Pricing: Base stay amounts, applicable taxes, fees, and meal statuses display upfront before payment.',
            'Platform Checkout Only: Never arrange unauthorized off-platform cash transfers; authorized bookings settle through verified gateways (Razorpay).',
        ],
    },
    {
        title: '4. Property-Specific Food Flags & Stay Timings',
        intro: 'All stay durations, arrival schedules, and meal inclusions are disclosed independently per property:',
        bullets: [
            'Independent Meal Flags: Listings specify Food Provided, Breakfast Included, Lunch Included, and Dinner Included individually—never blanketed.',
            'No Assumed Meals: Meals not marked included in base pricing may be paid separately or unavailable on site.',
            'Arrival & Departure Times: Standard timing applies across listings; early arrival is request-only and subject to room readiness.',
        ],
    },
    {
        title: '5. Property Partner Responsibilities',
        intro: 'Independent owners registering via the Partner Portal agree to:',
        bullets: [
            'Accurate Property Records: Publish truthful property categories, gender policies, amenities, imagery, and rate cards.',
            'Room Fulfillment: Allocate prepared rooms cleanly for confirmed reservations without unauthorized cancellations.',
            'Statutory Clearances: Maintain valid municipal, hygiene, trade, and fire safety permits.',
        ],
    },
    {
        title: '6. Cancellations, Relocations & Grievance Redressal',
        intro: 'Clear resolution protections apply across every confirmed booking:',
        bullets: [
            'Cancellations: Processed in line with the applicable booking cancellation window.',
            'Protection & Relocations: In confirmed host overbooking or material mismatch cases, customers may request platform-assisted relocation or refund review.',
            'Consumer Redressal: Escalate statutory grievances directly to our Grievance Officer within SLA timelines.',
        ],
    },
    {
        title: '7. Coupons, Referral Programme & Loyalty Points',
        intro: 'Promotional codes, referral credits, and loyalty wallet usage follow transparent anti-abuse rules:',
        bullets: [
            'Coupons: Valid strictly during active campaigns and minimum booking totals; reserved during checkout hold and committed on captured payment.',
            'Refer & Earn: Rewards accrue only after genuine first-time friends register via referral link/code and complete stays; self-referrals void points.',
            'Non-Cash Points Ledger: Loyalty points are promotional credits usable solely on eligible stay bookings, expiring via FEFO schedule without cash encashment.',
            'Partner Settlement Protection: Platform-funded coupons and loyalty redemptions do not reduce host payouts.',
        ],
    },
];

const PRIVACY_SECTIONS: LegalSection[] = [
    {
        title: '1. Information We Collect',
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
        title: '2. Purpose of Data Processing',
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
        title: '3. Data Sharing & Third Parties',
        intro: 'We do not sell, rent, or trade your personal information. Data is shared solely within strict operational boundaries:',
        bullets: [
            'Property Partners: On booking confirmation, the host receives guest name, mobile contact, check-in date, and room type solely to prepare check-in and allocate a physical room.',
            'Payment Processors: Card and UPI checkouts run directly through PCI-DSS compliant gateways (Razorpay). TIJUM never stores card numbers or bank PINs.',
            'Communications Infrastructure: Verified SMS/email providers deliver time-critical booking confirmations and OTP alerts.',
            'Legal Mandates: Information may be disclosed when legally compelled under applicable Indian laws or judicial orders.',
        ],
    },
    {
        title: '4. Data Security & Storage',
        intro: 'We maintain strong administrative, technical, and access safeguards across the platform:',
        bullets: [
            'Encryption & Protection: TLS encryption protects data in transit alongside Bcrypt/Argon2 password hashing.',
            'Role-Based Controls: Administrative and support views enforce strict role separation and audit trails.',
            'Retention Schedule: Reservation and account records remain only while active or required under statutory tax and consumer compliance periods.',
        ],
    },
    {
        title: '5. Your Rights & Statutory Redressal',
        intro: 'Under Indian technology rules and the Digital Personal Data Protection Act (DPDPA 2023), you hold the right to:',
        bullets: [
            'Access & Correction: Review and update your name, phone number, and email in Dashboard settings.',
            'Account Deletion: Request closure and erasure of non-mandatory historical records.',
            'Communication Controls: Opt out of optional marketing emails at any time without affecting reservation alerts.',
            'Grievance Escalation: Reach our Grievance Redressal Officer directly on any privacy or data concern.',
        ],
    },
];

function stripHtml(value: string): string {
    return value
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export default function LegalScreen() {
    const params = useLocalSearchParams<{ slug?: string }>();
    const slug = String(params.slug || 'about');
    const [aboutBlocks, setAboutBlocks] = useState<any[]>([]);
    const [aboutTitle, setAboutTitle] = useState('About TIJUM');
    const [aboutExcerpt, setAboutExcerpt] = useState('');
    const [loading, setLoading] = useState(slug === 'about');
    const [error, setError] = useState('');

    const isTerms = slug === 'terms';
    const isPrivacy = slug === 'privacy';
    const pageTitle = isTerms
        ? 'Terms & Conditions'
        : isPrivacy
          ? 'Privacy Policy'
          : 'About TIJUM';

    useEffect(() => {
        if (slug !== 'about') {
            return;
        }

        setLoading(true);
        PublicApi.getPage('about')
            .then((res) => {
                setAboutTitle(res.data?.title || 'About TIJUM');
                setAboutExcerpt(res.data?.excerpt || '');
                setAboutBlocks(
                    Array.isArray(res.data?.content_blocks)
                        ? res.data.content_blocks
                        : [],
                );
            })
            .catch((err) => {
                setError(
                    err?.message ||
                        'Could not load the About page. Please try again later.',
                );
            })
            .finally(() => setLoading(false));
    }, [slug]);

    const sections = isTerms
        ? TERMS_SECTIONS
        : isPrivacy
          ? PRIVACY_SECTIONS
          : [];

    return (
        <>
            <Stack.Screen options={{ title: pageTitle }} />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
            >
                <View style={styles.hero}>
                    <Text style={styles.heroEyebrow}>
                        {isTerms
                            ? 'LEGAL & USER AGREEMENT'
                            : isPrivacy
                              ? 'DATA PROTECTION'
                              : 'OUR STORY'}
                    </Text>
                    <Text style={styles.heroTitle}>{pageTitle}</Text>
                    <Text style={styles.heroSubtitle}>
                        {isTerms
                            ? 'Marketplace terms, booking conditions, meal disclosures, and mutual responsibilities for guests and partners on TIJUM.'
                            : isPrivacy
                              ? 'How TIJUM collects, uses, protects, and shares your personal information.'
                              : 'Stay easy. Eat well. Spend less.'}
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator color={Colors.coral} />
                    </View>
                ) : null}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {sections.map((section) => (
                    <View key={section.title} style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        {section.intro ? (
                            <Text style={styles.sectionIntro}>
                                {section.intro}
                            </Text>
                        ) : null}
                        {section.bullets.map((bullet) => (
                            <View key={bullet} style={styles.bulletRow}>
                                <View style={styles.bulletDot} />
                                <Text style={styles.bulletText}>{bullet}</Text>
                            </View>
                        ))}
                    </View>
                ))}

                {slug === 'about' && !loading ? (
                    <>
                        {aboutExcerpt ? (
                            <Text style={styles.aboutExcerpt}>
                                {aboutExcerpt}
                            </Text>
                        ) : null}
                        {aboutBlocks.map((block, index) => {
                            const data = block?.data || {};
                            if (block?.type === 'hero') {
                                return (
                                    <View
                                        key={index}
                                        style={styles.sectionCard}
                                    >
                                        {data.badge ? (
                                            <Text style={styles.badgeText}>
                                                {data.badge}
                                            </Text>
                                        ) : null}
                                        <Text style={styles.sectionTitle}>
                                            {data.title || aboutTitle}
                                        </Text>
                                        {data.subtitle ? (
                                            <Text style={styles.sectionIntro}>
                                                {data.subtitle}
                                            </Text>
                                        ) : null}
                                    </View>
                                );
                            }
                            if (block?.type === 'text') {
                                return (
                                    <View
                                        key={index}
                                        style={styles.sectionCard}
                                    >
                                        {data.heading ? (
                                            <Text style={styles.sectionTitle}>
                                                {data.heading}
                                            </Text>
                                        ) : null}
                                        {data.body ? (
                                            <Text style={styles.paragraph}>
                                                {stripHtml(String(data.body))}
                                            </Text>
                                        ) : null}
                                    </View>
                                );
                            }
                            if (block?.type === 'benefits') {
                                return (
                                    <View
                                        key={index}
                                        style={styles.sectionCard}
                                    >
                                        <Text style={styles.sectionTitle}>
                                            {data.heading || 'Why TIJUM'}
                                        </Text>
                                        {(data.items || []).map((item: any) => (
                                            <View
                                                key={item.title}
                                                style={styles.benefitRow}
                                            >
                                                <Text
                                                    style={styles.benefitTitle}
                                                >
                                                    {item.title}
                                                </Text>
                                                <Text
                                                    style={styles.benefitBody}
                                                >
                                                    {item.description}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                );
                            }
                            if (block?.type === 'cta') {
                                return (
                                    <View
                                        key={index}
                                        style={[
                                            styles.sectionCard,
                                            styles.ctaCard,
                                        ]}
                                    >
                                        <Text style={styles.ctaTitle}>
                                            {data.heading}
                                        </Text>
                                        <Text style={styles.ctaBody}>
                                            {data.description}
                                        </Text>
                                    </View>
                                );
                            }
                            return null;
                        })}
                    </>
                ) : null}

                <Text style={styles.footerText}>
                    Questions? Write to support@tijum.com or call +91 81423
                    34033 (9:00 AM – 9:00 PM IST, Mon–Sat).
                </Text>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.canvas,
    },
    content: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxl,
    },
    hero: {
        backgroundColor: Colors.deepPlum,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.base,
    },
    heroEyebrow: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.4,
        color: Colors.softPeach,
        marginBottom: 6,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.white,
    },
    heroSubtitle: {
        fontSize: 13,
        lineHeight: 19,
        color: Colors.warmCream,
        marginTop: Spacing.xs,
        opacity: 0.9,
    },
    center: {
        paddingVertical: Spacing.xl,
        alignItems: 'center',
    },
    errorText: {
        color: Colors.rose,
        fontSize: 13,
        marginBottom: Spacing.base,
    },
    sectionCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: Spacing.base,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginBottom: Spacing.xs,
    },
    sectionIntro: {
        fontSize: 13,
        lineHeight: 19,
        color: Colors.inkSecondary,
        marginBottom: Spacing.sm,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        gap: 8,
    },
    bulletDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: Colors.coral,
        marginTop: 7,
    },
    bulletText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
        color: Colors.inkSecondary,
    },
    paragraph: {
        fontSize: 13,
        lineHeight: 20,
        color: Colors.inkSecondary,
    },
    aboutExcerpt: {
        fontSize: 14,
        lineHeight: 21,
        color: Colors.inkSecondary,
        marginBottom: Spacing.base,
    },
    badgeText: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.peachCream,
        color: Colors.coralDark,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.6,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    benefitRow: {
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
        paddingTop: Spacing.sm,
        marginTop: Spacing.sm,
    },
    benefitTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    benefitBody: {
        fontSize: 13,
        lineHeight: 19,
        color: Colors.inkSecondary,
        marginTop: 2,
    },
    ctaCard: {
        backgroundColor: Colors.peachCream,
        borderColor: Colors.peachSoft,
    },
    ctaTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.deepPlum,
    },
    ctaBody: {
        fontSize: 13,
        lineHeight: 19,
        color: Colors.inkSecondary,
        marginTop: 4,
    },
    footerText: {
        fontSize: 12,
        lineHeight: 18,
        color: Colors.inkMuted,
        textAlign: 'center',
        marginTop: Spacing.base,
    },
});
