import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { BedDouble, Utensils, Home, Bell, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../src/auth/AuthContext';
import { BrandLogo } from '../src/components/BrandLogo';
import { PushNotificationService } from '../src/notifications/PushNotificationService';
import { Colors } from '../src/theme/colors';
import { BorderRadius, Spacing } from '../src/theme/spacing';
import { Typography } from '../src/theme/typography';

const ONBOARDING_COMPLETED_KEY = 'tijum_onboarding_completed_v1';

async function getOnboardingCompleted(): Promise<boolean> {
    try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            return (
                window.localStorage?.getItem(ONBOARDING_COMPLETED_KEY) === '1'
            );
        }
        const val = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
        return val === '1';
    } catch {
        return false;
    }
}

async function markOnboardingCompleted(): Promise<void> {
    try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.localStorage?.setItem(ONBOARDING_COMPLETED_KEY, '1');
            return;
        }
        await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, '1');
    } catch {
        // Non-critical preference write
    }
}

const ONBOARDING_SLIDES = [
    {
        id: 'stays',
        title: 'Comfortable Stays',
        subtitle: 'Hostels, PGs, Homestays & Co-living spaces',
        Icon: BedDouble,
        image: require('../assets/onboarding/stays.jpg'),
    },
    {
        id: 'food',
        title: 'Delicious Food',
        subtitle: 'Nutritious meals, when you need them',
        Icon: Utensils,
        image: require('../assets/onboarding/food.jpg'),
    },
    {
        id: 'home',
        title: 'A Feeling of Home',
        subtitle: 'Safe, secure and trusted accommodation',
        Icon: Home,
        image: require('../assets/onboarding/home.jpg'),
    },
    {
        id: 'permissions',
        title: 'Stay Updated',
        subtitle: 'Get the latest offers, booking updates and more.',
        note: "We'll ask for permission to send notifications.",
        Icon: Bell,
        isPermissionSlide: true,
        image: null,
    },
];

