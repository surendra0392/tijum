import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OwnerApi } from '../../../../src/api/owner';
import {
    PhysicalRoom,
    PropertyAvailabilityBlock,
    RoomType,
} from '../../../../src/api/types';
import { Badge } from '../../../../src/components/Badge';
import { Button } from '../../../../src/components/Button';
import { Input } from '../../../../src/components/Input';
import { Colors } from '../../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../../src/theme/spacing';
import { Typography } from '../../../../src/theme/typography';
import {
    ArrowLeft,
    Calendar,
    CalendarOff,
    Lock,
    Plus,
    X,
} from 'lucide-react-native';

export default function PropertyAvailabilityScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const propertyId = Number(id);

    const [blocks, setBlocks] = useState<PropertyAvailabilityBlock[]>([]);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Create Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [scope, setScope] = useState<'property' | 'room_type' | 'room'>(
        'property',
    );
    const [blockType, setBlockType] = useState<
        'closure' | 'maintenance' | 'stop_sell'
    >('maintenance');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<number | null>(
        null,
    );
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (propertyId) {
            void loadData();
        }
    }, [propertyId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [blocksRes, rtRes, roomsRes] = await Promise.all([
                OwnerApi.getAvailabilityBlocks(propertyId),
                OwnerApi.getRoomTypes(propertyId),
                OwnerApi.getPropertyRooms(propertyId),
            ]);

            if (blocksRes.data) {
                setBlocks(blocksRes.data);
            }
            if (rtRes.data) {
                setRoomTypes(rtRes.data);
                if (rtRes.data.length > 0 && !selectedRoomTypeId) {
                    setSelectedRoomTypeId(rtRes.data[0].id);
                }
            }
            if (roomsRes.data) {
                setRooms(roomsRes.data);
                if (roomsRes.data.length > 0 && !selectedRoomId) {
                    setSelectedRoomId(roomsRes.data[0].id);
                }
            }
        } catch (e: any) {
            Alert.alert(
                'Load Failed',
                e.message || 'Unable to retrieve availability blocks.',
            );
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleOpenCreate = () => {
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 86400000)
            .toISOString()
            .split('T')[0];
        setStartDate(today);
        setEndDate(nextWeek);
        setScope('property');
        setBlockType('maintenance');
        setReason('');
        setModalVisible(true);
    };

    const handleCreateBlock = async () => {
        if (
            !startDate.match(/^\d{4}-\d{2}-\d{2}$/) ||
            !endDate.match(/^\d{4}-\d{2}-\d{2}$/)
        ) {
            Alert.alert(
                'Date Format Error',
                'Please enter dates in YYYY-MM-DD format.',
            );
            return;
        }
        if (!reason.trim()) {
            Alert.alert(
                'Validation Error',
                'A reason for the availability block is required.',
            );
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                scope,
                block_type: blockType,
                start_date: startDate,
                end_date: endDate,
                property_room_type_id:
                    scope === 'room_type' ? selectedRoomTypeId : null,
                property_room_id: scope === 'room' ? selectedRoomId : null,
                reason: reason.trim(),
            };

            await OwnerApi.createAvailabilityBlock(propertyId, payload);
            Alert.alert(
                'Block Created',
                'Inventory availability block applied successfully.',
            );
            setModalVisible(false);
            await loadData();
        } catch (e: any) {
            Alert.alert(
                'Block Creation Failed',
                e.message || 'Unable to create block.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelBlock = (block: PropertyAvailabilityBlock) => {
        if (block.is_admin_restriction) {
            Alert.alert(
                'Administrative Restriction',
                'This restriction was applied by TIJUM Platform Administrators and cannot be removed by the partner.',
            );
            return;
        }

        Alert.alert(
            'Cancel Availability Block',
            `Release this ${block.scope_label} block (${block.start_date} to ${block.end_date}) back to bookable inventory?`,
            [
                { text: 'Keep Block', style: 'cancel' },
                {
                    text: 'Cancel Block',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await OwnerApi.cancelAvailabilityBlock(
                                propertyId,
                                block.id,
                                'Cancelled by partner via mobile app',
                            );
                            Alert.alert(
                                'Success',
                                'Availability block cancelled.',
                            );
                            await loadData();
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        }
                    },
                },
            ],
        );
    };

    const renderBlockCard = ({ item }: { item: PropertyAvailabilityBlock }) => {
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.scopeBadgeRow}>
                            <Badge
                                label={item.scope_label.toUpperCase()}
                                variant="secondary"
                            />
                            {item.is_admin_restriction ? (
                                <View style={styles.adminLockBadge}>
                                    <Lock size={11} color={Colors.coral} />
                                    <Text style={styles.adminLockText}>
                                        Admin Restriction
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={styles.blockTypeTitle}>
                            {item.block_type_label || item.block_type}
                        </Text>
                    </View>
                    <Badge
                        label={item.is_active ? 'Active' : item.status}
                        variant={item.is_active ? 'accent' : 'secondary'}
                    />
                </View>

                {/* Scope target name if room type or physical room */}
                {item.room_type_name ? (
                    <Text style={styles.targetLabel}>
                        Target Category: {item.room_type_name}
                    </Text>
                ) : null}
                {item.room_number ? (
                    <Text style={styles.targetLabel}>
                        Target Room: Room {item.room_number}
                    </Text>
                ) : null}

                {/* Dates */}
                <View style={styles.datesRow}>
                    <Calendar size={14} color={Colors.gray500} />
                    <Text style={styles.datesText}>
                        {item.start_date} → {item.end_date}
                    </Text>
                </View>

                {/* Reason */}
                <Text style={styles.reasonText}>Reason: {item.reason}</Text>

                {/* Cancel Button if active & not admin restriction */}
                {item.is_active && !item.is_admin_restriction ? (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={styles.cancelBlockBtn}
                            onPress={() => handleCancelBlock(item)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.cancelBlockBtnText}>
                                Cancel Block (Release Inventory)
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ArrowLeft size={22} color={Colors.deepPlum} />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Text style={styles.headerTitle}>
                        Availability & Blocks
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        Property #{propertyId} •{' '}
                        {blocks.filter((b) => b.is_active).length} Active Blocks
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={handleOpenCreate}
                    activeOpacity={0.8}
                >
                    <Plus size={16} color={Colors.white} />
                    <Text style={styles.addBtnText}>Block</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                    <Text style={styles.loadingText}>
                        Loading availability blocks...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={blocks}
                    keyExtractor={(item: any) => item.id.toString()}
                    renderItem={renderBlockCard}
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
                            <CalendarOff size={48} color={Colors.gray300} />
                            <Text style={styles.emptyTitle}>
                                No Availability Blocks
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                All room categories and physical rooms are open
                                for verified instant guest bookings. You can
                                apply maintenance or seasonal holds anytime.
                            </Text>
                            <Button
                                title="+ Create Inventory Block"
                                variant="primary"
                                onPress={handleOpenCreate}
                                style={{ marginTop: Spacing.md }}
                            />
                        </View>
                    }
                />
            )}

            {/* Create Availability Block Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Block Inventory
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

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Block Scope *</Text>
                            <View style={styles.segmentedRow}>
                                {(
                                    [
                                        {
                                            key: 'property',
                                            label: 'Property-Wide',
                                        },
                                        {
                                            key: 'room_type',
                                            label: 'Room Category',
                                        },
                                        {
                                            key: 'room',
                                            label: 'Specific Room',
                                        },
                                    ] as const
                                ).map((s) => (
                                    <TouchableOpacity
                                        key={s.key}
                                        style={[
                                            styles.segmentBtn,
                                            scope === s.key &&
                                                styles.segmentBtnActive,
                                        ]}
                                        onPress={() => setScope(s.key)}
                                    >
                                        <Text
                                            style={[
                                                styles.segmentText,
                                                scope === s.key &&
                                                    styles.segmentTextActive,
                                            ]}
                                        >
                                            {s.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Target selector if room_type */}
                            {scope === 'room_type' && (
                                <View style={{ marginTop: Spacing.md }}>
                                    <Text style={styles.label}>
                                        Select Room Category *
                                    </Text>
                                    <View style={styles.pillsRow}>
                                        {roomTypes.map((rt) => (
                                            <TouchableOpacity
                                                key={rt.id}
                                                style={[
                                                    styles.pill,
                                                    selectedRoomTypeId ===
                                                        rt.id &&
                                                        styles.pillActive,
                                                ]}
                                                onPress={() =>
                                                    setSelectedRoomTypeId(rt.id)
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.pillText,
                                                        selectedRoomTypeId ===
                                                            rt.id &&
                                                            styles.pillTextActive,
                                                    ]}
                                                >
                                                    {rt.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Target selector if physical room */}
                            {scope === 'room' && (
                                <View style={{ marginTop: Spacing.md }}>
                                    <Text style={styles.label}>
                                        Select Physical Room *
                                    </Text>
                                    <View style={styles.pillsRow}>
                                        {rooms.map((r) => (
                                            <TouchableOpacity
                                                key={r.id}
                                                style={[
                                                    styles.pill,
                                                    selectedRoomId === r.id &&
                                                        styles.pillActive,
                                                ]}
                                                onPress={() =>
                                                    setSelectedRoomId(r.id)
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.pillText,
                                                        selectedRoomId ===
                                                            r.id &&
                                                            styles.pillTextActive,
                                                    ]}
                                                >
                                                    Room {r.room_number}
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
                                Block Reason Type *
                            </Text>
                            <View style={styles.pillsRow}>
                                {(
                                    [
                                        {
                                            key: 'maintenance',
                                            label: 'Maintenance / Repairs',
                                        },
                                        {
                                            key: 'closure',
                                            label: 'Closure',
                                        },
                                        {
                                            key: 'stop_sell',
                                            label: 'Stop Sell',
                                        },
                                    ] as const
                                ).map((t) => (
                                    <TouchableOpacity
                                        key={t.key}
                                        style={[
                                            styles.pill,
                                            blockType === t.key &&
                                                styles.pillActive,
                                        ]}
                                        onPress={() => setBlockType(t.key)}
                                    >
                                        <Text
                                            style={[
                                                styles.pillText,
                                                blockType === t.key &&
                                                    styles.pillTextActive,
                                            ]}
                                        >
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View
                                style={[
                                    styles.datesInputRow,
                                    { marginTop: Spacing.md },
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Start Date (YYYY-MM-DD) *"
                                        placeholder="2026-11-20"
                                        value={startDate}
                                        onChangeText={setStartDate}
                                    />
                                </View>
                                <View
                                    style={{ flex: 1, marginLeft: Spacing.sm }}
                                >
                                    <Input
                                        label="End Date (YYYY-MM-DD) *"
                                        placeholder="2026-11-27"
                                        value={endDate}
                                        onChangeText={setEndDate}
                                    />
                                </View>
                            </View>

                            <Input
                                label="Operational Notes / Reason *"
                                placeholder="e.g. Annual painting or scheduled AC renovation"
                                value={reason}
                                onChangeText={setReason}
                            />

                            <View style={{ marginTop: Spacing.lg }}>
                                <Button
                                    title="Apply Availability Block"
                                    onPress={handleCreateBlock}
                                    variant="primary"
                                    loading={submitting}
                                />
                            </View>
                        </ScrollView>
                    </View>
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
        marginBottom: Spacing.xs,
    },
    scopeBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: 4,
    },
    adminLockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.cream,
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    adminLockText: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.coral,
        marginLeft: 3,
    },
    blockTypeTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.gray900,
    },
    targetLabel: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.coral,
        marginBottom: Spacing.xs,
    },
    datesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.xs,
    },
    datesText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.gray700,
        marginLeft: 6,
    },
    reasonText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        marginTop: 2,
        lineHeight: 18,
    },
    cardActions: {
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    cancelBlockBtn: {
        alignSelf: 'flex-start',
        paddingVertical: 4,
    },
    cancelBlockBtnText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.rose,
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
    pillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    pill: {
        backgroundColor: Colors.gray100,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    pillActive: {
        backgroundColor: Colors.coral,
        borderColor: Colors.coral,
    },
    pillText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '500',
        color: Colors.gray700,
    },
    pillTextActive: {
        color: Colors.white,
    },
    datesInputRow: {
        flexDirection: 'row',
    },
});
