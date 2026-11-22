import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { OwnerApi } from '../../../../src/api/owner';
import {
    AmenityCatalogCategory,
    AmenityCatalogItem,
    OwnerPropertyAmenity,
} from '../../../../src/api/types';
import { Badge } from '../../../../src/components/Badge';
import { Button } from '../../../../src/components/Button';
import { AppHeader } from '../../../../src/components/AppHeader';
import { RequireAuth } from '../../../../src/components/RequireAuth';
import { Colors } from '../../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../../src/theme/spacing';
import { Typography } from '../../../../src/theme/typography';
import {
    Check,
    Plus,
    Search,
    Shield,
    Trash2,
    X,
} from 'lucide-react-native';

export default function PropertyAmenitiesScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const propertyId = Number(id);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [assigned, setAssigned] = useState<OwnerPropertyAmenity[]>([]);
    const [catalogue, setCatalogue] = useState<AmenityCatalogCategory[]>([]);
    const [selectedCategoryFilter, setSelectedCategoryFilter] =
        useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Add Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [selectedCatalogAmenity, setSelectedCatalogAmenity] =
        useState<AmenityCatalogItem | null>(null);
    const [amenityDetails, setAmenityDetails] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        try {
            const res = await OwnerApi.getAmenities(propertyId);
            if (res.data) {
                setAssigned(res.data.assigned || []);
                setCatalogue(res.data.catalogue || []);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load amenities.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (propertyId) {
            void fetchData();
        }
    }, [propertyId]);

    const onRefresh = () => {
        setRefreshing(true);
        void fetchData();
    };

    const handleAssign = async () => {
        if (!selectedCatalogAmenity) {
            Alert.alert(
                'Required',
                'Please select an amenity from the catalogue.',
            );
            return;
        }

        setSaving(true);
        try {
            await OwnerApi.assignAmenity(propertyId, {
                amenity_id: selectedCatalogAmenity.id,
                availability: 'included',
                details: amenityDetails.trim() || undefined,
            });

            setIsAddModalOpen(false);
            setSelectedCatalogAmenity(null);
            setAmenityDetails('');
            setModalSearchQuery('');
            Alert.alert(
                'Success',
                'Amenity assigned to property successfully.',
            );
            void fetchData();
        } catch (error: any) {
            Alert.alert(
                'Assignment Failed',
                error.message || 'Could not assign amenity.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (item: OwnerPropertyAmenity) => {
        Alert.alert(
            'Remove Amenity',
            `Are you sure you want to remove "${item.name}" from this property?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await OwnerApi.deleteAmenity(propertyId, item.id);
                            Alert.alert(
                                'Removed',
                                'Amenity removed from property.',
                            );
                            void fetchData();
                        } catch (error: any) {
                            Alert.alert(
                                'Error',
                                error.message || 'Could not remove amenity.',
                            );
                        }
                    },
                },
            ],
        );
    };

    const getStatusVariant = (
        status: string,
    ): 'success' | 'warning' | 'info' | 'error' | 'neutral' => {
        switch (status?.toLowerCase()) {
            case 'approved':
            case 'verified':
                return 'success';
            case 'draft':
                return 'warning';
            case 'under_review':
            case 'pending':
                return 'info';
            case 'rejected':
                return 'error';
            default:
                return 'neutral';
        }
    };

    // Filter categories list
    const categoryOptions = [
        'all',
        ...Array.from(new Set(assigned.map((a) => a.category).filter(Boolean))),
    ];

    // Filtered assigned items
    const filteredAssigned = assigned.filter((item) => {
        const matchesCategory =
            selectedCategoryFilter === 'all' ||
            item.category === selectedCategoryFilter;
        const matchesSearch =
            !searchQuery ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details &&
                item.details.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    // Unassigned catalogue items for modal
    const assignedAmenityIds = new Set(assigned.map((a) => a.amenity_id));
    const unassignedCatalogue = catalogue
        .map((cat) => ({
            ...cat,
            amenities: cat.amenities.filter(
                (a) => !assignedAmenityIds.has(a.id),
            ),
        }))
        .filter((cat) => cat.amenities.length > 0);

    const filteredModalCatalogue = unassignedCatalogue
        .map((cat) => ({
            ...cat,
            amenities: cat.amenities.filter(
                (a) =>
                    !modalSearchQuery ||
                    a.name
                        .toLowerCase()
                        .includes(modalSearchQuery.toLowerCase()),
            ),
        }))
        .filter((cat) => cat.amenities.length > 0);

    const approvedCount = assigned.filter((a) => {
        const st = (a.status || a.moderation_status || '').toLowerCase();
        return st === 'approved' || st === 'verified';
    }).length;
    const pendingCount = assigned.filter((a) => {
        const st = (a.status || a.moderation_status || 'pending').toLowerCase();
        return st === 'draft' || st === 'under_review' || st === 'pending';
    }).length;

    return (
        <RequireAuth role="partner">
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <AppHeader
                    title="Amenities Management"
                    subtitle="Verified Facilities & Inclusions"
                    showBack
                    fallbackRoute={`/(partner)/properties/${propertyId}/edit`}
                    rightElement={
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setIsAddModalOpen(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Add Amenity"
                        >
                            <Plus size={20} color={Colors.surface} />
                        </TouchableOpacity>
                    }
                />

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading amenities...</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                >
                    {/* KPI Metrics */}
                    <View style={styles.metricsRow}>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricLabel}>
                                Total Assigned
                            </Text>
                            <Text style={styles.metricValue}>
                                {assigned.length}
                            </Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Text
                                style={[
                                    styles.metricLabel,
                                    { color: Colors.success },
                                ]}
                            >
                                Approved
                            </Text>
                            <Text
                                style={[
                                    styles.metricValue,
                                    { color: Colors.success },
                                ]}
                            >
                                {approvedCount}
                            </Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Text
                                style={[
                                    styles.metricLabel,
                                    { color: Colors.warning },
                                ]}
                            >
                                In Review
                            </Text>
                            <Text
                                style={[
                                    styles.metricValue,
                                    { color: Colors.warning },
                                ]}
                            >
                                {pendingCount}
                            </Text>
                        </View>
                    </View>

                    {/* Notice Banner */}
                    <View style={styles.noticeBanner}>
                        <Shield size={18} color={Colors.primary} />
                        <Text style={styles.noticeText}>
                            All listed amenities are included in direct
                            room-type pricing without extra charges to guests.
                        </Text>
                    </View>

                    {/* Search & Filter */}
                    <View style={styles.searchContainer}>
                        <Search
                            size={18}
                            color={Colors.textTertiary}
                            style={styles.searchIcon}
                        />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search assigned amenities..."
                            placeholderTextColor={Colors.textTertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchQuery('')}
                            >
                                <X size={18} color={Colors.textTertiary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Category Filter Chips */}
                    {categoryOptions.length > 1 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterBar}
                        >
                            {categoryOptions.map((cat) => {
                                const active = selectedCategoryFilter === cat;
                                return (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.filterChip,
                                            active && styles.filterChipActive,
                                        ]}
                                        onPress={() =>
                                            setSelectedCategoryFilter(cat)
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                active &&
                                                    styles.filterChipTextActive,
                                            ]}
                                        >
                                            {cat === 'all'
                                                ? 'All Categories'
                                                : cat}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    {/* Amenities List */}
                    {filteredAssigned.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Shield size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>
                                No Amenities Found
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery || selectedCategoryFilter !== 'all'
                                    ? 'No amenities match your current filters.'
                                    : 'Add property amenities from the catalog to build customer trust.'}
                            </Text>
                            <Button
                                title="Add Amenity"
                                onPress={() => setIsAddModalOpen(true)}
                                style={styles.emptyAddButton}
                            />
                        </View>
                    ) : (
                        filteredAssigned.map((item) => (
                            <View key={item.id} style={styles.amenityCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.titleArea}>
                                        <Text style={styles.amenityName}>
                                            {item.name}
                                        </Text>
                                        <Text style={styles.amenityCategory}>
                                            {item.category || 'General'}
                                        </Text>
                                    </View>
                                    <View style={styles.badgesArea}>
                                        <Badge
                                            variant={getStatusVariant(
                                                item.status ||
                                                    item.moderation_status ||
                                                    'pending',
                                            )}
                                            size="sm"
                                        >
                                            {(
                                                item.status ||
                                                item.moderation_status ||
                                                'pending'
                                            ).toUpperCase()}
                                        </Badge>
                                    </View>
                                </View>

                                {item.details ? (
                                    <Text style={styles.amenityDetails}>
                                        {item.details}
                                    </Text>
                                ) : null}

                                <View style={styles.cardFooter}>
                                    <View style={styles.inclusionBadge}>
                                        <Check
                                            size={14}
                                            color={Colors.success}
                                        />
                                        <Text style={styles.inclusionText}>
                                            Included in Rent
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDelete(item)}
                                        accessibilityLabel={`Remove ${item.name}`}
                                    >
                                        <Trash2
                                            size={16}
                                            color={Colors.error}
                                        />
                                        <Text style={styles.deleteText}>
                                            Remove
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Add Amenity Modal */}
            <Modal
                visible={isAddModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsAddModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Add Property Amenity
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsAddModalOpen(false);
                                    setSelectedCatalogAmenity(null);
                                }}
                            >
                                <X size={22} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalSearchContainer}>
                            <Search
                                size={16}
                                color={Colors.textTertiary}
                                style={styles.searchIcon}
                            />
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="Search catalog amenities..."
                                placeholderTextColor={Colors.textTertiary}
                                value={modalSearchQuery}
                                onChangeText={setModalSearchQuery}
                            />
                        </View>

                        <ScrollView style={styles.modalCatalogueList}>
                            {filteredModalCatalogue.length === 0 ? (
                                <Text style={styles.emptyCatalogText}>
                                    No available catalog amenities match your
                                    search.
                                </Text>
                            ) : (
                                filteredModalCatalogue.map((category) => (
                                    <View
                                        key={category.id}
                                        style={styles.catalogCategoryGroup}
                                    >
                                        <Text
                                            style={styles.catalogCategoryTitle}
                                        >
                                            {category.name}
                                        </Text>
                                        <View style={styles.catalogItemsGrid}>
                                            {category.amenities.map((item) => {
                                                const isSelected =
                                                    selectedCatalogAmenity?.id ===
                                                    item.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={item.id}
                                                        style={[
                                                            styles.catalogAmenityChip,
                                                            isSelected &&
                                                                styles.catalogAmenityChipSelected,
                                                        ]}
                                                        onPress={() =>
                                                            setSelectedCatalogAmenity(
                                                                isSelected
                                                                    ? null
                                                                    : item,
                                                            )
                                                        }
                                                    >
                                                        {isSelected && (
                                                            <Check
                                                                size={14}
                                                                color={
                                                                    Colors.primary
                                                                }
                                                                style={{
                                                                    marginRight: 4,
                                                                }}
                                                            />
                                                        )}
                                                        <Text
                                                            style={[
                                                                styles.catalogAmenityChipText,
                                                                isSelected &&
                                                                    styles.catalogAmenityChipTextSelected,
                                                            ]}
                                                        >
                                                            {item.name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        {selectedCatalogAmenity && (
                            <View style={styles.selectedDetailArea}>
                                <Text style={styles.selectedAmenityLabel}>
                                    Selected:{' '}
                                    <Text style={{ fontWeight: '700' }}>
                                        {selectedCatalogAmenity.name}
                                    </Text>
                                </Text>
                                <TextInput
                                    style={styles.detailsInput}
                                    placeholder="Optional notes or details (e.g. operational hours, brand)..."
                                    placeholderTextColor={Colors.textTertiary}
                                    value={amenityDetails}
                                    onChangeText={setAmenityDetails}
                                    multiline
                                    maxLength={300}
                                />
                            </View>
                        )}

                        <View style={styles.modalFooter}>
                            <Button
                                title="Cancel"
                                variant="outline"
                                onPress={() => {
                                    setIsAddModalOpen(false);
                                    setSelectedCatalogAmenity(null);
                                }}
                                style={{ flex: 1, marginRight: Spacing.sm }}
                            />
                            <Button
                                title={
                                    saving ? 'Assigning...' : 'Assign Amenity'
                                }
                                onPress={handleAssign}
                                disabled={!selectedCatalogAmenity || saving}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
        </RequireAuth>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    backButton: {
        padding: Spacing.xs,
        marginRight: Spacing.xs,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    addButton: {
        backgroundColor: Colors.primary,
        padding: Spacing.xs + 2,
        borderRadius: BorderRadius.full,
    },
    scrollContent: {
        padding: Spacing.md,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    metricCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    metricLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        fontWeight: '600',
        marginBottom: 2,
    },
    metricValue: {
        fontSize: Typography.fontSize.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    noticeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '10',
        padding: Spacing.sm + 2,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        gap: Spacing.xs,
    },
    noticeText: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: '500',
        lineHeight: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.sm,
        marginBottom: Spacing.sm,
        height: 42,
    },
    searchIcon: {
        marginRight: Spacing.xs,
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
    },
    filterBar: {
        gap: Spacing.xs,
        paddingBottom: Spacing.sm,
    },
    filterChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterChipText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    filterChipTextActive: {
        color: Colors.surface,
        fontWeight: '700',
    },
    emptyContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginTop: Spacing.md,
    },
    emptySubtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    emptyAddButton: {
        minWidth: 180,
    },
    amenityCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    titleArea: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    amenityName: {
        fontSize: Typography.fontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    amenityCategory: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    badgesArea: {
        alignItems: 'flex-end',
    },
    amenityDetails: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
        lineHeight: 18,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.sm,
        paddingTop: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: Colors.border + '60',
    },
    inclusionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    inclusionText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.success,
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: Spacing.xs,
    },
    deleteText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.error,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        maxHeight: '85%',
        padding: Spacing.md,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    modalTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    modalSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.sm,
        marginBottom: Spacing.sm,
        height: 38,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
    },
    modalCatalogueList: {
        maxHeight: 280,
    },
    emptyCatalogText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        textAlign: 'center',
        padding: Spacing.md,
    },
    catalogCategoryGroup: {
        marginBottom: Spacing.sm,
    },
    catalogCategoryTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.textSecondary,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    catalogItemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    catalogAmenityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    catalogAmenityChipSelected: {
        backgroundColor: Colors.primary + '15',
        borderColor: Colors.primary,
    },
    catalogAmenityChipText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textPrimary,
    },
    catalogAmenityChipTextSelected: {
        color: Colors.primary,
        fontWeight: '700',
    },
    selectedDetailArea: {
        marginTop: Spacing.sm,
        padding: Spacing.sm,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
    },
    selectedAmenityLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    detailsInput: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.xs + 2,
        fontSize: Typography.fontSize.xs,
        color: Colors.textPrimary,
        height: 50,
        textAlignVertical: 'top',
    },
    modalFooter: {
        flexDirection: 'row',
        marginTop: Spacing.md,
    },
});
