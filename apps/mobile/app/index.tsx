import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Image,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    UtensilsCrossed,
    MapPin,
    MessageCircle,
    Instagram,
    Facebook,
    Bed,
    HeartHandshake,
    ShieldCheck,
    ArrowRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { Button } from '../src/components/Button';
import { Colors } from '../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../src/theme/spacing';
import { Typography } from '../src/theme/typography';

const CAROUSEL_SLIDES = [
    {
        id: 1,
        title: 'Comfortable Stays',
        desc: 'Verified hostels, homestays, and co-living spaces tailored for students and professionals across South India.',
        Icon: Bed,
    },
    {
        id: 2,
        title: 'Delicious Food',
        desc: 'Enjoy verified, hygienic meals declared clearly per stay. Transparent food arrangements with no surprises.',
        Icon: UtensilsCrossed,
    },
    {
        id: 3,
        title: 'A Feeling of Home',
        desc: 'Safe, secure, and community-driven living spaces with zero broker fees and verified property owners.',
        Icon: HeartHandshake,
    },
];

export default function WelcomeScreen() {
    const router = useRouter();
    const { token, accountType, isLoading } = useAuth();
    const [activeSlide, setActiveSlide] = useState(0);

    useEffect(() => {
        if (!isLoading && token && accountType) {
            if (accountType === 'customer') {
                router.replace('/(customer)/explore');
            } else if (accountType === 'partner') {
                router.replace('/(partner)/dashboard');
            }
        }
    }, [isLoading, token, accountType]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                {/* Brand Header */}
                <View style={styles.header}>
                    <View style={styles.logoBadge}>
                        <View style={styles.roofAccent} />
                        <Text style={styles.logoText}>TIJUM</Text>
                    </View>
                    <Text style={styles.tagline}>
                        Stay easy. Eat well. Spend less.
                    </Text>
                    <Text style={styles.subtitle}>
                        Verified accommodations with transparent meal disclosures across South India.
                    </Text>
                </View>

                {/* 3-Step Value Proposition Showcase */}
                <View style={styles.carouselCard}>
                    <View style={styles.carouselHeaderRow}>
                        {(() => {
                            const CurrentIcon = CAROUSEL_SLIDES[activeSlide].Icon;
                            return (
                                <View style={styles.carouselIconCircle}>
                                    <CurrentIcon size={22} color={Colors.coralPrimary} />
                                </View>
                            );
                        })()}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.carouselSlideTitle}>
                                {CAROUSEL_SLIDES[activeSlide].title}
                            </Text>
                            <Text style={styles.carouselSlideDesc}>
                                {CAROUSEL_SLIDES[activeSlide].desc}
                            </Text>
                        </View>
                    </View>

                    {/* Pagination Indicators */}
                    <View style={styles.indicatorRow}>
                        {CAROUSEL_SLIDES.map((slide, idx) => (
                            <TouchableOpacity
                                key={slide.id}
                                style={[
                                    styles.dot,
                                    activeSlide === idx ? styles.activeDot : styles.inactiveDot,
                                ]}
                                onPress={() => setActiveSlide(idx)}
                            />
                        ))}
                    </View>
                </View>

                {/* Hero Feature Card: Transparent Meal Disclosures */}
                <View style={styles.heroFeatureCard}>
                    <View style={styles.featureHeaderRow}>
                        <UtensilsCrossed
                            size={18}
                            color={Colors.plumDeep}
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.featureTitle}>
                            Transparent Meal Disclosures
                        </Text>
                    </View>
                    <Text style={styles.featureDesc}>
                        See exact breakfast, lunch, and dinner inclusions before booking.
                        Transparent food arrangements with no messy tiffins or surprise broker fees.
                    </Text>
                    <View style={styles.cityPillRow}>
                        {[
                            'Hyderabad',
                            'Guntur',
                            'Vijayawada',
                            'Visakhapatnam',
                        ].map((c) => (
                            <View key={c} style={styles.cityPill}>
                                <MapPin
                                    size={11}
                                    color={Colors.coralPrimary}
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={styles.cityPillText}>{c}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Action Section: Account Selection */}
                <View style={styles.actionSection}>
                    <Text style={styles.actionPrompt}>
                        Select your account experience:
                    </Text>

                    <Button
                        title="Continue as Customer"
                        variant="primary"
                        size="lg"
                        onPress={() => router.push('/(customer)/explore')}
                        style={styles.primaryButton}
                    />

                    <Button
                        title="Continue as Accommodation Partner"
                        variant="outline"
                        size="lg"
                        onPress={() => router.push('/(auth)/owner-login')}
                        style={styles.secondaryButton}
                    />

                    <Button
                        title="Browse Stays without Account"
                        variant="ghost"
                        size="md"
                        onPress={() => router.push('/(customer)/explore')}
                        style={styles.ghostButton}
                    />
                </View>

                {/* Official Channels & Social Touchpoints */}
                <View style={styles.channelsCard}>
                    <Text style={styles.channelsTitle}>Official Channels</Text>
                    <Text style={styles.channelsSubtitle}>
                        Helpline & Chat: 9:00 AM – 9:00 PM IST (Mon–Sat)
                    </Text>
                    <View style={styles.channelsRow}>
                        <TouchableOpacity
                            style={[styles.channelChip, styles.whatsappChip]}
                            onPress={() =>
                                Linking.openURL('https://wa.me/918142334033')
                            }
                            activeOpacity={0.8}
                        >
                            <MessageCircle
                                size={15}
                                color="#25D366"
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.whatsappChipText}>
                                WhatsApp
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.channelChip, styles.instagramChip]}
                            onPress={() =>
                                Linking.openURL(
                                    'https://instagram.com/tijum.official',
                                )
                            }
                            activeOpacity={0.8}
                        >
                            <Instagram
                                size={15}
                                color="#E1306C"
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.instagramChipText}>
                                Instagram
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.channelChip, styles.facebookChip]}
                            onPress={() =>
                                Linking.openURL(
                                    'https://facebook.com/tijum.official',
                                )
                            }
                            activeOpacity={0.8}
                        >
                            <Facebook
                                size={15}
                                color="#1877F2"
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.facebookChipText}>
                                Facebook
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Footer Standard Timing Policy */}
                <View style={styles.footer}>
                    <Text style={styles.footerNotice}>
                        Standard Timing Policy: 09:00 AM Check-In • 08:00 AM Checkout
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.canvas,
    },
    container: {
        padding: Spacing.xl,
        flexGrow: 1,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    logoBadge: {
        backgroundColor: Colors.plumDeep,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.base,
        marginBottom: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        ...Shadows.subtle,
    },
    roofAccent: {
        width: 10,
        height: 10,
        backgroundColor: Colors.coralPrimary,
        borderRadius: 2,
        transform: [{ rotate: '45deg' }],
        marginRight: 8,
    },
    logoText: {
        color: Colors.white,
        fontSize: Typography.fontSize.title,
        fontWeight: '900',
        letterSpacing: 2,
    },
    tagline: {
        fontSize: Typography.fontSize.xl,
        fontWeight: '800',
        color: Colors.plumDeep,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.inkSecondary,
        textAlign: 'center',
        maxWidth: 320,
        lineHeight: 20,
    },
    carouselCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        marginVertical: Spacing.base,
        ...Shadows.subtle,
    },
    carouselHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    carouselIconCircle: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.pill,
        backgroundColor: Colors.peachSoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    carouselSlideTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.inkPrimary,
        marginBottom: 2,
    },
    carouselSlideDesc: {
        fontSize: 12,
        lineHeight: 18,
        color: Colors.inkSecondary,
    },
    indicatorRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: Spacing.md,
    },
    dot: {
        height: 5,
        borderRadius: BorderRadius.pill,
    },
    activeDot: {
        width: 22,
        backgroundColor: Colors.coralPrimary,
    },
    inactiveDot: {
        width: 6,
        backgroundColor: Colors.borderStrong,
    },
    heroFeatureCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        marginBottom: Spacing.base,
        ...Shadows.subtle,
    },
    featureHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    featureTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.inkPrimary,
        marginBottom: Spacing.xs,
    },
    featureDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.inkSecondary,
        lineHeight: 18,
        marginBottom: Spacing.md,
    },
    cityPillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    cityPill: {
        backgroundColor: Colors.peachCream,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.peachSoft,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cityPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.plumDeep,
    },
    actionSection: {
        gap: Spacing.sm,
        marginVertical: Spacing.sm,
    },
    actionPrompt: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        color: Colors.inkMuted,
        textAlign: 'center',
        marginBottom: Spacing.xs,
        letterSpacing: 0.5,
    },
    primaryButton: {
        backgroundColor: Colors.plumPrimary,
        borderRadius: BorderRadius.pill,
        ...Shadows.subtle,
    },
    secondaryButton: {
        backgroundColor: Colors.white,
        borderColor: Colors.borderStrong,
        borderRadius: BorderRadius.pill,
    },
    ghostButton: {
        marginTop: Spacing.xs,
    },
    channelsCard: {
        marginTop: Spacing.md,
        padding: Spacing.md,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        alignItems: 'center',
        ...Shadows.subtle,
    },
    channelsTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: Colors.plumDeep,
        marginBottom: 2,
    },
    channelsSubtitle: {
        fontSize: 11,
        color: Colors.inkMuted,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    channelsRow: {
        flexDirection: 'row',
        gap: Spacing.xs,
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    channelChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    whatsappChip: {
        backgroundColor: '#F0FDF4',
        borderColor: '#BBF7D0',
    },
    whatsappChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#166534',
    },
    instagramChip: {
        backgroundColor: '#FDF2F8',
        borderColor: '#FBCFE8',
    },
    instagramChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9D174D',
    },
    facebookChip: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    facebookChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1E40AF',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    footerNotice: {
        fontSize: 11,
        color: Colors.inkMuted,
        textAlign: 'center',
        fontWeight: '600',
    },
});