export default function WelcomeScreen() {
    const router = useRouter();
    const { height } = useWindowDimensions();
    const { token, accountType, isLoading } = useAuth();
    const [activeSlide, setActiveSlide] = useState(0);
    const [checkingGate, setCheckingGate] = useState(true);

    useEffect(() => {
        if (isLoading) {
            return;
        }

        if (token && accountType) {
            router.replace(
                accountType === 'partner'
                    ? '/(partner)/dashboard'
                    : '/(customer)/explore',
            );
            return;
        }

        let cancelled = false;
        void getOnboardingCompleted().then((completed) => {
            if (cancelled) {
                return;
            }
            if (completed) {
                router.replace('/(customer)/explore');
            } else {
                setCheckingGate(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [isLoading, token, accountType, router]);

    const handleNext = () => {
        if (activeSlide < ONBOARDING_SLIDES.length - 1) {
            setActiveSlide(activeSlide + 1);
        } else {
            void handlePermissionContinue();
        }
    };

    const requestAllPermissions = async () => {
        let granted = false;
        try {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                if (
                    'Notification' in window &&
                    (window as any).Notification.permission === 'default'
                ) {
                    const permission = await (
                        window as any
                    ).Notification.requestPermission();
                    granted = permission === 'granted';
                } else if ('Notification' in window) {
                    granted =
                        (window as any).Notification.permission === 'granted';
                }
            } else {
                granted =
                    await PushNotificationService.requestInitialPermissionsOnInstall();
            }
        } catch {
            granted = false;
        }

        if (!granted) {
            Alert.alert(
                'Notifications Not Enabled',
                'You can enable notifications later from notification settings.',
            );
        }
    };

    const goToAccountHome = async () => {
        await markOnboardingCompleted();
        router.replace(
            accountType === 'partner'
                ? '/(partner)/dashboard'
                : '/(customer)/explore',
        );
    };

    const handlePermissionContinue = async () => {
        await requestAllPermissions();
        await goToAccountHome();
    };

    const handleSkip = () => {
        goToAccountHome().catch(() => {});
    };

    if (isLoading || checkingGate) {
        return (
            <View style={styles.splashLoading}>
                <StatusBar style="light" />
                <BrandLogo size={214} tone="light" />
                <ActivityIndicator
                    color={Colors.coral}
                    size="small"
                    style={{ marginTop: Spacing.lg }}
                />
            </View>
        );
    }

    const heroHeight = Math.min(Math.max(height * 0.44, 240), 420);
    const currentSlide = ONBOARDING_SLIDES[activeSlide];
    const isPermissionSlide = currentSlide.isPermissionSlide;
    const CurrentIcon = currentSlide.Icon;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            {/* Top Half: Visual Hero Image or Illustration */}
            <View style={[styles.topHeroContainer, { height: heroHeight }]}>
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
                        source={currentSlide.image}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                )}

                {/* Top Bar with Brand Logo and Skip */}
                <SafeAreaView edges={['top']} style={styles.topBarSafe}>
                    <View style={styles.topBar}>
                        <View style={styles.logoBadge}>
                            <BrandLogo size={128} tone="light" />
                        </View>
                        {!isPermissionSlide && (
                            <TouchableOpacity
                                style={styles.skipBtn}
                                testID="onboarding-skip-btn"
                                accessibilityLabel="Skip onboarding"
                                accessibilityRole="button"
                                onPress={() =>
                                    setActiveSlide(ONBOARDING_SLIDES.length - 1)
                                }
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
                    <CurrentIcon size={26} color={Colors.deepPlum} />
                </View>

                <ScrollView
                    style={styles.bottomScroll}
                    contentContainerStyle={styles.contentArea}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.slideTitle}>{currentSlide.title}</Text>

                    {isPermissionSlide ? (
                        <View style={styles.permissionCardsBox}>
                            <View style={styles.permissionItem}>
                                <View
                                    style={[
                                        styles.permissionIconBadge,
                                        { backgroundColor: Colors.peachSoft },
                                    ]}
                                >
                                    <Bell
                                        size={18}
                                        color={Colors.coralDark}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.permissionItemTitle}>
                                        Booking & Stay Alerts
                                    </Text>
                                    <Text style={styles.permissionItemSubtitle}>
                                        Payment confirmations, check-in room
                                        assignments & support updates
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.permissionItem}>
                                <View
                                    style={[
                                        styles.permissionIconBadge,
                                        { backgroundColor: Colors.emeraldLight },
                                    ]}
                                >
                                    <CheckCircle2
                                        size={18}
                                        color={Colors.successText}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.permissionItemTitle}>
                                        Verified Stays & Meal Disclosures
                                    </Text>
                                    <Text style={styles.permissionItemSubtitle}>
                                        Browse hostels, homestays & co-living
                                        spaces with clear inclusions
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.slideSubtitle}>
                                {currentSlide.subtitle}
                            </Text>
                            {currentSlide.note && (
                                <Text style={styles.slideNote}>
                                    {currentSlide.note}
                                </Text>
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
                        testID="onboarding-primary-btn"
                        accessibilityRole="button"
                        accessibilityLabel={
                            isPermissionSlide
                                ? 'Enable Notifications and Continue'
                                : 'Next onboarding slide'
                        }
                        onPress={
                            isPermissionSlide
                                ? handlePermissionContinue
                                : handleNext
                        }
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryButtonText}>
                            {isPermissionSlide
                                ? 'Enable Alerts & Explore Stays'
                                : 'Next →'}
                        </Text>
                    </TouchableOpacity>

                    {/* Secondary Navigation Options */}
                    {isPermissionSlide ? (
                        <TouchableOpacity
                            style={styles.secondaryTextBtn}
                            testID="onboarding-skip-permission-btn"
                            accessibilityRole="button"
                            accessibilityLabel="Continue without enabling notifications"
                            onPress={handleSkip}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.secondaryText}>
                                Skip for now
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.footerLinksRow}>
                            <TouchableOpacity
                                style={styles.footerLinkBtn}
                                accessibilityRole="button"
                                onPress={() => {
                                    void markOnboardingCompleted();
                                    router.push('/(auth)/customer-login');
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.linkText}>
                                    Have an account?{' '}
                                    <Text style={styles.linkTextHighlight}>
                                        Sign In
                                    </Text>
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.footerLinkBtn}
                                accessibilityRole="button"
                                onPress={() => {
                                    void markOnboardingCompleted();
                                    router.push('/(auth)/owner-login');
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.partnerLinkText}>
                                    Host Portal →
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    splashLoading: {
        flex: 1,
        backgroundColor: Colors.deepPlum,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        backgroundColor: Colors.deepPlum,
    },
    topHeroContainer: {
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
    skipBtn: {
        backgroundColor: 'rgba(38, 24, 36, 0.72)',
        minHeight: 44,
        minWidth: 64,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipBtnText: {
        color: Colors.white,
        fontFamily: Typography.fontFamily.bodyBold,
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
        backgroundColor: Colors.cream,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        marginTop: -32,
        position: 'relative',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl + 16,
        alignItems: 'center',
    },
    bottomScroll: {
        width: '100%',
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
        flexGrow: 1,
        justifyContent: 'space-between',
        paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    },
    slideTitle: {
        fontFamily: Typography.fontFamily.heading,
        fontSize: 24,
        color: Colors.deepPlum,
        textAlign: 'center',
        marginTop: 6,
    },
    slideSubtitle: {
        fontFamily: Typography.fontFamily.body,
        fontSize: 15,
        color: Colors.inkSecondary,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
        paddingHorizontal: Spacing.md,
    },
    slideNote: {
        fontFamily: Typography.fontFamily.body,
        fontSize: 12,
        color: Colors.inkMuted,
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
        backgroundColor: Colors.deepPlum,
    },
    inactiveDot: {
        width: 6,
        backgroundColor: Colors.gray300,
    },
    primaryButton: {
        width: '100%',
        minHeight: 52,
        backgroundColor: Colors.deepPlum,
        borderRadius: BorderRadius.pill,
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
        fontFamily: Typography.fontFamily.heading,
        fontSize: 16,
    },
    secondaryTextBtn: {
        minHeight: 48,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryText: {
        color: Colors.inkSecondary,
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: 14,
    },
    footerLinksRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.xs,
    },
    footerLinkBtn: {
        minHeight: 48,
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    linkText: {
        fontFamily: Typography.fontFamily.body,
        fontSize: 13,
        color: Colors.inkSecondary,
    },
    linkTextHighlight: {
        color: Colors.coralDark,
        fontFamily: Typography.fontFamily.bodyBold,
    },
    partnerLinkText: {
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: 13,
        color: Colors.deepPlum,
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
