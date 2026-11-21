import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, Heart, Star, ChevronLeft } from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { PropertyCard as PropertyCardType } from '../../../src/api/types';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';

export default function WishlistScreen() {
    const router = useRouter();
    const { token, authState, isLoading: authLoading } = useAuth();
    const [properties, setProperties] = useState<PropertyCardType[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const isGuest =
        !token || authState === 'guest' || authState === 'session_expired';

    const loadWishlist = async () => {
        if (isGuest) return;
        try {
            setLoading(true);
            setErrorMessage(null);
            const res = await CustomerApi.getWishlist();
            setProperties(res.data ?? []);
        } catch (loadError: unknown) {
            setErrorMessage(
                loadError instanceof Error
                    ? loadError.message
                    : 'Unable to load your wishlist. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isGuest) {
            void loadWishlist();
        }
    }, [isGuest]);

    const handleRemove = (propertyId: number) => {
        setProperties((prev) => prev.filter((p) => p.id !== propertyId));
        if (!isGuest) {
            CustomerApi.toggleWishlist(propertyId).catch(() => {});
        }
    };

    const renderGridItem = ({ item }: { item: PropertyCardType }) => {
        const rawPrice =
            item.starting_price_monthly_paise !== null
                ? item.starting_price_monthly_paise / 100
                : null;
        const hasReviews = item.rating_average > 0 && item.reviews_count > 0;
        const photo = item.cover_image_url;

        return (
            <TouchableOpacity
                accessibilityLabel={`Open ${item.name}`}
                accessibilityRole="button"
                style={styles.gridCard}
                activeOpacity={0.88}
                onPress={() =>
                    router.push(
                        `/(customer)/explore/property/${item.slug}` as any,
                    )
                }
            >
                <View style={styles.imageWrapper}>
                    {photo ? (
                        <Image
                            source={{ uri: photo }}
                            style={styles.cardImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.cardImagePlaceholder}>
                            <Building2 size={36} color={Colors.gray400} />
                        </View>
                    )}
                    <TouchableOpacity
                        accessibilityLabel={`Remove ${item.name} from wishlist`}
                        accessibilityRole="button"
                        style={styles.heartBtn}
                        onPress={() => handleRemove(item.id)}
                        activeOpacity={0.8}
                    >
                        <Heart
                            size={15}
                            color={Colors.white}
                            fill={Colors.rose}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.cardDetails}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.name}
                    </Text>

                    {hasReviews ? (
                        <View style={styles.ratingRow}>
                            <Star size={11} color="#D97706" fill="#D97706" />
                            <Text style={styles.ratingText}>
                                {' '}
                                {item.rating_average.toFixed(1)} (
                                {item.reviews_count})
                            </Text>
                        </View>
                    ) : null}

                    {rawPrice !== null ? (
                        <Text style={styles.cardPrice}>
                            ₹{rawPrice.toLocaleString('en-IN')}{' '}
                            <Text style={styles.perMonthText}>/ month</Text>
                        </Text>
                    ) : (
                        <Text style={styles.priceUnavailable}>
                            Price unavailable
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (
        !authLoading &&
        (!token || authState === 'guest' || authState === 'session_expired')
    ) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.plumHeader}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            activeOpacity={0.8}
                        >
                            <ChevronLeft size={24} color={Colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Saved Stays</Text>
                        <Heart
                            size={20}
                            color={Colors.white}
                            fill={Colors.white}
                        />
                    </View>
                </View>
                <ExceptionalState
                    type="auth-required"
                    title="Sign In to View Saved Stays"
                    description="Save and compare your favorite verified hostels, homestays, and co-living spaces."
                    actionLabel="Sign In as Customer"
                    onAction={() => router.push('/(auth)/customer-login')}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Curved Plum Header */}
            <View style={styles.plumHeader}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <ChevronLeft size={24} color={Colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Saved Stays</Text>
                    <Heart size={20} color={Colors.white} fill={Colors.white} />
                </View>
            </View>

            {errorMessage && properties.length === 0 ? (
                <ExceptionalState
                    type="no-internet"
                    title="Wishlist Unavailable"
                    description={errorMessage}
                    actionLabel="Try Again"
                    onAction={loadWishlist}
                />
            ) : loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                </View>
            ) : (
                <FlatList
                    data={properties}
                    renderItem={renderGridItem}
                    keyExtractor={(item: PropertyCardType) => String(item.id)}
                    numColumns={2}
                    contentContainerStyle={styles.listContainer}
                    columnWrapperStyle={styles.columnWrapper}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                void loadWishlist().then(() =>
                                    setRefreshing(false),
                                );
                            }}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.canvas,
    },
    plumHeader: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.base,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.lg,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.white,
    },
    guestBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.peachCream,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.peachSoft,
    },
    guestBannerTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.plumPrimary,
    },
    guestBannerDesc: {
        fontSize: 11,
        color: Colors.inkSecondary,
        marginTop: 2,
    },
    guestSignInBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: BorderRadius.pill,
        marginLeft: 8,
    },
    guestSignInBtnText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    listContainer: {
        padding: Spacing.base,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: Spacing.base,
    },
    gridCard: {
        width: '48%',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.subtle,
    },
    imageWrapper: {
        position: 'relative',
        height: 110,
        backgroundColor: Colors.surfaceSubtle,
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardImagePlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heartBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.3)',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardDetails: {
        padding: 10,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.inkPrimary,
        marginBottom: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    ratingText: {
        fontSize: 11,
        color: Colors.inkSecondary,
        fontWeight: '500',
    },
    cardPrice: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.plumPrimary,
    },
    perMonthText: {
        fontSize: 10,
        fontWeight: 'normal',
        color: Colors.inkMuted,
    },
    priceUnavailable: {
        color: Colors.inkMuted,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 8,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
