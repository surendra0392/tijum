import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    CheckCircle2,
    Star,
    MapPin,
    ArrowRight,
    Heart,
} from 'lucide-react-native';
import { PropertyCard as PropertyCardType } from '../api/types';
import { Colors } from '../theme/colors';
import { BorderRadius, Shadows, Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { MealBadge } from './MealBadge';
import { CategoryBadge } from './CategoryBadge';

interface Props {
    property: PropertyCardType;
    onPress: () => void;
    isWishlisted?: boolean;
    onToggleWishlist?: (propertyId: number) => void;
}

export function PropertyCard({
    property,
    onPress,
    isWishlisted = false,
    onToggleWishlist,
}: Props) {
    const [localWishlisted, setLocalWishlisted] = useState(isWishlisted);
    const effectiveWishlisted = onToggleWishlist
        ? isWishlisted
        : localWishlisted;

    const anyProp = property as any;
    const rawPrice =
        property.starting_price_monthly_paise ??
        anyProp.starting_price ??
        800000;
    const priceRupees = rawPrice > 100000 ? Math.round(rawPrice / 100) : rawPrice;
    const formattedPrice = `₹${priceRupees.toLocaleString('en-IN')}`;

    const baseUrl = process.env.EXPO_PUBLIC_API_URL
        ? process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '')
        : 'https://tijum.com';

    const rawImage =
        anyProp.primary_photo_url ||
        property.cover_image_url ||
        (Array.isArray(anyProp.photos) && anyProp.photos[0]) ||
        '';

    const imageUri = rawImage.startsWith('http')
        ? rawImage
        : rawImage
          ? `${baseUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
          : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80';

    const ratingVal = property.rating_average || anyProp.rating || 4.7;
    const reviewsCount = property.reviews_count || 124;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            style={styles.container}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: imageUri }}
                    style={styles.image}
                    resizeMode="cover"
                />
                <View style={styles.verifiedBadge}>
                    <CheckCircle2
                        size={12}
                        color={Colors.successText}
                        style={styles.badgeIcon}
                    />
                    <Text style={styles.verifiedText}>Verified</Text>
                </View>
                <View style={styles.ratingBadge}>
                    <Star
                        size={11}
                        color={Colors.white}
                        fill={Colors.white}
                        style={styles.badgeIcon}
                    />
                    <Text style={styles.ratingText}>
                        {typeof ratingVal === 'number' ? ratingVal.toFixed(1) : ratingVal}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.wishlistButton}
                    activeOpacity={0.8}
                    onPress={() => {
                        setLocalWishlisted(!localWishlisted);
                        onToggleWishlist?.(property.id);
                    }}
                >
                    <Heart
                        size={16}
                        color={effectiveWishlisted ? Colors.rose : Colors.white}
                        fill={
                            effectiveWishlisted
                                ? Colors.rose
                                : 'rgba(0, 0, 0, 0.35)'
                        }
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.details}>
                <View style={styles.categoryLocalityRow}>
                    <CategoryBadge category={property.category} size="sm" />
                    <View style={styles.localityRow}>
                        <MapPin
                            size={12}
                            color={Colors.coralPrimary}
                            style={{ marginRight: 3 }}
                        />
                        <Text style={styles.locality} numberOfLines={1}>
                            {property.locality ||
                                property.city?.name ||
                                'Koramangala, Bengaluru'}
                            {property.distance_km ? ` • ${property.distance_km} km` : ''}
                        </Text>
                    </View>
                </View>

                <View style={styles.titleRatingRow}>
                    <Text numberOfLines={1} style={styles.name}>
                        {property.name}
                    </Text>
                    <Text style={styles.reviewsCountText}>({reviewsCount} reviews)</Text>
                </View>

                <View style={styles.amenityChipsRow}>
                    {(anyProp.has_ac || anyProp.amenities?.includes('ac')) && (
                        <View style={styles.amenityChip}>
                            <Text style={styles.amenityChipText}>❄️ AC</Text>
                        </View>
                    )}
                    {(anyProp.food_included || property.food_provided || anyProp.amenities?.includes('food_included')) && (
                        <View style={styles.amenityChip}>
                            <Text style={styles.amenityChipText}>🥗 Veg Food</Text>
                        </View>
                    )}
                    <View style={styles.amenityChip}>
                        <Text style={styles.amenityChipText}>📶 WiFi</Text>
                    </View>
                    <View style={styles.amenityChip}>
                        <Text style={styles.amenityChipText}>👥 Shared</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <View>
                        <Text style={styles.price}>
                            {formattedPrice}
                            <Text style={styles.priceUnit}> / month</Text>
                        </Text>
                    </View>

                    <View style={styles.bookNowButton}>
                        <Text style={styles.bookNowButtonText}>Book Now</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        marginBottom: Spacing.base,
        ...Shadows.card,
    },
    imageContainer: {
        height: 190,
        backgroundColor: Colors.surfaceSubtle,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    verifiedBadge: {
        position: 'absolute',
        top: Spacing.md,
        left: Spacing.md,
        backgroundColor: Colors.successLight,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgeIcon: {
        marginRight: 4,
    },
    verifiedText: {
        color: Colors.successText,
        fontSize: 11,
        fontWeight: '700',
    },
    ratingBadge: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
        backgroundColor: Colors.coral,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        flexDirection: 'row',
        alignItems: 'center',
        ...Shadows.subtle,
    },
    ratingText: {
        color: Colors.white,
        fontSize: 11,
        fontWeight: '700',
    },
    wishlistButton: {
        position: 'absolute',
        bottom: Spacing.sm,
        right: Spacing.sm,
        backgroundColor: 'rgba(17, 24, 39, 0.55)',
        width: 32,
        height: 32,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    details: {
        padding: Spacing.base,
    },
    categoryLocalityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    localityRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locality: {
        fontSize: 12,
        color: Colors.inkSecondary,
        fontWeight: '600',
    },
    titleRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.inkPrimary,
        flex: 1,
        marginRight: 6,
    },
    reviewsCountText: {
        fontSize: 12,
        color: Colors.inkMuted,
        fontWeight: '500',
    },
    amenityChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: Spacing.md,
    },
    amenityChip: {
        backgroundColor: Colors.surfaceSubtle,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    amenityChipText: {
        fontSize: 11,
        color: Colors.inkSecondary,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
        paddingTop: Spacing.md,
    },
    priceLabel: {
        fontSize: 11,
        color: Colors.inkMuted,
        marginBottom: 1,
    },
    price: {
        fontSize: 17,
        fontWeight: '800',
        color: Colors.plumPrimary,
    },
    priceUnit: {
        fontSize: 12,
        color: Colors.inkSecondary,
        fontWeight: 'normal',
    },
    bookNowButton: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.pill,
        ...Shadows.subtle,
    },
    bookNowButtonText: {
        color: Colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
});
