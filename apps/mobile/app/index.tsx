import React, { useEffect } from 'react';
import {
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
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { Button } from '../src/components/Button';
import { Colors } from '../src/theme/colors';
import { BorderRadius, Spacing } from '../src/theme/spacing';
import { Typography } from '../src/theme/typography';

export default function WelcomeScreen() {
    const router = useRouter();
    const { token, accountType, isLoading } = useAuth();

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
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <View style={styles.logoBadge}>
                        <Text style={styles.logoText}>TIJUM</Text>
                    </View>
                    <Text style={styles.tagline}>
                        Stay easy. Eat well. Spend less.
                    </Text>
                    <Text style={styles.subtitle}>
                        Verified accommodations with transparent meal
                        disclosures across South India.
                    </Text>
                </View>

                <View style={styles.cardContainer}>
                    <View style={styles.heroFeatureCard}>
                        <View style={styles.featureHeaderRow}>
                            <UtensilsCrossed
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 8 }}
                            />
                            <Text style={styles.featureTitle}>
                                Transparent Meal Disclosures
                            </Text>
                        </View>
                        <Text style={styles.featureDesc}>
                            See exact breakfast, lunch, and dinner inclusions
                            before booking. Transparent food arrangements with
                            no messy tiffins or surprise broker fees.
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
                                        color={Colors.coral}
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text style={styles.cityPillText}>{c}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

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
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerNotice}>
                        Standard Timing Policy: 09:00 AM Check-In • 08:00 AM
                        Checkout
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.cream,
    },
    container: {
        padding: Spacing.xl,
        flexGrow: 1,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    logoBadge: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.base,
        marginBottom: Spacing.md,
    },
    logoText: {
        color: Colors.white,
        fontSize: Typography.fontSize.hero,
        fontWeight: '900',
        letterSpacing: 2,
    },
    tagline: {
        fontSize: Typography.fontSize.xl,
        fontWeight: '800',
        color: Colors.deepPlum,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        textAlign: 'center',
        maxWidth: 320,
        lineHeight: 20,
    },
    cardContainer: {
        marginVertical: Spacing.xl,
    },
    heroFeatureCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.neutralSurface,
        marginBottom: Spacing.xl,
    },
    featureHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    featureTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.gray900,
        marginBottom: Spacing.xs,
    },
    featureDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        lineHeight: 18,
        marginBottom: Spacing.md,
    },
    cityPillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    cityPill: {
        backgroundColor: Colors.cream,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.neutralSurface,
    },
    cityPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.deepPlum,
    },
    actionSection: {
        gap: Spacing.sm,
    },
    actionPrompt: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        color: Colors.gray500,
        textAlign: 'center',
        marginBottom: Spacing.xs,
        letterSpacing: 0.5,
    },
    primaryButton: {
        shadowColor: Colors.deepPlum,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    secondaryButton: {
        backgroundColor: Colors.white,
    },
    ghostButton: {
        marginTop: Spacing.xs,
    },
    channelsCard: {
        marginTop: Spacing.lg,
        padding: Spacing.md,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.neutralSurface,
        alignItems: 'center',
    },
    channelsTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: Colors.deepPlum,
        marginBottom: 2,
    },
    channelsSubtitle: {
        fontSize: 11,
        color: Colors.gray500,
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
        color: Colors.gray500,
        textAlign: 'center',
        fontWeight: '600',
    },
});
