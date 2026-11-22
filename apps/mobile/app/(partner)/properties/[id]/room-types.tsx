import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OwnerApi } from '../../../../src/api/owner';
import { RoomType } from '../../../../src/api/types';
import { Badge } from '../../../../src/components/Badge';
import { Button } from '../../../../src/components/Button';
import { Input } from '../../../../src/components/Input';
import { AppHeader } from '../../../../src/components/AppHeader';
import { RequireAuth } from '../../../../src/components/RequireAuth';
import { Colors } from '../../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../../src/theme/spacing';
import { Typography } from '../../../../src/theme/typography';
import {
    BedDouble,
    DoorClosed,
    Edit2,
    Plus,
    Users,
    Wind,
    X,
} from 'lucide-react-native';

export default function PropertyRoomTypesScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const propertyId = Number(id);

    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state for Add/Edit
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(
        null,
    );
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [mode, setMode] = useState<'shared' | 'private'>('shared');
    const [sharingCapacity, setSharingCapacity] = useState<2 | 3 | 4>(2);
    const [genderPolicy, setGenderPolicy] = useState<
        'all_genders' | 'male_only' | 'female_only'
    >('all_genders');
    const [compositions, setCompositions] = useState<string[]>(['individuals']);
    const [isAirConditioned, setIsAirConditioned] = useState(true);
    const [earlyCheckInEnabled, setEarlyCheckInEnabled] = useState(false);
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (propertyId) {
            void loadRoomTypes();
        }
    }, [propertyId]);

    const loadRoomTypes = async () => {
        try {
            setLoading(true);
            const res = await OwnerApi.getRoomTypes(propertyId);
            if (res.data) {
                setRoomTypes(res.data);
            }
        } catch (e: any) {
            Alert.alert(
                'Failed to Load Room Categories',
                e.message || 'Unable to retrieve room types.',
            );
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRoomTypes();
        setRefreshing(false);
    };

    const handleOpenCreate = () => {
        setEditingRoomType(null);
        setName('');
        setMode('shared');
        setSharingCapacity(2);
        setGenderPolicy('all_genders');
        setCompositions(['individuals']);
        setIsAirConditioned(true);
        setEarlyCheckInEnabled(false);
        setDescription('');
        setModalVisible(true);
    };

    const handleOpenEdit = (rt: RoomType) => {
        setEditingRoomType(rt);
        setName(rt.name);
        setMode(rt.accommodation_mode);
        setSharingCapacity(
            rt.sharing_capacity && rt.sharing_capacity >= 2
                ? (Math.min(4, Math.max(2, rt.sharing_capacity)) as 2 | 3 | 4)
                : 2,
        );
        setGenderPolicy(
            rt.gender_policy === 'male_only' ||
                rt.gender_policy === 'female_only'
                ? rt.gender_policy
                : 'all_genders',
        );
        setCompositions(
            rt.guest_composition_policy &&
                rt.guest_composition_policy.length > 0
                ? rt.guest_composition_policy
                : ['individuals'],
        );
        setIsAirConditioned(rt.is_air_conditioned);
        setEarlyCheckInEnabled(rt.early_check_in_enabled);
        setDescription((rt as { description?: string }).description || '');
        setModalVisible(true);
    };

    const toggleComposition = (comp: string) => {
        if (compositions.includes(comp)) {
            if (compositions.length > 1) {
                setCompositions(compositions.filter((c) => c !== comp));
            }
        } else {
            setCompositions([...compositions, comp]);
        }
    };

    const handleSaveRoomType = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Room type name is required.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                accommodation_mode: mode,
                sharing_capacity: mode === 'shared' ? sharingCapacity : 1,
                gender_policy: genderPolicy,
                guest_composition_policy: compositions,
                is_air_conditioned: isAirConditioned,
                early_check_in_enabled: earlyCheckInEnabled,
                description: description.trim() || undefined,
            };

            if (editingRoomType) {
                await OwnerApi.updateRoomType(
                    propertyId,
                    editingRoomType.id,
                    payload,
                );
                Alert.alert(
                    'Updated',
                    `Room category "${name}" updated successfully.`,
                );
            } else {
                await OwnerApi.createRoomType(propertyId, payload);
                Alert.alert(
                    'Created',
                    `Room category "${name}" added to property.`,
                );
            }

            setModalVisible(false);
            await loadRoomTypes();
        } catch (e: any) {
            Alert.alert(
                'Submission Error',
                e.message || 'Failed to save room type.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (rt: RoomType) => {
        Alert.alert(
            rt.is_active ? 'Deactivate Category' : 'Activate Category',
            `Are you sure you want to ${rt.is_active ? 'deactivate' : 'activate'} "${rt.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: rt.is_active ? 'Deactivate' : 'Activate',
                    style: rt.is_active ? 'destructive' : 'default',
                    onPress: async () => {
                        try {
                            if (rt.is_active) {
                                await OwnerApi.deleteRoomType(
                                    propertyId,
                                    rt.id,
                                    true,
                                );
                            } else {
                                await OwnerApi.updateRoomType(
                                    propertyId,
                                    rt.id,
                                    {
                                        name: rt.name,
                                        accommodation_mode:
                                            rt.accommodation_mode,
                                        sharing_capacity: rt.sharing_capacity,
                                        gender_policy: rt.gender_policy,
                                        guest_composition_policy:
                                            rt.guest_composition_policy || [
                                                'individuals',
                                            ],
                                        is_air_conditioned:
                                            rt.is_air_conditioned,
                                        early_check_in_enabled:
                                            rt.early_check_in_enabled,
                                        is_active: true,
                                    },
                                );
                            }
                            await loadRoomTypes();
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        }
                    },
                },
            ],
        );
    };

    const renderRoomTypeItem = ({ item }: { item: RoomType }) => {
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardSubtitle}>
                            {item.sharing_label ||
                                (item.is_shared
                                    ? `${item.sharing_capacity} Sharing`
                                    : 'Single Room')}{' '}
                            •{' '}
                            {item.is_air_conditioned
                                ? 'Air Conditioned'
                                : 'Non-AC'}
                        </Text>
                    </View>
                    <Badge
                        label={item.is_active ? 'Active' : 'Deactivated'}
                        variant={item.is_active ? 'accent' : 'secondary'}
                    />
                </View>

                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Users size={14} color={Colors.gray500} />
                        <Text style={styles.detailText}>
                            Max{' '}
                            {item.max_guests_per_room || item.sharing_capacity}{' '}
                            Guests
                        </Text>
                    </View>
                    <View style={styles.detailItem}>
                        <DoorClosed size={14} color={Colors.gray500} />
                        <Text style={styles.detailText}>
                            {item.total_rooms ?? 0} Physical Rooms
                        </Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Wind size={14} color={Colors.gray500} />
                        <Text style={styles.detailText}>
                            {item.gender_policy_label || item.gender_policy}
                        </Text>
                    </View>
                </View>

                {/* Price Display */}
                <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Daily Rate:</Text>
                    <Text style={styles.priceValue}>
                        {item.price_daily_paise > 0
                            ? `₹${(item.price_daily_paise / 100).toLocaleString('en-IN')}`
                            : 'Rate Not Set'}
                    </Text>
                </View>

                {/* Card Actions */}
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.actionBtnOutline}
                        onPress={() => handleOpenEdit(item)}
                        activeOpacity={0.8}
                    >
                        <Edit2 size={13} color={Colors.deepPlum} />
                        <Text style={styles.actionBtnOutlineText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtnOutline}
                        onPress={() =>
                            router.push(
                                `/(partner)/properties/${propertyId}/rooms` as any,
                            )
                        }
                        activeOpacity={0.8}
                    >
                        <DoorClosed size={13} color={Colors.deepPlum} />
                        <Text style={styles.actionBtnOutlineText}>Rooms</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionBtnOutline,
                            { borderColor: Colors.gray200 },
                        ]}
                        onPress={() => handleToggleActive(item)}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.actionBtnOutlineText,
                                {
                                    color: item.is_active
                                        ? Colors.rose
                                        : Colors.emerald,
                                },
                            ]}
                        >
                            {item.is_active ? 'Deactivate' : 'Activate'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <RequireAuth role="partner">
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <AppHeader
                    title="Room Categories"
                    subtitle={`Property #${propertyId} • ${roomTypes.length} Configured`}
                    showBack
                    fallbackRoute={`/(partner)/properties/${propertyId}/edit`}
                    rightElement={
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={handleOpenCreate}
                            activeOpacity={0.8}
                        >
                            <Plus size={16} color={Colors.white} />
                            <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                    }
                />

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                    <Text style={styles.loadingText}>
                        Loading room categories...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={roomTypes}
                    keyExtractor={(item: any) => item.id.toString()}
                    renderItem={renderRoomTypeItem}
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
                            <BedDouble size={48} color={Colors.gray300} />
                            <Text style={styles.emptyTitle}>
                                No Room Categories Added
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                Define your accommodation room types (e.g. 2
                                Sharing AC, Single Private Room) to link
                                physical rooms and rates.
                            </Text>
                            <Button
                                title="+ Add First Room Category"
                                variant="primary"
                                onPress={handleOpenCreate}
                                style={{ marginTop: Spacing.md }}
                            />
                        </View>
                    }
                />
            )}

            {/* Add / Edit Room Type Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingRoomType
                                    ? 'Edit Room Category'
                                    : 'Add Room Category'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
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

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingBottom: Spacing.xl,
                            }}
                        >
                            <Input
                                label="Category Name *"
                                placeholder="e.g. 2 Sharing AC Deluxe"
                                value={name}
                                onChangeText={setName}
                            />

                            <Text style={styles.label}>
                                Accommodation Mode *
                            </Text>
                            <View style={styles.segmentedRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.segmentBtn,
                                        mode === 'shared' &&
                                            styles.segmentBtnActive,
                                    ]}
                                    onPress={() => setMode('shared')}
                                >
                                    <Text
                                        style={[
                                            styles.segmentText,
                                            mode === 'shared' &&
                                                styles.segmentTextActive,
                                        ]}
                                    >
                                        Shared Occupancy
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.segmentBtn,
                                        mode === 'private' &&
                                            styles.segmentBtnActive,
                                    ]}
                                    onPress={() => setMode('private')}
                                >
                                    <Text
                                        style={[
                                            styles.segmentText,
                                            mode === 'private' &&
                                                styles.segmentTextActive,
                                        ]}
                                    >
                                        Private Single Room
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {mode === 'shared' && (
                                <View style={{ marginTop: Spacing.md }}>
                                    <Text style={styles.label}>
                                        Sharing Capacity *
                                    </Text>
                                    <View style={styles.segmentedRow}>
                                        {[2, 3, 4].map((num) => (
                                            <TouchableOpacity
                                                key={num}
                                                style={[
                                                    styles.segmentBtn,
                                                    sharingCapacity === num &&
                                                        styles.segmentBtnActive,
                                                ]}
                                                onPress={() =>
                                                    setSharingCapacity(
                                                        num as 2 | 3 | 4,
                                                    )
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.segmentText,
                                                        sharingCapacity ===
                                                            num &&
                                                            styles.segmentTextActive,
                                                    ]}
                                                >
                                                    {num} Sharing
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <Text
                                style={[
                                    styles.label,
                                    { marginTop: Spacing.md },
                                ]}
                            >
                                Gender Eligibility Policy *
                            </Text>
                            <View style={styles.segmentedRow}>
                                {[
                                    {
                                        key: 'all_genders',
                                        label: 'All Genders',
                                    },
                                    { key: 'male_only', label: 'Male Only' },
                                    {
                                        key: 'female_only',
                                        label: 'Female Only',
                                    },
                                ].map((item: any) => (
                                    <TouchableOpacity
                                        key={item.key}
                                        style={[
                                            styles.segmentBtn,
                                            genderPolicy === item.key &&
                                                styles.segmentBtnActive,
                                        ]}
                                        onPress={() =>
                                            setGenderPolicy(item.key as any)
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.segmentText,
                                                genderPolicy === item.key &&
                                                    styles.segmentTextActive,
                                            ]}
                                        >
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text
                                style={[
                                    styles.label,
                                    { marginTop: Spacing.md },
                                ]}
                            >
                                Guest Composition Category *
                            </Text>
                            <View style={styles.tagsRow}>
                                {[
                                    {
                                        key: 'individuals',
                                        label: 'Individuals / Students',
                                    },
                                    { key: 'families', label: 'Families' },
                                    { key: 'couples', label: 'Couples' },
                                    { key: 'groups', label: 'Groups' },
                                ].map((comp) => {
                                    const isSel = compositions.includes(
                                        comp.key,
                                    );
                                    return (
                                        <TouchableOpacity
                                            key={comp.key}
                                            style={[
                                                styles.tagPill,
                                                isSel && styles.tagPillActive,
                                            ]}
                                            onPress={() =>
                                                toggleComposition(comp.key)
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.tagPillText,
                                                    isSel &&
                                                        styles.tagPillTextActive,
                                                ]}
                                            >
                                                {comp.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Toggles */}
                            <View
                                style={[
                                    styles.toggleRow,
                                    { marginTop: Spacing.lg },
                                ]}
                            >
                                <Text style={styles.toggleLabel}>
                                    Air Conditioned (AC)
                                </Text>
                                <Switch
                                    value={isAirConditioned}
                                    onValueChange={setIsAirConditioned}
                                    trackColor={{
                                        false: Colors.gray300,
                                        true: Colors.coral,
                                    }}
                                    thumbColor={Colors.white}
                                />
                            </View>

                            <View style={styles.toggleRow}>
                                <Text style={styles.toggleLabel}>
                                    Early Check-in Enabled (07:00 AM)
                                </Text>
                                <Switch
                                    value={earlyCheckInEnabled}
                                    onValueChange={setEarlyCheckInEnabled}
                                    trackColor={{
                                        false: Colors.gray300,
                                        true: Colors.coral,
                                    }}
                                    thumbColor={Colors.white}
                                />
                            </View>

                            <View style={{ marginTop: Spacing.md }}>
                                <Input
                                    label="Category Description (Optional)"
                                    placeholder="Describe room amenities, study desk, or balcony view"
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={2}
                                />
                            </View>

                            <View style={{ marginTop: Spacing.xl }}>
                                <Button
                                    title={
                                        editingRoomType
                                            ? 'Update Room Category'
                                            : 'Save Room Category'
                                    }
                                    onPress={handleSaveRoomType}
                                    variant="primary"
                                    loading={submitting}
                                />
                            </View>
                        </ScrollView>
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
        backgroundColor: Colors.white,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    backBtn: {
        paddingRight: Spacing.md,
    },
    headerTitleBox: {
        flex: 1,
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    headerSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        marginTop: 2,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    addBtnText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.white,
        marginLeft: 4,
    },
    listContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        padding: Spacing.base,
        marginBottom: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    cardTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.gray900,
    },
    cardSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        marginTop: 2,
    },
    detailsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        marginVertical: Spacing.sm,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        marginLeft: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xs,
        paddingTop: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    priceLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
    },
    priceValue: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.deepPlum,
        marginLeft: 6,
    },
    cardActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    actionBtnOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.deepPlum,
    },
    actionBtnOutlineText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.deepPlum,
        marginLeft: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
    },
    emptyTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.gray800,
        marginTop: Spacing.md,
    },
    emptySubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        textAlign: 'center',
        marginTop: Spacing.xs,
        paddingHorizontal: Spacing.xl,
        lineHeight: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.lg,
        borderTopRightRadius: BorderRadius.lg,
        padding: Spacing.lg,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    modalTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '600',
        color: Colors.gray700,
        marginBottom: Spacing.xs,
    },
    segmentedRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    segmentBtn: {
        flex: 1,
        backgroundColor: Colors.gray100,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    segmentBtnActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    segmentText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.gray700,
    },
    segmentTextActive: {
        color: Colors.white,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    tagPill: {
        backgroundColor: Colors.gray100,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    tagPillActive: {
        backgroundColor: Colors.coral,
        borderColor: Colors.coral,
    },
    tagPillText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '500',
        color: Colors.gray700,
    },
    tagPillTextActive: {
        color: Colors.white,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    toggleLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray800,
    },
});
