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

    const formatPrice = (paise: number) => {
        const rupees = Math.round(paise / 100);
        return `₹${rupees.toLocaleString('en-IN')}`;
    };

    const baseUrl = process.env.EXPO_PUBLIC_API_URL
        ? process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '')
        : 'https://tijum.com';

    const imageUri = property.cover_image_url?.startsWith('http')
        ? property.cover_image_url
        : property.cover_image_url
          ? `${baseUrl}${property.cover_image_url.startsWith('/') ? '' : '/'}${property.cover_image_url}`
          : `${baseUrl}/images/public/hero-stay.jpg`;

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
                {property.rating_average > 0 ? (
                    <View style={styles.ratingBadge}>
                        <Star
                            size={11}
                            color="#D97706"
                            fill="#D97706"
                            style={styles.badgeIcon}
                        />
                        <Text style={styles.ratingText}>
                            {property.rating_average.toFixed(1)} (
                            {property.reviews_count})
                        </Text>
                    </View>
                ) : null}
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
                                'South India'}
                        </Text>
                    </View>
                </View>
                <Text numberOfLines={1} style={styles.name}>
                    {property.name}
                </Text>

                <View style={styles.mealRow}>
                    <MealBadge
                        label={
                            !property.food_provided
                                ? 'Room Only / No Food'
                                : property.included_meals?.length
                                  ? property.included_meals_label
                                  : property.breakfast_included ||
                                      property.lunch_included ||
                                      property.dinner_included
                                    ? property.included_meals_label
                                    : 'Food Available (No Meals Included)'
                        }
                        foodProvided={property.food_provided}
                        breakfast={property.breakfast_included}
                        lunch={property.lunch_included}
                        dinner={property.dinner_included}
                        included={
                            property.food_provided &&
                            Boolean(
                                property.breakfast_included ||
                                property.lunch_included ||
                                property.dinner_included,
                            )
                        }
                    />
                </View>

                <View style={styles.footer}>
                    <View>
                        <Text style={styles.priceLabel}>Starting from</Text>
                        <Text style={styles.price}>
                            {formatPrice(property.starting_price_monthly_paise)}
                            <Text style={styles.priceUnit}> / mo</Text>
                        </Text>
                    </View>

                    <View style={styles.viewButton}>
                        <Text style={styles.viewButtonText}>View Stay</Text>
                        <ArrowRight
                            size={13}
                            color={Colors.white}
                            style={{ marginLeft: 4 }}
                        />
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
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        flexDirection: 'row',
        alignItems: 'center',
        ...Shadows.subtle,
    },
    ratingText: {
        color: Colors.gray800,
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
    name: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.inkPrimary,
        marginBottom: Spacing.xs,
    },
    mealRow: {
        marginBottom: Spacing.md,
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
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.plumPrimary,
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.pill,
        ...Shadows.subtle,
    },
    viewButtonText: {
        color: Colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
});
