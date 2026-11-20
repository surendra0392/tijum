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
import { PhysicalRoom, RoomType } from '../../../../src/api/types';
import { Badge } from '../../../../src/components/Badge';
import { Button } from '../../../../src/components/Button';
import { Input } from '../../../../src/components/Input';
import { Colors } from '../../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../../src/theme/spacing';
import { Typography } from '../../../../src/theme/typography';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    DoorClosed,
    Edit2,
    Layers,
    Plus,
    Wrench,
    X,
} from 'lucide-react-native';

export default function PropertyRoomsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const propertyId = Number(id);

    const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'maintenance' | 'inactive'>('all');

    // Add / Edit Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRoom, setEditingRoom] = useState<PhysicalRoom | null>(null);
    const [roomNumber, setRoomNumber] = useState('');
    const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<number | null>(null);
    const [floorNumber, setFloorNumber] = useState('');
    const [wingName, setWingName] = useState('');
    const [buildingName, setBuildingName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Status Change Modal
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [targetRoom, setTargetRoom] = useState<PhysicalRoom | null>(null);
    const [targetStatus, setTargetStatus] = useState<string>('active');
    const [statusReason, setStatusReason] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        if (propertyId) {
            loadData();
        }
    }, [propertyId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [roomsRes, rtRes] = await Promise.all([
                OwnerApi.getPropertyRooms(propertyId),
                OwnerApi.getRoomTypes(propertyId),
            ]);

            if (roomsRes.data) {
                setRooms(roomsRes.data);
            }
            if (rtRes.data) {
                setRoomTypes(rtRes.data);
                if (rtRes.data.length > 0 && !selectedRoomTypeId) {
                    setSelectedRoomTypeId(rtRes.data[0].id);
                }
            }
        } catch (e: any) {
            Alert.alert('Load Failed', e.message || 'Unable to retrieve physical rooms.');
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
        if (roomTypes.length === 0) {
            Alert.alert(
                'Room Category Required',
                'Please configure at least one room category before adding physical rooms.',
                [
                    {
                        text: 'Add Room Category',
                        onPress: () =>
                            router.push(
                                `/(partner)/properties/${propertyId}/room-types` as any,
                            ),
                    },
                    { text: 'Cancel', style: 'cancel' },
                ],
            );
            return;
        }

        setEditingRoom(null);
        setRoomNumber('');
        setSelectedRoomTypeId(roomTypes[0].id);
        setFloorNumber('');
        setWingName('');
        setBuildingName('');
        setModalVisible(true);
    };

    const handleOpenEdit = (room: PhysicalRoom) => {
        setEditingRoom(room);
        setRoomNumber(room.room_number);
        setSelectedRoomTypeId(room.property_room_type_id);
        setFloorNumber(room.floor ? String(room.floor) : '');
        setWingName('');
        setBuildingName('');
        setModalVisible(true);
    };

    const handleSaveRoom = async () => {
        if (!roomNumber.trim()) {
            Alert.alert('Validation Error', 'Room number is required (e.g., 101 or A-101).');
            return;
        }
        if (!selectedRoomTypeId) {
            Alert.alert('Validation Error', 'Please select a room category.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                room_number: roomNumber.trim(),
                property_room_type_id: selectedRoomTypeId,
                floor_number: floorNumber.trim() || undefined,
                wing_name: wingName.trim() || undefined,
                building_name: buildingName.trim() || undefined,
            };

            if (editingRoom) {
                await OwnerApi.updateRoom(propertyId, editingRoom.id, payload);
                Alert.alert('Updated', `Physical room ${roomNumber} updated.`);
            } else {
                await OwnerApi.createRoom(propertyId, payload);
                Alert.alert('Added', `Physical room ${roomNumber} added to inventory.`);
            }

            setModalVisible(false);
            await loadData();
        } catch (e: any) {
            Alert.alert('Save Error', e.message || 'Failed to save physical room.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenStatusModal = (room: PhysicalRoom) => {
        setTargetRoom(room);
        setTargetStatus(room.is_active ? 'maintenance' : 'active');
        setStatusReason('');
        setStatusModalVisible(true);
    };

    const handleSaveStatus = async () => {
        if (!targetRoom) return;

        setUpdatingStatus(true);
        try {
            await OwnerApi.updateRoomStatus(
                propertyId,
                targetRoom.id,
                targetStatus,
                statusReason.trim() || undefined,
            );
            Alert.alert(
                'Status Updated',
                `Room ${targetRoom.room_number} status set to ${targetStatus}.`,
            );
            setStatusModalVisible(false);
            await loadData();
        } catch (e: any) {
            Alert.alert('Update Failed', e.message || 'Failed to update room operational status.');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const filteredRooms = rooms.filter((r) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') return r.is_active;
        if (statusFilter === 'maintenance') return !r.is_active;
        return true;
    });

    const renderRoomCard = ({ item }: { item: PhysicalRoom }) => {
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.roomBadge}>
                        <DoorClosed size={16} color={Colors.deepPlum} />
                        <Text style={styles.roomNumber}>Room {item.room_number}</Text>
                    </View>
                    <Badge
                        label={item.is_active ? 'Active' : 'Maintenance'}
                        variant={item.is_active ? 'accent' : 'secondary'}
                    />
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.roomTypeLabel}>
                        Category: {item.room_type_name || `Type #${item.property_room_type_id}`}
                    </Text>
                    {item.floor ? (
                        <Text style={styles.floorLabel}>Floor: {item.floor}</Text>
                    ) : null}

                    {item.is_occupied ? (
                        <View style={styles.occupiedBadge}>
                            <Text style={styles.occupiedText}>
                                Occupied • Guest: {item.current_allocation?.guest_name || 'Checked In'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.availableBadge}>
                            <Text style={styles.availableText}>Available for allocation</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleOpenEdit(item)}
                        activeOpacity={0.8}
                    >
                        <Edit2 size={13} color={Colors.deepPlum} />
                        <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: Colors.gray300 }]}
                        onPress={() => handleOpenStatusModal(item)}
                        activeOpacity={0.8}
                    >
                        <Wrench size={13} color={Colors.gray700} />
                        <Text style={[styles.actionBtnText, { color: Colors.gray700 }]}>
                            {item.is_active ? 'Set Maintenance' : 'Set Active'}
                        </Text>
                    </TouchableOpacity>
                </View>
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
                    <Text style={styles.headerTitle}>Physical Rooms</Text>
                    <Text style={styles.headerSubtitle}>
                        Property #{propertyId} • {rooms.length} Units Registered
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={handleOpenCreate}
                    activeOpacity={0.8}
                >
                    <Plus size={16} color={Colors.white} />
                    <Text style={styles.addBtnText}>Add Room</Text>
                </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterBar}>
                {(['all', 'active', 'maintenance'] as const).map((filter) => {
                    const isSelected = statusFilter === filter;
                    return (
                        <TouchableOpacity
                            key={filter}
                            style={[
                                styles.filterPill,
                                isSelected && styles.filterPillActive,
                            ]}
                            onPress={() => setStatusFilter(filter)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.filterPillText,
                                    isSelected && styles.filterPillTextActive,
                                ]}
                            >
                                {filter === 'all'
                                    ? `All (${rooms.length})`
                                    : filter === 'active'
                                      ? `Active (${rooms.filter((r) => r.is_active).length})`
                                      : `Maintenance (${rooms.filter((r) => !r.is_active).length})`}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                    <Text style={styles.loadingText}>Loading physical rooms...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredRooms}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderRoomCard}
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
                            <Layers size={48} color={Colors.gray300} />
                            <Text style={styles.emptyTitle}>No Physical Rooms Found</Text>
                            <Text style={styles.emptySubtitle}>
                                Add individual physical room numbers (e.g. 101, 102) linked to your room categories to enable front-desk check-in.
                            </Text>
                            <Button
                                title="+ Add Physical Room"
                                variant="primary"
                                onPress={handleOpenCreate}
                                style={{ marginTop: Spacing.md }}
                            />
                        </View>
                    }
                />
            )}

            {/* Add / Edit Physical Room Modal */}
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
                                {editingRoom ? 'Edit Physical Room' : 'Add Physical Room'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X size={20} color={Colors.gray600} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Input
                                label="Room Number / Identifier *"
                                placeholder="e.g. 101, A-102"
                                value={roomNumber}
                                onChangeText={setRoomNumber}
                            />

                            <Text style={styles.inputLabel}>
                                Linked Room Category *
                            </Text>
                            <View style={styles.roomTypePills}>
                                {roomTypes.map((rt) => {
                                    const isSel = selectedRoomTypeId === rt.id;
                                    return (
                                        <TouchableOpacity
                                            key={rt.id}
                                            style={[
                                                styles.roomTypePill,
                                                isSel && styles.roomTypePillActive,
                                            ]}
                                            onPress={() => setSelectedRoomTypeId(rt.id)}
                                        >
                                            <Text
                                                style={[
                                                    styles.roomTypePillText,
                                                    isSel && styles.roomTypePillTextActive,
                                                ]}
                                            >
                                                {rt.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Input
                                label="Floor Number (Optional)"
                                placeholder="e.g. 1, 2, Ground"
                                value={floorNumber}
                                onChangeText={setFloorNumber}
                            />
                            <Input
                                label="Wing Name (Optional)"
                                placeholder="e.g. East Wing, Block B"
                                value={wingName}
                                onChangeText={setWingName}
                            />

                            <View style={{ marginTop: Spacing.lg }}>
                                <Button
                                    title={editingRoom ? 'Update Room' : 'Add Room to Inventory'}
                                    onPress={handleSaveRoom}
                                    variant="primary"
                                    loading={submitting}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Change Status Modal */}
            <Modal
                visible={statusModalVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setStatusModalVisible(false)}
            >
                <View style={styles.modalOverlayCenter}>
                    <View style={styles.modalCardCenter}>
                        <Text style={styles.modalTitle}>
                            Change Room {targetRoom?.room_number} Status
                        </Text>
                        <Text style={styles.modalSubtitleDesc}>
                            Update operational state for front-desk allocation:
                        </Text>

                        <View style={styles.statusOptions}>
                            {[
                                { key: 'active', label: 'Active (Bookable)' },
                                { key: 'maintenance', label: 'Maintenance (AC/Plumbing)' },
                                { key: 'blocked', label: 'Blocked (Owner Hold)' },
                                { key: 'inactive', label: 'Inactive' },
                            ].map((opt) => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.statusOptionRow,
                                        targetStatus === opt.key && styles.statusOptionRowActive,
                                    ]}
                                    onPress={() => setTargetStatus(opt.key)}
                                >
                                    <CheckCircle2
                                        size={18}
                                        color={targetStatus === opt.key ? Colors.coral : Colors.gray300}
                                    />
                                    <Text style={styles.statusOptionText}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Input
                            label="Reason / Notes (Optional)"
                            placeholder="e.g. Scheduled painting or repairs"
                            value={statusReason}
                            onChangeText={setStatusReason}
                        />

                        <View style={styles.centerActions}>
                            <Button
                                title="Update Status"
                                onPress={handleSaveStatus}
                                variant="primary"
                                loading={updatingStatus}
                            />
                            <Button
                                title="Cancel"
                                onPress={() => setStatusModalVisible(false)}
                                variant="ghost"
                                style={{ marginTop: Spacing.xs }}
                            />
                        </View>
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
    filterBar: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.gray50,
        gap: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    filterPill: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 5,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    filterPillActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    filterPillText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.gray700,
    },
    filterPillTextActive: {
        color: Colors.white,
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
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    roomBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roomNumber: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.gray900,
        marginLeft: 6,
    },
    cardBody: {
        marginVertical: Spacing.xs,
    },
    roomTypeLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray700,
        fontWeight: '500',
    },
    floorLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        marginTop: 2,
    },
    occupiedBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.cream,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
        marginTop: Spacing.xs,
    },
    occupiedText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.coral,
    },
    availableBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.gray100,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
        marginTop: Spacing.xs,
    },
    availableText: {
        fontSize: 11,
        fontWeight: '500',
        color: Colors.emerald,
    },
    cardActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        paddingTop: Spacing.sm,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.deepPlum,
    },
    actionBtnText: {
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
        maxHeight: '85%',
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
    inputLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '600',
        color: Colors.gray700,
        marginBottom: Spacing.xs,
    },
    roomTypePills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    roomTypePill: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray100,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    roomTypePillActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    roomTypePillText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '500',
        color: Colors.gray700,
    },
    roomTypePillTextActive: {
        color: Colors.white,
    },
    modalOverlayCenter: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalCardCenter: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        width: '100%',
        maxWidth: 400,
    },
    modalSubtitleDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        marginTop: 2,
        marginBottom: Spacing.md,
    },
    statusOptions: {
        marginBottom: Spacing.md,
    },
    statusOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.sm,
    },
    statusOptionRowActive: {
        backgroundColor: Colors.gray50,
    },
    statusOptionText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '500',
        color: Colors.gray800,
        marginLeft: Spacing.sm,
    },
    centerActions: {
        marginTop: Spacing.md,
    },
});
