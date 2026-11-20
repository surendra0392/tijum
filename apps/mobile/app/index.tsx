import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
} from 'react-native';
import {
    BedDouble,
    Utensils,
    Home,
    Bell,
    ArrowRight,
    Building2,
    ShieldCheck,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { PushNotificationService } from '../src/notifications/PushNotificationService';
import { Colors } from '../src/theme/colors';
import { BorderRadius, Spacing } from '../src/theme/spacing';
import { Typography } from '../src/theme/typography';

const { width, height } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
    {
        id: 'stays',
        title: 'Comfortable Stays',
        subtitle: 'Hostels, PGs, Homestays & Co-living spaces',
        Icon: BedDouble,
        imageUrl:
            'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    },
    {
        id: 'food',
        title: 'Delicious Food',
        subtitle: 'Nutritious meals, when you need them',
        Icon: Utensils,
        imageUrl:
            'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80',
    },
    {
        id: 'home',
        title: 'A Feeling of Home',
        subtitle: 'Safe, secure and trusted accommodation',
        Icon: Home,
        imageUrl:
            'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80',
    },
    {
        id: 'permissions',
        title: 'Stay Updated',
        subtitle: 'Get the latest offers, booking updates and more.',
        note: "We'll ask for permission to send notifications.",
        Icon: Bell,
        isPermissionSlide: true,
        imageUrl: '',
    },
];

export default function WelcomeScreen() {
    const router = useRouter();
    const { token, accountType, isLoading } = useAuth();
    const [activeSlide, setActiveSlide] = useState(0);

    useEffect(() => {
        // Request install permissions on launch
        PushNotificationService.requestInitialPermissionsOnInstall().catch(() => {});
        if (
            Platform.OS === 'web' &&
            typeof window !== 'undefined' &&
            'Notification' in window &&
            (window as any).Notification.permission === 'default'
        ) {
            (window as any).Notification.requestPermission().catch(() => {});
        }
        if (
            Platform.OS === 'web' &&
            typeof navigator !== 'undefined' &&
            'geolocation' in navigator
        ) {
            navigator.geolocation.getCurrentPosition(() => {}, () => {});
        }
    }, []);

    useEffect(() => {
        if (!isLoading && token && accountType) {
            if (accountType === 'customer') {
                router.replace('/(customer)/explore');
            } else if (accountType === 'partner') {
                router.replace('/(partner)/dashboard');
            }
        }
    }, [isLoading, token, accountType]);

    const handleNext = () => {
        if (activeSlide < ONBOARDING_SLIDES.length - 1) {
            setActiveSlide(activeSlide + 1);
        } else {
            handlePermissionContinue();
        }
    };

    const requestAllPermissions = async () => {
        try {
            await PushNotificationService.requestInitialPermissionsOnInstall();
        } catch {}

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            try {
                if ('Notification' in window && (window as any).Notification.permission === 'default') {
                    await (window as any).Notification.requestPermission();
                }
            } catch {}
            try {
                if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
                    await new Promise<void>((resolve) => {
                        navigator.geolocation.getCurrentPosition(
                            () => resolve(),
                            () => resolve(),
                            { timeout: 3000, enableHighAccuracy: false }
                        );
                    });
                }
            } catch {}
        }
    };

    const handlePermissionContinue = async () => {
        await requestAllPermissions();
        router.replace('/(customer)/explore');
    };

    const handleSkip = async () => {
        await requestAllPermissions();
        router.replace('/(customer)/explore');
    };

    const currentSlide = ONBOARDING_SLIDES[activeSlide];
    const isPermissionSlide = currentSlide.isPermissionSlide;
    const CurrentIcon = currentSlide.Icon;

    return (
        <View style={styles.container}>
            {/* Top Half: Visual Hero Image or Illustration */}
            <View style={styles.topHeroContainer}>
                {isPermissionSlide ? (
                    <View style={styles.permissionGraphicContainer}>
                        {/* Phone Illustration with Bell */}
                        <View style={styles.phoneIllustration}>
                            <View style={styles.phoneSpeakerBar} />
                            <View style={styles.phoneBellCircle}>
                                <Bell size={42} color={Colors.coral} />
                            </View>
                            <View style={styles.phoneHomeIndicator} />
                        </View>
                    </View>
                ) : (
                    <Image
                        source={{ uri: currentSlide.imageUrl }}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                )}

                {/* Top Bar with Brand Logo and Skip */}
                <SafeAreaView style={styles.topBarSafe}>
                    <View style={styles.topBar}>
                        <View style={styles.logoBadge}>
                            <Text style={styles.logoText}>TIJUM</Text>
                            <Text style={styles.logoSubtext}>Stay • Dine • Belong</Text>
                        </View>
                        {!isPermissionSlide && (
                            <TouchableOpacity
                                style={styles.skipBtn}
                                onPress={() => setActiveSlide(ONBOARDING_SLIDES.length - 1)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.skipBtnText}>Skip</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </SafeAreaView>
            </View>

            {/* Bottom Half: Curved Scallop Card with Content */}
            <View style={styles.bottomCard}>
                {/* Floating Round Coral Icon Badge */}
                <View style={styles.floatingBadge}>
                    <CurrentIcon size={26} color={Colors.white} />
                </View>

                {/* Content Area */}
                <View style={styles.contentArea}>
                    <Text style={styles.slideTitle}>{currentSlide.title}</Text>

                    {isPermissionSlide ? (
                        <View style={styles.permissionCardsBox}>
                            <View style={styles.permissionItem}>
                                <View style={[styles.permissionIconBadge, { backgroundColor: '#FFF3EA' }]}>
                                    <Bell size={18} color={Colors.coral} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.permissionItemTitle}>Push Notifications</Text>
                                    <Text style={styles.permissionItemSubtitle}>
                                        Booking confirmations, check-in codes & meal timing alerts
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.permissionItem}>
                                <View style={[styles.permissionIconBadge, { backgroundColor: '#EFF6FF' }]}>
                                    <Home size={18} color="#2563EB" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.permissionItemTitle}>Nearby Stays Discovery</Text>
                                    <Text style={styles.permissionItemSubtitle}>
                                        Explore verified hostels, homestays, and co-living closest to you
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.slideSubtitle}>{currentSlide.subtitle}</Text>
                            {currentSlide.note && (
                                <Text style={styles.slideNote}>{currentSlide.note}</Text>
                            )}
                        </>
                    )}

                    {/* Dot Pagination Indicators */}
                    <View style={styles.indicatorRow}>
                        {ONBOARDING_SLIDES.map((slide, idx) => (
                            <View
                                key={slide.id}
                                style={[
                                    styles.dot,
                                    activeSlide === idx
                                        ? styles.activeDot
                                        : styles.inactiveDot,
                                ]}
                            />
                        ))}
                    </View>

                    {/* Primary Action Button */}
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={isPermissionSlide ? handlePermissionContinue : handleNext}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryButtonText}>
                            {isPermissionSlide
                                ? 'Allow Permissions & Get Started'
                                : 'Next →'}
                        </Text>
                    </TouchableOpacity>

                    {/* Secondary Navigation Options */}
                    {isPermissionSlide ? (
                        <TouchableOpacity
                            style={styles.secondaryTextBtn}
                            onPress={handleSkip}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.secondaryText}>Skip</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.footerLinksRow}>
                            <TouchableOpacity
                                onPress={() => router.push('/(auth)/customer-login')}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.linkText}>
                                    Have an account?{' '}
                                    <Text style={styles.linkTextHighlight}>Sign In</Text>
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => router.push('/(auth)/owner-login')}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.partnerLinkText}>
                                    Host Portal →
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.deepPlum,
    },
    topHeroContainer: {
        height: height * 0.52,
        width: '100%',
        position: 'relative',
        backgroundColor: Colors.deepPlum,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    topBarSafe: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Platform.OS === 'android' ? 16 : 8,
    },
    logoBadge: {
        backgroundColor: 'rgba(68, 47, 65, 0.85)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    logoText: {
        color: Colors.white,
        fontWeight: '800',
        fontSize: 16,
        letterSpacing: 1.5,
    },
    logoSubtext: {
        color: Colors.coral,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    skipBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 16,
    },
    skipBtnText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 13,
    },
    permissionGraphicContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#352132',
    },
    phoneIllustration: {
        width: 140,
        height: 220,
        borderRadius: 24,
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    phoneSpeakerBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        position: 'absolute',
        top: 12,
    },
    phoneBellCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 122, 103, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    phoneHomeIndicator: {
        width: 50,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        position: 'absolute',
        bottom: 10,
    },
    bottomCard: {
        flex: 1,
        backgroundColor: Colors.warmOffWhite,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        marginTop: -32,
        position: 'relative',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl + 12,
        alignItems: 'center',
    },
    floatingBadge: {
        position: 'absolute',
        top: -26,
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: Colors.coral,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 6,
    },
    contentArea: {
        width: '100%',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'space-between',
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    },
    slideTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.deepPlum,
        textAlign: 'center',
        marginTop: 6,
    },
    slideSubtitle: {
        fontSize: 15,
        color: Colors.gray600,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
        paddingHorizontal: Spacing.md,
    },
    slideNote: {
        fontSize: 12,
        color: Colors.gray400,
        textAlign: 'center',
        marginTop: 4,
    },
    indicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.md,
    },
    dot: {
        height: 6,
        borderRadius: 3,
        marginHorizontal: 3,
    },
    activeDot: {
        width: 22,
        backgroundColor: Colors.coral,
    },
    inactiveDot: {
        width: 6,
        backgroundColor: Colors.gray300,
    },
    primaryButton: {
        width: '100%',
        height: 52,
        backgroundColor: Colors.deepPlum,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryButtonText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 16,
    },
    secondaryTextBtn: {
        paddingVertical: Spacing.sm,
    },
    secondaryText: {
        color: Colors.gray500,
        fontWeight: '600',
        fontSize: 14,
    },
    footerLinksRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.xs,
    },
    linkText: {
        fontSize: 13,
        color: Colors.gray600,
    },
    linkTextHighlight: {
        color: Colors.coral,
        fontWeight: '700',
    },
    partnerLinkText: {
        fontSize: 13,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    permissionCardsBox: {
        width: '100%',
        marginTop: 6,
        marginBottom: 8,
        gap: 8,
    },
    permissionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.warmOffWhite,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    permissionIconBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    permissionItemTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    permissionItemSubtitle: {
        fontSize: 11,
        color: Colors.inkSecondary,
        marginTop: 1,
    },
});
