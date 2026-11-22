import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Image,
    TouchableOpacity,
    SafeAreaView,
    Modal,
    Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Building2,
    MapPin,
    ExternalLink,
    UtensilsCrossed,
    BedDouble,
    Users,
    CheckCircle2,
    XCircle,
    Info,
    Sparkles,
    Check,
    Star,
    Images,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react-native';
import { PublicApi } from '../../../../src/api/public';
import { PropertyDetail } from '../../../../src/api/types';
import { Colors } from '../../../../src/theme/colors';
import { Spacing } from '../../../../src/theme/spacing';
import { Typography } from '../../../../src/theme/typography';
import { MealBadge } from '../../../../src/components/MealBadge';
import { StayTimingBadge } from '../../../../src/components/StayTimingBadge';
import { Badge } from '../../../../src/components/Badge';
import { CategoryBadge } from '../../../../src/components/CategoryBadge';
import { Button } from '../../../../src/components/Button';
import { getCanonicalCategory } from '../../../../src/constants/categories';

export default function PropertyDetailScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const router = useRouter();
    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [galleryModalVisible, setGalleryModalVisible] = useState(false);
    const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

    useEffect(() => {
        if (slug) {
            void loadProperty();
        }
    }, [slug]);

    const loadProperty = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await PublicApi.getProperty(slug);
            if (res.data) {
                setProperty(res.data);
            } else {
                setProperty(null);
                setError('Property details are unavailable.');
            }
        } catch (loadError: unknown) {
            setProperty(null);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Unable to load this property. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.coral} />
                <Text style={styles.loadingText}>Loading stay details...</Text>
            </View>
        );
    }

    if (error || !property) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>
                    {error || 'Property not found.'}
                </Text>
                <Button
                    title="Retry"
                    onPress={loadProperty}
                    style={{ marginTop: Spacing.md }}
                />
            </View>
        );
    }

    const galleryList =
        property.gallery && property.gallery.length > 0
            ? property.gallery
            : property.cover_image_url
              ? [
                    {
                        id: 1,
                        url: property.cover_image_url,
                        caption: property.name,
                        is_primary: true,
                    },
                ]
              : [];

    const startingPrice = property.starting_price_daily_paise
        ? { amount: property.starting_price_daily_paise / 100, unit: 'day' }
        : property.starting_price_weekly_paise
          ? { amount: property.starting_price_weekly_paise / 100, unit: 'week' }
          : property.starting_price_monthly_paise
            ? {
                  amount: property.starting_price_monthly_paise / 100,
                  unit: 'month',
              }
            : null;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Cover Image & Gallery Trigger */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                        if (galleryList.length > 0) {
                            setActiveGalleryIndex(0);
                            setGalleryModalVisible(true);
                        }
                    }}
                    style={styles.coverImageContainer}
                >
                    {property.cover_image_url ? (
                        <Image
                            source={{ uri: property.cover_image_url }}
                            style={styles.coverImage}
                        />
                    ) : (
                        <View
                            style={[styles.coverImage, styles.placeholderCover]}
                        >
                            <Building2 size={48} color={Colors.gray400} />
                        </View>
                    )}
                    {galleryList.length > 0 && (
                        <View style={styles.galleryTriggerBadge}>
                            <Images
                                size={14}
                                color={Colors.white}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.galleryTriggerText}>
                                {galleryList.length} Photo
                                {galleryList.length > 1 ? 's' : ''}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.contentPadding}>
                    {/* Header Title & Badges */}
                    <View style={styles.rowBetween}>
                        <CategoryBadge category={property.category} size="md" />
                        <Badge
                            label={
                                typeof property.city === 'string'
                                    ? property.city
                                    : property.city?.name || 'City'
                            }
                            variant="accent"
                        />
                    </View>

                    <Text style={styles.title}>{property.name}</Text>
                    <View style={styles.addressRow}>
                        <MapPin
                            size={14}
                            color={Colors.gray600}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={styles.address}>
                            {property.address_line1 || property.address_line},{' '}
                            {typeof property.city === 'string'
                                ? property.city
                                : property.city?.name || ''}
                        </Text>
                    </View>
                    {property.has_coordinates && property.google_maps_url ? (
                        <TouchableOpacity
                            style={styles.mapPinLink}
                            onPress={() => {
                                if (property.google_maps_url) {
                                    void Linking.openURL(
                                        property.google_maps_url,
                                    );
                                }
                            }}
                        >
                            <ExternalLink
                                size={14}
                                color={Colors.coral}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.mapPinLinkText}>
                                Open Exact Pin in Google Maps
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.mapPinUnavailableText}>
                            Exact map pin unavailable — address and locality
                            shown above.
                        </Text>
                    )}

                    {/* Canonical Category Architecture Card */}
                    {(() => {
                        const cat = getCanonicalCategory(
                            typeof property.category === 'string'
                                ? property.category
                                : property.category?.slug ||
                                      property.category?.name,
                        );
                        if (!cat) return null;
                        return (
                            <View style={styles.categoryCard}>
                                <View style={styles.categoryCardHeader}>
                                    <Sparkles
                                        size={14}
                                        color={Colors.deepPlum}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={[
                                            styles.categoryCardTitle,
                                            { color: Colors.deepPlum },
                                        ]}
                                    >
                                        {cat.name}
                                    </Text>
                                </View>
                                <Text style={styles.categoryCardDesc}>
                                    {cat.description}
                                </Text>
                                <Text
                                    style={[
                                        styles.categoryCardGuarantee,
                                        { color: Colors.deepPlum },
                                    ]}
                                >
                                    Compare meal arrangements below. Meal
                                    availability and inclusion vary by property.
                                </Text>
                            </View>
                        );
                    })()}

                    {/* Stay Timing Policy */}
                    <StayTimingBadge
                        checkIn={property.check_in_time}
                        checkOut={property.check_out_time}
                    />

                    {/* Food Inclusions Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <UtensilsCrossed
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sectionTitle}>
                                Food & Meal Details
                            </Text>
                        </View>
                        {property.food_provided ? (
                            <View>
                                {!property.breakfast_included &&
                                !property.lunch_included &&
                                !property.dinner_included ? (
                                    <View style={styles.mealsNoticeBox}>
                                        <Text style={styles.mealsNoticeText}>
                                            Food and kitchen facilities are
                                            available on-premise, but meals are
                                            not included in the base room rate.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.mealBadgesContainer}>
                                        <MealBadge
                                            meal="breakfast"
                                            included={
                                                property.breakfast_included
                                            }
                                            timing={property.breakfast_timing}
                                        />
                                        <MealBadge
                                            meal="lunch"
                                            included={property.lunch_included}
                                            timing={property.lunch_timing}
                                        />
                                        <MealBadge
                                            meal="dinner"
                                            included={property.dinner_included}
                                            timing={property.dinner_timing}
                                        />
                                    </View>
                                )}
                                {property.meals_description ? (
                                    <Text style={styles.mealNotes}>
                                        {property.meals_description}
                                    </Text>
                                ) : null}
                            </View>
                        ) : (
                            <Text style={styles.noFoodText}>
                                Self-catering / Room only stay. Food is not
                                included.
                            </Text>
                        )}
                    </View>

                    {/* Room Types & Pricing */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <BedDouble
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sectionTitle}>
                                Available Room Categories
                            </Text>
                        </View>
                        <Text style={styles.sectionSubtitle}>
                            Select your room type. Room allocation is confirmed
                            upon booking.
                        </Text>

                        {property.room_types &&
                        property.room_types.length > 0 ? (
                            property.room_types.map((room) => (
                                <View key={room.id} style={styles.roomCard}>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.roomName}>
                                            {room.name}
                                        </Text>
                                        <Badge
                                            label={
                                                room.sharing_type ||
                                                room.sharing_label ||
                                                (room.is_shared
                                                    ? 'Shared Room'
                                                    : 'Private Room')
                                            }
                                            variant="secondary"
                                        />
                                    </View>

                                    <View style={styles.pricingRow}>
                                        <View style={styles.priceBox}>
                                            <Text style={styles.priceLabel}>
                                                Daily
                                            </Text>
                                            <Text style={styles.priceValue}>
                                                ₹
                                                {(
                                                    room.price_daily_paise / 100
                                                ).toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                        <View style={styles.priceBox}>
                                            <Text style={styles.priceLabel}>
                                                Weekly
                                            </Text>
                                            <Text style={styles.priceValue}>
                                                ₹
                                                {(
                                                    room.price_weekly_paise /
                                                    100
                                                ).toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                        <View style={styles.priceBox}>
                                            <Text style={styles.priceLabel}>
                                                Monthly
                                            </Text>
                                            <Text style={styles.priceValue}>
                                                ₹
                                                {(
                                                    room.price_monthly_paise /
                                                    100
                                                ).toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.roomFooter}>
                                        <View style={styles.inlineMetaRow}>
                                            <Users
                                                size={13}
                                                color={Colors.gray600}
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text style={styles.capacityText}>
                                                Max Guests:{' '}
                                                {room.capacity_per_room ||
                                                    room.max_guests_per_room}
                                            </Text>
                                        </View>
                                        <View style={styles.inlineMetaRow}>
                                            {(room.available_rooms_count ??
                                                room.total_rooms ??
                                                1) > 0 ? (
                                                <>
                                                    <CheckCircle2
                                                        size={13}
                                                        color={Colors.emerald}
                                                        style={{
                                                            marginRight: 4,
                                                        }}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.inventoryText,
                                                            {
                                                                color: Colors.emerald,
                                                            },
                                                        ]}
                                                    >
                                                        {room.available_rooms_count ??
                                                            room.total_rooms ??
                                                            'Available'}{' '}
                                                        rooms available
                                                    </Text>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle
                                                        size={13}
                                                        color={Colors.rose}
                                                        style={{
                                                            marginRight: 4,
                                                        }}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.inventoryText,
                                                            {
                                                                color: Colors.rose,
                                                            },
                                                        ]}
                                                    >
                                                        Currently full
                                                    </Text>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>
                                No room categories listed for this property yet.
                            </Text>
                        )}
                    </View>

                    {/* Description */}
                    {property.description ? (
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Info
                                    size={18}
                                    color={Colors.deepPlum}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.sectionTitle}>
                                    About This Stay
                                </Text>
                            </View>
                            <Text style={styles.bodyText}>
                                {property.description}
                            </Text>
                        </View>
                    ) : null}

                    {/* Amenities */}
                    {property.amenities && property.amenities.length > 0 ? (
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Sparkles
                                    size={18}
                                    color={Colors.deepPlum}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.sectionTitle}>
                                    Amenities
                                </Text>
                            </View>
                            <View style={styles.amenitiesWrap}>
                                {property.amenities.map((item: any, index) => (
                                    <View
                                        key={index}
                                        style={styles.amenityChip}
                                    >
                                        <Check
                                            size={12}
                                            color={Colors.emerald}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={styles.amenityText}>
                                            {typeof item === 'string'
                                                ? item
                                                : item?.name || ''}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : null}

                    {/* Verified Customer Reviews */}
                    <View style={styles.section}>
                        <View style={styles.rowBetween}>
                            <View style={styles.sectionHeaderRow}>
                                <Star
                                    size={18}
                                    color="#D97706"
                                    fill="#D97706"
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.sectionTitle}>
                                    Verified Customer Reviews
                                </Text>
                            </View>
                            <Badge
                                label={
                                    (property.rating ?? 0) > 0
                                        ? `${(property.rating ?? 0).toFixed(1)} (${property.reviews_count})`
                                        : 'New'
                                }
                                variant={
                                    (property.rating ?? 0) >= 4
                                        ? 'accent'
                                        : 'secondary'
                                }
                            />
                        </View>

                        {property.reviews && property.reviews.length > 0 ? (
                            property.reviews.map((rev) => (
                                <View key={rev.id} style={styles.reviewCard}>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.reviewerName}>
                                            {rev.customer_name}
                                        </Text>
                                        <View style={styles.inlineMetaRow}>
                                            <Star
                                                size={12}
                                                color="#D97706"
                                                fill="#D97706"
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text style={styles.reviewRating}>
                                                {rev.overall_rating}/5
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.reviewDate}>
                                        {rev.created_at}
                                    </Text>
                                    {rev.title ? (
                                        <Text style={styles.reviewTitle}>
                                            {rev.title}
                                        </Text>
                                    ) : null}
                                    {rev.content ? (
                                        <Text style={styles.reviewBody}>
                                            {rev.content}
                                        </Text>
                                    ) : null}

                                    {rev.owner_reply ? (
                                        <View style={styles.ownerReplyBox}>
                                            <Text
                                                style={styles.ownerReplyTitle}
                                            >
                                                Owner Response:
                                            </Text>
                                            <Text style={styles.ownerReplyBody}>
                                                {rev.owner_reply}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>
                                No reviews yet. Be the first to book and share
                                your verified experience!
                            </Text>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Floating Bottom Booking Action */}
            <View style={styles.bottomBar}>
                <View>
                    <Text style={styles.bottomPriceLabel}>Starting from</Text>
                    <Text style={styles.bottomPriceValue}>
                        {startingPrice
                            ? `₹${startingPrice.amount.toLocaleString('en-IN')}/${startingPrice.unit}`
                            : 'Price unavailable'}
                    </Text>
                </View>
                <Button
                    title="Book Stay"
                    onPress={() =>
                        router.push({
                            pathname: '/(customer)/bookings/create',
                            params: {
                                property_id: property.id,
                                property_slug: property.slug,
                            },
                        })
                    }
                    disabled={!property.booking_eligible || !startingPrice}
                    style={{ paddingHorizontal: Spacing.xl }}
                />
            </View>
            {/* Photo Gallery Modal */}
            <Modal
                visible={galleryModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setGalleryModalVisible(false)}
            >
                <View style={styles.galleryModalOverlay}>
                    {/* Gallery Header */}
                    <View style={styles.galleryModalHeader}>
                        <Text style={styles.galleryModalCount}>
                            {galleryList.length > 0
                                ? `${activeGalleryIndex + 1} / ${galleryList.length}`
                                : '0 / 0'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setGalleryModalVisible(false)}
                            style={styles.galleryCloseBtn}
                            accessibilityLabel="Close Gallery"
                        >
                            <X size={24} color={Colors.white} />
                        </TouchableOpacity>
                    </View>

                    {/* Main Photo Display with Navigation Arrows */}
                    <View style={styles.galleryMainView}>
                        {galleryList.length > 1 && (
                            <TouchableOpacity
                                style={[
                                    styles.galleryNavBtn,
                                    styles.galleryNavLeft,
                                ]}
                                onPress={() =>
                                    setActiveGalleryIndex((prev) =>
                                        prev > 0
                                            ? prev - 1
                                            : galleryList.length - 1,
                                    )
                                }
                            >
                                <ChevronLeft size={28} color={Colors.white} />
                            </TouchableOpacity>
                        )}

                        {galleryList[activeGalleryIndex] ? (
                            <Image
                                source={{
                                    uri: galleryList[activeGalleryIndex].url,
                                }}
                                style={styles.galleryMainImage}
                                resizeMode="contain"
                            />
                        ) : null}

                        {galleryList.length > 1 && (
                            <TouchableOpacity
                                style={[
                                    styles.galleryNavBtn,
                                    styles.galleryNavRight,
                                ]}
                                onPress={() =>
                                    setActiveGalleryIndex((prev) =>
                                        prev < galleryList.length - 1
                                            ? prev + 1
                                            : 0,
                                    )
                                }
                            >
                                <ChevronRight size={28} color={Colors.white} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Caption */}
                    {galleryList[activeGalleryIndex]?.caption ? (
                        <View style={styles.galleryCaptionBox}>
                            <Text style={styles.galleryCaptionText}>
                                {galleryList[activeGalleryIndex].caption}
                            </Text>
                        </View>
                    ) : null}

                    {/* Thumbnails Strip */}
                    {galleryList.length > 1 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.galleryThumbsScroll}
                        >
                            {galleryList.map((item, idx) => {
                                const isActive = idx === activeGalleryIndex;
                                return (
                                    <TouchableOpacity
                                        key={item.id || idx}
                                        onPress={() =>
                                            setActiveGalleryIndex(idx)
                                        }
                                        style={[
                                            styles.galleryThumb,
                                            isActive &&
                                                styles.galleryThumbActive,
                                        ]}
                                    >
                                        <Image
                                            source={{ uri: item.url }}
                                            style={styles.galleryThumbImg}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    coverImageContainer: {
        position: 'relative',
        width: '100%',
        height: 240,
    },
    galleryTriggerBadge: {
        position: 'absolute',
        bottom: Spacing.sm,
        right: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        borderRadius: 9999,
    },
    galleryTriggerText: {
        ...Typography.labelSmall,
        color: Colors.white,
        fontWeight: '700',
    },
    coverImage: {
        width: '100%',
        height: 240,
        backgroundColor: Colors.gray200,
    },
    placeholderCover: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentPadding: {
        padding: Spacing.lg,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        ...Typography.titleLarge,
        color: Colors.deepPlum,
        marginTop: Spacing.sm,
    },
    address: {
        ...Typography.bodyMedium,
        color: Colors.gray600,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    categoryCard: {
        backgroundColor: '#FFF4EE',
        borderColor: '#E6E0DB',
        borderWidth: 1,
        borderRadius: 12,
        padding: Spacing.md,
        marginTop: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    categoryCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryCardTitle: {
        ...Typography.bodySmall,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    categoryCardDesc: {
        ...Typography.bodySmall,
        color: Colors.gray700,
        lineHeight: 18,
        marginBottom: 4,
    },
    categoryCardGuarantee: {
        ...Typography.bodySmall,
        fontWeight: '600',
        fontSize: 11,
    },
    section: {
        marginTop: Spacing.xl,
        paddingTop: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
    },
    inlineMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionSubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginBottom: Spacing.md,
    },
    mealBadgesContainer: {
        gap: Spacing.sm,
    },
    mealNotes: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        marginTop: Spacing.sm,
        fontStyle: 'italic',
    },
    noFoodText: {
        ...Typography.bodyMedium,
        color: Colors.gray500,
    },
    mealsNoticeBox: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
        borderWidth: 1,
        borderRadius: 8,
        padding: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    mealsNoticeText: {
        ...Typography.bodySmall,
        color: '#92400E',
        fontWeight: '600',
    },
    roomCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        marginBottom: Spacing.md,
    },
    roomName: {
        ...Typography.labelLarge,
        color: Colors.deepPlum,
    },
    pricingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: Spacing.md,
        backgroundColor: Colors.white,
        padding: Spacing.sm,
        borderRadius: 8,
    },
    priceBox: {
        alignItems: 'center',
    },
    priceLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    priceValue: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
    },
    roomFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    capacityText: {
        ...Typography.bodySmall,
        color: Colors.gray600,
    },
    inventoryText: {
        ...Typography.bodySmall,
        fontWeight: '600',
        color: Colors.deepPlum,
    },
    bodyText: {
        ...Typography.bodyMedium,
        color: Colors.gray700,
        lineHeight: 22,
    },
    amenitiesWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    amenityChip: {
        backgroundColor: Colors.gray100,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: 16,
    },
    amenityText: {
        ...Typography.bodySmall,
        color: Colors.gray800,
    },
    reviewCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 10,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    reviewerName: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
    },
    reviewRating: {
        ...Typography.labelSmall,
        color: Colors.goldenMustard,
    },
    reviewDate: {
        ...Typography.bodySmall,
        color: Colors.gray400,
        marginTop: 2,
    },
    reviewTitle: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
        marginTop: Spacing.xs,
    },
    reviewBody: {
        ...Typography.bodySmall,
        color: Colors.gray700,
        marginTop: Spacing.xs,
    },
    ownerReplyBox: {
        marginTop: Spacing.sm,
        padding: Spacing.sm,
        backgroundColor: Colors.white,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: Colors.deepPlum,
    },
    ownerReplyTitle: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
    },
    ownerReplyBody: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        marginTop: 2,
    },
    emptyText: {
        ...Typography.bodyMedium,
        color: Colors.gray500,
        fontStyle: 'italic',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },
    bottomPriceLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    bottomPriceValue: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
        backgroundColor: Colors.white,
    },
    loadingText: {
        ...Typography.bodyMedium,
        color: Colors.gray600,
        marginTop: Spacing.md,
    },
    errorText: {
        ...Typography.bodyMedium,
        color: Colors.coral,
        textAlign: 'center',
    },
    galleryModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.94)',
        justifyContent: 'space-between',
        paddingVertical: Spacing.xl,
    },
    galleryModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
    },
    galleryModalCount: {
        ...Typography.labelMedium,
        color: Colors.white,
        fontWeight: '700',
    },
    galleryCloseBtn: {
        padding: Spacing.xs,
    },
    galleryMainView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    galleryMainImage: {
        width: '100%',
        height: '80%',
    },
    galleryNavBtn: {
        position: 'absolute',
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryNavLeft: {
        left: Spacing.md,
    },
    galleryNavRight: {
        right: Spacing.md,
    },
    galleryCaptionBox: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs,
        alignItems: 'center',
    },
    galleryCaptionText: {
        ...Typography.bodySmall,
        color: Colors.white,
        textAlign: 'center',
        opacity: 0.9,
    },
    galleryThumbsScroll: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.xs,
    },
    galleryThumb: {
        width: 60,
        height: 60,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    galleryThumbActive: {
        borderColor: Colors.coral,
    },
    galleryThumbImg: {
        width: '100%',
        height: '100%',
    },
    mapPinLink: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginBottom: Spacing.sm,
        paddingVertical: 4,
    },
    mapPinLinkText: {
        ...Typography.bodySmall,
        color: Colors.coral,
        fontWeight: '700',
    },
    mapPinUnavailableText: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginBottom: Spacing.sm,
    },
});
