import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { OwnerApi } from '../../../src/api/owner';
import { PhysicalRoom, PropertyDetail } from '../../../src/api/types';
import { Badge } from '../../../src/components/Badge';
import { CategoryBadge } from '../../../src/components/CategoryBadge';
import {
    CANONICAL_CATEGORIES,
    CanonicalCategorySlug,
    getCategoryDisplayName,
    normalizeCategorySlug,
} from '../../../src/constants/categories';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { StayTimingBadge } from '../../../src/components/StayTimingBadge';
import { AppHeader } from '../../../src/components/AppHeader';
import {
    BedDouble,
    Building2,
    Calendar,
    Camera,
    DoorClosed,
    Edit2,
    Home,
    IndianRupee,
    MapPin,
    Plus,
    Sparkles,
    Users,
    X,
} from 'lucide-react-native';

export default function PartnerPropertiesScreen() {
    const router = useRouter();
    const [properties, setProperties] = useState<PropertyDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<
        'all' | CanonicalCategorySlug
    >('all');

    // Physical Rooms Modal State
    const [selectedPropertyForRooms, setSelectedPropertyForRooms] =
        useState<PropertyDetail | null>(null);
    const [physicalRooms, setPhysicalRooms] = useState<PhysicalRoom[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [roomsError, setRoomsError] = useState('');

    const handleOpenRooms = async (property: PropertyDetail) => {
        setSelectedPropertyForRooms(property);
        setRoomsError('');
        setLoadingRooms(true);
        try {
            const res = await OwnerApi.getPropertyRooms(property.id);
            if (res.data) {
                setPhysicalRooms(res.data);
            }
        } catch (e: any) {
            setRoomsError(e.message || 'Failed to retrieve physical room list.');
        } finally {
            setLoadingRooms(false);
        }
    };

    const handleCloseRooms = () => {
        setSelectedPropertyForRooms(null);
        setPhysicalRooms([]);
        setRoomsError('');
    };

    useEffect(() => {
        loadProperties();
    }, []);

    const loadProperties = async () => {
        try {
            setLoading(true);
            const res = await OwnerApi.getProperties();
            if (res.data) {
                setProperties(res.data);
            }
        } catch (e) {
            console.error('Failed to load partner properties', e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadProperties();
        setRefreshing(false);
    };

    // Compute property counts per canonical category
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {
            all: properties.length,
            'hostels-pg': 0,
            homestays: 0,
            'co-living': 0,
        };
        properties.forEach((p) => {
            const rawCat =
                typeof p.category === 'string'
                    ? p.category
                    : p.category?.slug || p.category?.name;
            const canonical = normalizeCategorySlug(rawCat);
            if (canonical && counts[canonical] !== undefined) {
                counts[canonical] += 1;
            }
        });
        return counts;
    }, [properties]);

    // Filter properties by selected canonical category
    const filteredProperties = useMemo(() => {
        if (activeCategoryFilter === 'all') {
            return properties;
        }
        return properties.filter((p) => {
            const rawCat =
                typeof p.category === 'string'
                    ? p.category
                    : p.category?.slug || p.category?.name;
            const canonical = normalizeCategorySlug(rawCat);
            return canonical === activeCategoryFilter;
        });
    }, [properties, activeCategoryFilter]);

    const categoryTabs = [
        {
            key: 'all' as const,
            label: 'All',
            count: categoryCounts.all,
            Icon: Sparkles,
        },
        {
            key: 'hostels-pg' as const,
            label: 'Hostels/PG',
            count: categoryCounts['hostels-pg'],
            Icon: Building2,
        },
        {
            key: 'homestays' as const,
            label: 'Homestays',
            count: categoryCounts.homestays,
            Icon: Home,
        },
        {
            key: 'co-living' as const,
            label: 'Co-Living',
            count: categoryCounts['co-living'],
            Icon: Users,
        },
    ];

    const renderPropertyCard = ({ item }: { item: PropertyDetail }) => (
        <View style={styles.card}>
            {item.cover_image_url ? (
                <Image
                    source={{ uri: item.cover_image_url }}
                    style={styles.image}
                />
            ) : (
                <View style={[styles.image, styles.placeholderImage]}>
                    <Building2 size={36} color={Colors.gray400} />
                </View>
            )}

            <View style={styles.cardContent}>
                <View style={styles.rowBetween}>
                    <CategoryBadge category={item.category} size="md" />
                    <Badge
                        label={item.status || 'Active'}
                        variant={
                            item.status === 'approved' ? 'accent' : 'secondary'
                        }
                    />
                </View>

                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.addressRow}>
                    <MapPin
                        size={12}
                        color={Colors.gray500}
                        style={{ marginRight: 4 }}
                    />
                    <Text style={styles.address}>
                        {item.address_line1 || item.address_line},{' '}
                        {typeof item.city === 'string'
                            ? item.city
                            : item.city?.name || ''}
                    </Text>
                </View>

                <StayTimingBadge
                    checkIn={item.check_in_time}
                    checkOut={item.check_out_time}
                />

                {/* Meal Inclusions Summary */}
                <View style={styles.mealsSummary}>
                    <Text style={styles.mealsTitle}>Meals Provided:</Text>
                    <Text style={styles.mealsValue}>
                        {item.food_provided
                            ? [
                                  item.breakfast_included && 'Breakfast',
                                  item.lunch_included && 'Lunch',
                                  item.dinner_included && 'Dinner',
                              ]
                                  .filter(Boolean)
                                  .join(' • ') || 'Custom Meals'
                            : 'Room only / No meals'}
                    </Text>
                </View>

                {/* Room Types Breakdown */}
                <View style={styles.roomTypesBox}>
                    <Text style={styles.roomTypesTitle}>
                        Configured Categories:
                    </Text>
                    {item.room_types && item.room_types.length > 0 ? (
                        item.room_types.map((rt) => (
                            <View key={rt.id} style={styles.roomTypeRow}>
                                <Text style={styles.roomTypeName}>
                                    • {rt.name} ({rt.sharing_type})
                                </Text>
                                <Text style={styles.roomTypePrice}>
                                    ₹
                                    {(
                                        rt.price_daily_paise / 100
                                    ).toLocaleString('en-IN')}
                                    /day • {rt.available_rooms_count} rooms
                                </Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyRoomsText}>
                            No room categories added yet.
                        </Text>
                    )}
                </View>

                {/* Physical Rooms Viewer Trigger */}
                <TouchableOpacity
                    style={styles.viewRoomsBtn}
                    onPress={() => handleOpenRooms(item)}
                    activeOpacity={0.75}
                >
                    <DoorClosed
                        size={15}
                        color={Colors.deepPlum}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={styles.viewRoomsBtnText}>
                        Inspect Physical Rooms
                    </Text>
                </TouchableOpacity>

                {/* Partner Management Actions Bar */}
                <View style={styles.cardActionsGrid}>
                    <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() =>
                            router.push(
                                `/(partner)/properties/${item.id}/edit` as any,
                            )
                        }
                        activeOpacity={0.8}
                    >
                        <Edit2 size={13} color={Colors.deepPlum} />
                        <Text style={styles.actionChipText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() =>
                            router.push(
                                `/(partner)/properties/${item.id}/room-types` as any,
                            )
                        }
                        activeOpacity={0.8}
                    >
                        <BedDouble size={13} color={Colors.deepPlum} />
                        <Text style={styles.actionChipText}>Categories</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() =>
                            router.push(
                                `/(partner)/properties/${item.id}/rooms` as any,
                            )
                        }
                        activeOpacity={0.8}
                    >
                        <DoorClosed size={13} color={Colors.deepPlum} />
                        <Text style={styles.actionChipText}>Rooms</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() =>
                            router.push(
                                `/(partner)/properties/${item.id}/pricing` as any,
                            )
                        }
                        activeOpacity={0.8}
                    >
                        <IndianRupee size={13} color={Colors.deepPlum} />
                        <Text style={styles.actionChipText}>Pricing</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() =>
                            router.push(
                                `/(partner)/properties/${item.id}/availability` as any,
                            )
                        }
                        activeOpacity={0.8}
                    >
                        <Calendar size={13} color={Colors.deepPlum} />
                        <Text style={styles.actionChipText}>Blocks</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() =>
                            router.push(
                                `/(partner)/properties/${item.id}/media` as any,
                            )
                        }
                        activeOpacity={0.8}
                    >
                        <Camera size={13} color={Colors.deepPlum} />
                        <Text style={styles.actionChipText}>Photos</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() =>
                            router.push(
                                `/(partner)/properties/${item.id}/amenities` as any,
                            )
                        }
                        activeOpacity={0.8}
                    >
                        <Sparkles size={13} color={Colors.deepPlum} />
                        <Text style={styles.actionChipText}>Amenities</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Curved Plum Header with Add Stay action */}
            <AppHeader
                title="Manage Stays"
                subtitle={`${properties.length} registered properties`}
                variant="plum"
                rightAction={
                    <TouchableOpacity
                        style={styles.addPropertyBtn}
                        onPress={() => router.push('/(partner)/properties/create')}
                        activeOpacity={0.8}
                    >
                        <Plus size={15} color={Colors.white} />
                        <Text style={styles.addPropertyBtnText}>Add Stay</Text>
                    </TouchableOpacity>
                }
            />

            {/* Category Filter Tabs */}
            <View style={styles.filterSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterTabsContainer}
                >
                    {categoryTabs.map((tab) => {
                        const isSelected = activeCategoryFilter === tab.key;
                        const IconComponent = tab.Icon;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                activeOpacity={0.8}
                                onPress={() => setActiveCategoryFilter(tab.key)}
                                style={[
                                    styles.filterTab,
                                    isSelected && styles.filterTabActive,
                                ]}
                            >
                                <IconComponent
                                    size={13}
                                    color={
                                        isSelected
                                            ? Colors.white
                                            : Colors.gray700
                                    }
                                    style={{ marginRight: 5 }}
                                />
                                <Text
                                    style={[
                                        styles.filterTabText,
                                        isSelected &&
                                            styles.filterTabTextActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                                <View
                                    style={[
                                        styles.countBadge,
                                        isSelected && styles.countBadgeActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.countBadgeText,
                                            isSelected &&
                                                styles.countBadgeTextActive,
                                        ]}
                                    >
                                        {tab.count}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                    <Text style={styles.loadingText}>
                        Loading your properties...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredProperties}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderPropertyCard}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.deepPlum]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Building2
                                size={48}
                                color={Colors.gray300}
                                style={{ marginBottom: Spacing.md }}
                            />
                            <Text style={styles.emptyTitle}>
                                {activeCategoryFilter !== 'all'
                                    ? `No ${getCategoryDisplayName(activeCategoryFilter)} listed`
                                    : 'No properties listed'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeCategoryFilter !== 'all'
                                    ? `You have not registered any ${getCategoryDisplayName(activeCategoryFilter)} properties. Switch categories or add new properties via the partner web dashboard.`
                                    : 'Add properties through the TIJUM Partner web portal to manage them on mobile.'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Physical Rooms Viewer Modal */}
            <Modal
                visible={Boolean(selectedPropertyForRooms)}
                transparent
                animationType="slide"
                onRequestClose={handleCloseRooms}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>
                                    Physical Room Inventory
                                </Text>
                                <Text
                                    style={styles.modalSubtitle}
                                    numberOfLines={1}
                                >
                                    {selectedPropertyForRooms?.name}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleCloseRooms}
                                hitSlop={{
                                    top: 10,
                                    bottom: 10,
                                    left: 10,
                                    right: 10,
                                }}
                            >
                                <X size={20} color={Colors.gray600} />
                            </TouchableOpacity>
                        </View>

                        {roomsError ? (
                            <View style={styles.modalErrorBox}>
                                <Text style={styles.modalErrorText}>
                                    {roomsError}
                                </Text>
                            </View>
                        ) : null}

                        {loadingRooms ? (
                            <View
                                style={{
                                    padding: Spacing.xl,
                                    alignItems: 'center',
                                }}
                            >
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.deepPlum}
                                />
                                <Text
                                    style={[
                                        styles.loadingText,
                                        { marginTop: 8 },
                                    ]}
                                >
                                    Loading room inventory...
                                </Text>
                            </View>
                        ) : physicalRooms.length === 0 ? (
                            <View
                                style={{
                                    padding: Spacing.xl,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={styles.emptyRoomsText}>
                                    No physical rooms configured yet for this
                                    property.
                                </Text>
                            </View>
                        ) : (
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                style={{ maxHeight: 400 }}
                            >
                                <View
                                    style={{
                                        gap: Spacing.xs,
                                        paddingBottom: Spacing.md,
                                    }}
                                >
                                    {physicalRooms.map((room) => (
                                        <View
                                            key={room.id}
                                            style={styles.roomItemCard}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <Text
                                                        style={
                                                            styles.roomItemNumber
                                                        }
                                                    >
                                                        Room {room.room_number}
                                                    </Text>
                                                    {room.floor !== null &&
                                                    room.floor !==
                                                        undefined ? (
                                                        <Text
                                                            style={
                                                                styles.roomItemFloor
                                                            }
                                                        >
                                                            (Floor {room.floor})
                                                        </Text>
                                                    ) : null}
                                                </View>
                                                <Text
                                                    style={styles.roomItemMeta}
                                                >
                                                    {room.room_type_name ||
                                                        'Standard Category'}
                                                </Text>
                                                {room.current_allocation
                                                    ?.guest_name ? (
                                                    <Text
                                                        style={
                                                            styles.roomAllocationMeta
                                                        }
                                                    >
                                                        Guest:{' '}
                                                        {
                                                            room
                                                                .current_allocation
                                                                .guest_name
                                                        }{' '}
                                                        • Dep:{' '}
                                                        {
                                                            room
                                                                .current_allocation
                                                                .check_out_date
                                                        }
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <View
                                                style={{
                                                    alignItems: 'flex-end',
                                                }}
                                            >
                                                {room.is_occupied ? (
                                                    <View
                                                        style={
                                                            styles.occupiedBadge
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.occupiedBadgeText
                                                            }
                                                        >
                                                            Occupied
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <View
                                                        style={
                                                            styles.availableBadge
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.availableBadgeText
                                                            }
                                                        >
                                                            Available
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.warmOffWhite,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.base,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xs,
        backgroundColor: Colors.white,
    },
    topBarTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    topBarSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        marginTop: 1,
    },
    addPropertyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
    },
    addPropertyBtnText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.white,
        marginLeft: 4,
    },
    cardActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginTop: Spacing.md,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.deepPlum,
        backgroundColor: Colors.white,
    },
    actionChipText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.deepPlum,
        marginLeft: 4,
    },
    filterSection: {
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
        paddingVertical: Spacing.sm,
    },
    filterTabsContainer: {
        paddingHorizontal: Spacing.md,
        gap: Spacing.xs,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray100,
        paddingHorizontal: Spacing.md,
        paddingVertical: 7,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    filterTabActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    filterTabText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.gray700,
    },
    filterTabTextActive: {
        color: Colors.white,
    },
    countBadge: {
        backgroundColor: Colors.gray200,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: BorderRadius.full,
        marginLeft: 6,
    },
    countBadgeActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    countBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.gray700,
    },
    countBadgeTextActive: {
        color: Colors.white,
    },
    listContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 160,
        backgroundColor: Colors.gray200,
    },
    placeholderImage: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        padding: Spacing.md,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    name: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
        marginTop: Spacing.xs,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        marginBottom: 4,
    },
    address: {
        ...Typography.bodySmall,
        color: Colors.gray600,
    },
    mealsSummary: {
        backgroundColor: Colors.warmOffWhite,
        padding: Spacing.sm,
        borderRadius: 6,
        marginVertical: Spacing.xs,
    },
    mealsTitle: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
        fontSize: 11,
    },
    mealsValue: {
        ...Typography.bodySmall,
        color: Colors.gray700,
        fontWeight: '600',
        marginTop: 2,
    },
    roomTypesBox: {
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        paddingTop: Spacing.sm,
        marginTop: Spacing.xs,
    },
    roomTypesTitle: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
        marginBottom: 4,
    },
    roomTypeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    roomTypeName: {
        ...Typography.bodySmall,
        color: Colors.gray700,
    },
    roomTypePrice: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        fontWeight: '600',
    },
    emptyRoomsText: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        fontStyle: 'italic',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        ...Typography.bodyMedium,
        color: Colors.gray600,
        marginTop: Spacing.md,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        paddingHorizontal: Spacing.xl,
    },
    emptyTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
    },
    emptySubtitle: {
        ...Typography.bodyMedium,
        color: Colors.gray500,
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
    viewRoomsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.warmOffWhite,
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.base,
        paddingVertical: Spacing.sm,
        marginTop: Spacing.md,
    },
    viewRoomsBtnText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
        paddingBottom: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    modalTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
        fontWeight: '800',
    },
    modalSubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginTop: 2,
    },
    modalErrorBox: {
        backgroundColor: '#FFF1F2',
        padding: Spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFE4E6',
        marginBottom: Spacing.sm,
    },
    modalErrorText: {
        fontSize: 12,
        color: '#E11D48',
        fontWeight: '600',
    },
    roomItemCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: 8,
        backgroundColor: Colors.warmOffWhite,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    roomItemNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    roomItemFloor: {
        fontSize: 12,
        color: Colors.gray600,
        marginLeft: 6,
    },
    roomItemMeta: {
        fontSize: 12,
        color: Colors.gray500,
        marginTop: 2,
    },
    roomAllocationMeta: {
        fontSize: 11,
        color: '#059669',
        fontWeight: '600',
        marginTop: 3,
    },
    occupiedBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    occupiedBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#DC2626',
    },
    availableBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    availableBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#15803D',
    },
});
