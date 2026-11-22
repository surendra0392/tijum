import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    RefreshControl,
    Switch,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
    Camera,
    Plus,
    Star,
    Trash2,
    Image as ImageIcon,
    AlertCircle,
    X,
    ArrowUp,
    ArrowDown,
    FolderOpen,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../../../src/theme/tokens';
import { Button } from '../../../../src/components/Button';
import { Input } from '../../../../src/components/Input';
import { Badge } from '../../../../src/components/Badge';
import { AppHeader } from '../../../../src/components/AppHeader';
import { RequireAuth } from '../../../../src/components/RequireAuth';
import { OwnerApi } from '../../../../src/api/owner';
import {
    OwnerPropertyMedia,
    OwnerPropertyMediaSummary,
    PropertyMediaCategory,
    OwnerRoomType,
    OwnerPhysicalRoom,
} from '../../../../src/api/types';

const MEDIA_CATEGORIES: { value: PropertyMediaCategory; label: string }[] = [
    { value: 'exterior', label: 'Building Exterior' },
    { value: 'entrance', label: 'Main Entrance' },
    { value: 'reception', label: 'Reception / Front Desk' },
    { value: 'common_area', label: 'Common Area / Lounge' },
    { value: 'dining', label: 'Dining & Kitchen' },
    { value: 'bathroom', label: 'Shared Washroom' },
    { value: 'room_interior', label: 'Room Interior' },
    { value: 'room_arrangement', label: 'Room Arrangement' },
    { value: 'room_furniture', label: 'Room Furniture & Desk' },
    { value: 'room_bathroom', label: 'Attached Washroom' },
    { value: 'other', label: 'Other Facility' },
];

export default function PropertyMediaScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const propertyId = Number(id);

    const [mediaItems, setMediaItems] = useState<OwnerPropertyMedia[]>([]);
    const [summary, setSummary] = useState<OwnerPropertyMediaSummary | null>(null);
    const [roomTypes, setRoomTypes] = useState<OwnerRoomType[]>([]);
    const [physicalRooms, setPhysicalRooms] = useState<OwnerPhysicalRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<string>('all');
    const [actionInFlightId, setActionInFlightId] = useState<number | null>(null);

    // Upload Modal State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadCategory, setUploadCategory] = useState<PropertyMediaCategory>('room_interior');
    const [uploadAltText, setUploadAltText] = useState('');
    const [uploadMakeCover, setUploadMakeCover] = useState(false);
    const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<number | null>(null);
    const [selectedPhysicalRoomId, setSelectedPhysicalRoomId] = useState<number | null>(null);
    const [pickedAsset, setPickedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Edit Alt Modal State
    const [editingMedia, setEditingMedia] = useState<OwnerPropertyMedia | null>(null);
    const [editAltText, setEditAltText] = useState('');
    const [editMakeCover, setEditMakeCover] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);

    const fetchMedia = useCallback(async () => {
        if (!propertyId) return;
        try {
            const [res, rtRes, rmRes] = await Promise.all([
                OwnerApi.getPropertyMedia(propertyId),
                OwnerApi.getRoomTypes(propertyId).catch(() => ({ data: [] as OwnerRoomType[] })),
                OwnerApi.getPropertyRooms(propertyId).catch(() => ({
                    data: [] as OwnerPhysicalRoom[],
                })),
            ]);
            setMediaItems(res.data || []);
            setSummary(res.meta || null);
            setRoomTypes(rtRes.data || []);
            setPhysicalRooms(rmRes.data || []);
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message || 'Unable to load property media gallery.';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [propertyId]);

    useEffect(() => {
        fetchMedia().catch(() => {});
    }, [fetchMedia]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMedia().catch(() => {});
    };

    const handlePickFromLibrary = async () => {
        setUploadError(null);
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            setUploadError('Photo library permission is required to choose a photograph.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setPickedAsset(result.assets[0]);
        }
    };

    const handleCaptureFromCamera = async () => {
        setUploadError(null);
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
            setUploadError('Camera permission is required to capture a photograph.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setPickedAsset(result.assets[0]);
        }
    };

    const handleUploadPhoto = async () => {
        if (!pickedAsset) {
            setUploadError('Please select a photograph from your gallery or camera first.');
            return;
        }
        if (!uploadAltText.trim()) {
            setUploadError('Please provide a descriptive caption / alt text for the photo.');
            return;
        }

        setUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('media_category', uploadCategory);
            formData.append('alt_text', uploadAltText.trim());
            formData.append('is_cover', uploadMakeCover ? '1' : '0');

            if (selectedRoomTypeId) {
                formData.append('property_room_type_id', String(selectedRoomTypeId));
            }
            if (selectedPhysicalRoomId) {
                formData.append('property_room_id', String(selectedPhysicalRoomId));
            }

            const ext = pickedAsset.mimeType?.split('/')[1] || 'jpg';
            const fileName =
                pickedAsset.fileName || `property-${propertyId}-${Date.now()}.${ext}`;
            const mimeType = pickedAsset.mimeType || 'image/jpeg';

            formData.append('file', {
                uri: pickedAsset.uri,
                name: fileName,
                type: mimeType,
            } as unknown as Blob);

            await OwnerApi.uploadMedia(propertyId, formData);

            setShowUploadModal(false);
            setPickedAsset(null);
            setUploadAltText('');
            setUploadMakeCover(false);
            setSelectedRoomTypeId(null);
            setSelectedPhysicalRoomId(null);
            await fetchMedia();
            Alert.alert(
                'Photo Uploaded',
                'Photograph added to property gallery and queued for moderation.',
            );
        } catch (err: unknown) {
            const apiErr = err as {
                response?: {
                    data?: { message?: string; errors?: Record<string, string[]> };
                };
            };
            const firstValidationErr = apiErr?.response?.data?.errors
                ? Object.values(apiErr.response.data.errors)[0]?.[0]
                : null;
            setUploadError(
                firstValidationErr ||
                    apiErr?.response?.data?.message ||
                    'Could not upload image. Ensure the image is JPG/PNG/WEBP under 10MB.',
            );
        } finally {
            setUploading(false);
        }
    };

    const handleSetCover = async (item: OwnerPropertyMedia) => {
        if (item.is_cover || actionInFlightId !== null) return;
        setActionInFlightId(item.id);
        try {
            await OwnerApi.updateMedia(propertyId, item.id, {
                is_cover: true,
                alt_text: item.alt_text,
            });
            await fetchMedia();
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message || 'Failed to update cover photo.';
            Alert.alert('Update Failed', message);
        } finally {
            setActionInFlightId(null);
        }
    };

    const handleMoveMedia = async (index: number, direction: 'up' | 'down') => {
        if (actionInFlightId !== null) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= mediaItems.length) return;

        const nextList = [...mediaItems];
        const temp = nextList[index];
        nextList[index] = nextList[targetIndex];
        nextList[targetIndex] = temp;

        setMediaItems(nextList);
        setActionInFlightId(temp.id);
        try {
            await OwnerApi.reorderMedia(
                propertyId,
                nextList.map((m) => m.id),
            );
            await fetchMedia();
        } catch {
            Alert.alert('Reorder Failed', 'Could not update photo display order.');
            await fetchMedia();
        } finally {
            setActionInFlightId(null);
        }
    };

    const handleOpenEdit = (item: OwnerPropertyMedia) => {
        setEditingMedia(item);
        setEditAltText(item.alt_text || '');
        setEditMakeCover(item.is_cover);
    };

    const handleSaveEdit = async () => {
        if (!editingMedia) return;
        setSavingEdit(true);
        try {
            await OwnerApi.updateMedia(propertyId, editingMedia.id, {
                alt_text: editAltText.trim(),
                is_cover: editMakeCover,
            });
            setEditingMedia(null);
            await fetchMedia();
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message || 'Failed to update media details.';
            Alert.alert('Error', message);
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteMedia = (item: OwnerPropertyMedia) => {
        if (actionInFlightId !== null) return;
        Alert.alert(
            'Delete Photograph',
            'Are you sure you want to permanently remove this photo from your property gallery?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setActionInFlightId(item.id);
                        try {
                            await OwnerApi.deleteMedia(propertyId, item.id);
                            await fetchMedia();
                        } catch (err: unknown) {
                            const message =
                                (err as { response?: { data?: { message?: string } } })
                                    ?.response?.data?.message || 'Failed to delete photograph.';
                            Alert.alert('Error', message);
                        } finally {
                            setActionInFlightId(null);
                        }
                    },
                },
            ],
        );
    };

    const filteredItems =
        selectedFilter === 'all'
            ? mediaItems
            : mediaItems.filter((item) => item.media_category === selectedFilter);

    const getModerationBadgeVariant = (status?: string) => {
        switch (status) {
            case 'approved':
                return 'success';
            case 'rejected':
                return 'error';
            default:
                return 'warning';
        }
    };

    const renderMediaItem = ({
        item,
        index,
    }: {
        item: OwnerPropertyMedia;
        index: number;
    }) => {
        const categoryLabel =
            MEDIA_CATEGORIES.find((c) => c.value === item.media_category)?.label ||
            item.media_category;
        const modStatusLabel = (item.moderation_status || 'pending').toUpperCase();
        const isBusy = actionInFlightId === item.id;

        return (
            <View style={styles.photoCard}>
                <View style={styles.imageContainer}>
                    {item.url ? (
                        <Image
                            source={{ uri: item.url }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.image, styles.placeholderImage]}>
                            <ImageIcon size={32} color={Colors.textSecondary} />
                        </View>
                    )}

                    {item.is_cover && (
                        <View style={styles.coverBadge}>
                            <Star size={12} color={Colors.white} fill={Colors.white} />
                            <Text style={styles.coverBadgeText}>COVER PHOTO</Text>
                        </View>
                    )}

                    <View style={styles.statusBadgeWrapper}>
                        <Badge
                            label={modStatusLabel}
                            variant={getModerationBadgeVariant(item.moderation_status)}
                        />
                    </View>
                </View>

                <View style={styles.cardDetails}>
                    <Text style={styles.cardCategory}>{categoryLabel}</Text>
                    <Text style={styles.cardAlt} numberOfLines={2}>
                        {item.alt_text || 'No caption provided'}
                    </Text>

                    {(item.room_type || item.physical_room) && (
                        <Text style={styles.cardRoomLink}>
                            {item.room_type ? `Type: ${item.room_type.name}` : ''}
                            {item.room_type && item.physical_room ? ' • ' : ''}
                            {item.physical_room
                                ? `Room #${item.physical_room.room_number}`
                                : ''}
                        </Text>
                    )}

                    <View style={styles.cardToolbar}>
                        {!item.is_cover && (
                            <TouchableOpacity
                                style={styles.setCoverBtn}
                                onPress={() => handleSetCover(item)}
                                disabled={isBusy}
                                accessibilityRole="button"
                                accessibilityLabel="Set as cover photo"
                            >
                                <Star size={14} color={Colors.deepPlum} />
                                <Text style={styles.setCoverBtnText}>Set as Cover</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => handleOpenEdit(item)}
                            disabled={isBusy}
                            accessibilityRole="button"
                            accessibilityLabel="Edit photo caption"
                        >
                            <Text style={styles.editBtnText}>Edit Caption</Text>
                        </TouchableOpacity>

                        {selectedFilter === 'all' && mediaItems.length > 1 && (
                            <View style={styles.reorderGroup}>
                                <TouchableOpacity
                                    style={[
                                        styles.reorderBtn,
                                        index === 0 && styles.reorderBtnDisabled,
                                    ]}
                                    onPress={() => handleMoveMedia(index, 'up')}
                                    disabled={index === 0 || isBusy}
                                    accessibilityRole="button"
                                    accessibilityLabel="Move photo earlier"
                                >
                                    <ArrowUp
                                        size={14}
                                        color={
                                            index === 0
                                                ? Colors.textMuted
                                                : Colors.deepPlum
                                        }
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.reorderBtn,
                                        index === mediaItems.length - 1 &&
                                            styles.reorderBtnDisabled,
                                    ]}
                                    onPress={() => handleMoveMedia(index, 'down')}
                                    disabled={index === mediaItems.length - 1 || isBusy}
                                    accessibilityRole="button"
                                    accessibilityLabel="Move photo later"
                                >
                                    <ArrowDown
                                        size={14}
                                        color={
                                            index === mediaItems.length - 1
                                                ? Colors.textMuted
                                                : Colors.deepPlum
                                        }
                                    />
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteMedia(item)}
                            disabled={isBusy}
                            accessibilityRole="button"
                            accessibilityLabel="Delete photograph"
                        >
                            {isBusy ? (
                                <ActivityIndicator size="small" color={Colors.rose} />
                            ) : (
                                <Trash2 size={16} color={Colors.rose} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <RequireAuth role="partner">
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <AppHeader
                    title="Photos & Media Gallery"
                    subtitle={
                        summary
                            ? `${summary.total_count} photos • ${summary.approved_count} approved`
                            : `Property ID: ${propertyId}`
                    }
                    showBack
                    fallbackRoute={`/(partner)/properties/${propertyId}/edit`}
                    rightElement={
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => {
                                setUploadError(null);
                                setShowUploadModal(true);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Add new photograph"
                        >
                            <Plus size={16} color={Colors.white} />
                            <Text style={styles.addBtnText}>Add Photo</Text>
                        </TouchableOpacity>
                    }
                />

                {/* Metric Summary Strip */}
                {summary && (
                    <View style={styles.metricStrip}>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricValue}>{summary.total_count}</Text>
                            <Text style={styles.metricLabel}>Total</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                            <Text style={[styles.metricValue, { color: Colors.emerald }]}>
                                {summary.approved_count}
                            </Text>
                            <Text style={styles.metricLabel}>Approved</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                            <Text style={[styles.metricValue, { color: Colors.warning }]}>
                                {summary.pending_count}
                            </Text>
                            <Text style={styles.metricLabel}>Pending</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                            <Text
                                style={[
                                    styles.metricValue,
                                    {
                                        color: summary.has_cover
                                            ? Colors.emerald
                                            : Colors.rose,
                                    },
                                ]}
                            >
                                {summary.has_cover ? 'Yes' : 'Missing'}
                            </Text>
                            <Text style={styles.metricLabel}>Cover Photo</Text>
                        </View>
                    </View>
                )}

                {/* Category Filter Chips */}
                <View style={styles.filterBar}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: Spacing.base }}
                    >
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                selectedFilter === 'all' && styles.filterChipActive,
                            ]}
                            onPress={() => setSelectedFilter('all')}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    selectedFilter === 'all' && styles.filterChipTextActive,
                                ]}
                            >
                                All Photos ({mediaItems.length})
                            </Text>
                        </TouchableOpacity>
                        {MEDIA_CATEGORIES.map((cat) => {
                            const count = mediaItems.filter(
                                (m) => m.media_category === cat.value,
                            ).length;
                            return (
                                <TouchableOpacity
                                    key={cat.value}
                                    style={[
                                        styles.filterChip,
                                        selectedFilter === cat.value &&
                                            styles.filterChipActive,
                                    ]}
                                    onPress={() => setSelectedFilter(cat.value)}
                                >
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            selectedFilter === cat.value &&
                                                styles.filterChipTextActive,
                                        ]}
                                    >
                                        {cat.label} ({count})
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={Colors.deepPlum} />
                        <Text style={styles.loadingText}>Loading media gallery...</Text>
                    </View>
                ) : filteredItems.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Camera size={32} color={Colors.deepPlum} />
                        </View>
                        <Text style={styles.emptyTitle}>No Photographs Found</Text>
                        <Text style={styles.emptySubtitle}>
                            Upload high-resolution photos of your rooms, exterior, dining
                            area, and washrooms to build guest trust and pass verification.
                        </Text>
                        <Button
                            title="Upload First Photograph"
                            onPress={() => setShowUploadModal(true)}
                            style={{ marginTop: Spacing.md }}
                        />
                    </View>
                ) : (
                    <FlatList
                        data={filteredItems}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={renderMediaItem}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.deepPlum}
                            />
                        }
                    />
                )}

                {/* Upload Modal */}
                <Modal
                    visible={showUploadModal}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setShowUploadModal(false)}
                >
                    <KeyboardAvoidingView
                        style={styles.modalOverlay}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalTitle}>
                                        Upload Property Photograph
                                    </Text>
                                    <Text style={styles.modalSubtitle}>
                                        Select from gallery or capture with camera (max 10MB)
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowUploadModal(false)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close upload modal"
                                >
                                    <X size={20} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {uploadError && (
                                    <View style={styles.errorBanner}>
                                        <AlertCircle size={16} color={Colors.rose} />
                                        <Text style={styles.errorBannerText}>
                                            {uploadError}
                                        </Text>
                                    </View>
                                )}

                                {/* Picker Buttons & Preview */}
                                <Text style={styles.inputLabel}>1. Choose Image File *</Text>
                                <View style={styles.pickerButtonRow}>
                                    <TouchableOpacity
                                        style={styles.pickerBtn}
                                        onPress={handlePickFromLibrary}
                                        accessibilityRole="button"
                                    >
                                        <FolderOpen size={18} color={Colors.deepPlum} />
                                        <Text style={styles.pickerBtnText}>
                                            Choose from Gallery
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.pickerBtn}
                                        onPress={handleCaptureFromCamera}
                                        accessibilityRole="button"
                                    >
                                        <Camera size={18} color={Colors.deepPlum} />
                                        <Text style={styles.pickerBtnText}>Take Photo</Text>
                                    </TouchableOpacity>
                                </View>

                                {pickedAsset ? (
                                    <View style={styles.previewBox}>
                                        <Image
                                            source={{ uri: pickedAsset.uri }}
                                            style={styles.previewImage}
                                            resizeMode="cover"
                                        />
                                        <Text style={styles.previewMeta}>
                                            {pickedAsset.fileName || 'Selected Image'}{' '}
                                            {pickedAsset.width && pickedAsset.height
                                                ? `(${pickedAsset.width}×${pickedAsset.height})`
                                                : ''}
                                        </Text>
                                    </View>
                                ) : null}

                                {/* Category Selection */}
                                <Text style={styles.inputLabel}>2. Photo Category *</Text>
                                <View style={styles.categoryGrid}>
                                    {MEDIA_CATEGORIES.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.value}
                                            style={[
                                                styles.categoryOption,
                                                uploadCategory === cat.value &&
                                                    styles.categoryOptionActive,
                                            ]}
                                            onPress={() => setUploadCategory(cat.value)}
                                        >
                                            <Text
                                                style={[
                                                    styles.categoryOptionText,
                                                    uploadCategory === cat.value &&
                                                        styles.categoryOptionTextActive,
                                                ]}
                                            >
                                                {cat.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Optional Room Type Association */}
                                {roomTypes.length > 0 && (
                                    <>
                                        <Text style={styles.inputLabel}>
                                            3. Link to Room Category (Optional)
                                        </Text>
                                        <View style={styles.categoryGrid}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.categoryOption,
                                                    selectedRoomTypeId === null &&
                                                        styles.categoryOptionActive,
                                                ]}
                                                onPress={() => setSelectedRoomTypeId(null)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.categoryOptionText,
                                                        selectedRoomTypeId === null &&
                                                            styles.categoryOptionTextActive,
                                                    ]}
                                                >
                                                    General Property
                                                </Text>
                                            </TouchableOpacity>
                                            {roomTypes.map((rt) => (
                                                <TouchableOpacity
                                                    key={rt.id}
                                                    style={[
                                                        styles.categoryOption,
                                                        selectedRoomTypeId === rt.id &&
                                                            styles.categoryOptionActive,
                                                    ]}
                                                    onPress={() =>
                                                        setSelectedRoomTypeId(rt.id)
                                                    }
                                                >
                                                    <Text
                                                        style={[
                                                            styles.categoryOptionText,
                                                            selectedRoomTypeId === rt.id &&
                                                                styles.categoryOptionTextActive,
                                                        ]}
                                                    >
                                                        {rt.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                )}

                                {/* Optional Physical Room Association */}
                                {physicalRooms.length > 0 && (
                                    <>
                                        <Text style={styles.inputLabel}>
                                            4. Link to Physical Room (Optional)
                                        </Text>
                                        <View style={styles.categoryGrid}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.categoryOption,
                                                    selectedPhysicalRoomId === null &&
                                                        styles.categoryOptionActive,
                                                ]}
                                                onPress={() =>
                                                    setSelectedPhysicalRoomId(null)
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.categoryOptionText,
                                                        selectedPhysicalRoomId === null &&
                                                            styles.categoryOptionTextActive,
                                                    ]}
                                                >
                                                    None
                                                </Text>
                                            </TouchableOpacity>
                                            {physicalRooms.map((rm) => (
                                                <TouchableOpacity
                                                    key={rm.id}
                                                    style={[
                                                        styles.categoryOption,
                                                        selectedPhysicalRoomId === rm.id &&
                                                            styles.categoryOptionActive,
                                                    ]}
                                                    onPress={() =>
                                                        setSelectedPhysicalRoomId(rm.id)
                                                    }
                                                >
                                                    <Text
                                                        style={[
                                                            styles.categoryOptionText,
                                                            selectedPhysicalRoomId === rm.id &&
                                                                styles.categoryOptionTextActive,
                                                        ]}
                                                    >
                                                        #{rm.room_number}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                )}

                                {/* Caption / Alt Text */}
                                <View style={{ marginTop: Spacing.sm }}>
                                    <Input
                                        label="Descriptive Caption / Alt Text *"
                                        value={uploadAltText}
                                        onChangeText={setUploadAltText}
                                        placeholder="e.g. Spacious 2-sharing room with study desk & balcony"
                                        multiline
                                        numberOfLines={2}
                                    />
                                </View>

                                {/* Cover Toggle */}
                                <View style={styles.switchRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.switchTitle}>
                                            Set as Primary Cover Photo
                                        </Text>
                                        <Text style={styles.switchSubtitle}>
                                            Display this photo first on search cards and
                                            property details
                                        </Text>
                                    </View>
                                    <Switch
                                        value={uploadMakeCover}
                                        onValueChange={setUploadMakeCover}
                                        trackColor={{
                                            false: Colors.border,
                                            true: Colors.deepPlum,
                                        }}
                                    />
                                </View>

                                {/* Upload Action */}
                                <Button
                                    title={
                                        uploading
                                            ? 'Uploading Photo...'
                                            : 'Upload Photograph'
                                    }
                                    onPress={handleUploadPhoto}
                                    loading={uploading}
                                    style={{ marginTop: Spacing.lg }}
                                />
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Edit Alt Modal */}
                <Modal
                    visible={Boolean(editingMedia)}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setEditingMedia(null)}
                >
                    <KeyboardAvoidingView
                        style={styles.modalOverlay}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalTitle}>
                                        Edit Photograph Details
                                    </Text>
                                    <Text style={styles.modalSubtitle}>
                                        Update accessibility caption and cover status
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setEditingMedia(null)}>
                                    <X size={20} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ marginTop: Spacing.md }}>
                                <Input
                                    label="Descriptive Caption / Alt Text *"
                                    value={editAltText}
                                    onChangeText={setEditAltText}
                                    placeholder="Describe photograph contents"
                                    multiline
                                    numberOfLines={2}
                                />
                            </View>

                            <View style={styles.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.switchTitle}>
                                        Primary Cover Photo
                                    </Text>
                                    <Text style={styles.switchSubtitle}>
                                        Set this image as property primary cover
                                    </Text>
                                </View>
                                <Switch
                                    value={editMakeCover}
                                    onValueChange={setEditMakeCover}
                                    trackColor={{
                                        false: Colors.border,
                                        true: Colors.deepPlum,
                                    }}
                                />
                            </View>

                            <Button
                                title={savingEdit ? 'Saving...' : 'Save Changes'}
                                onPress={handleSaveEdit}
                                loading={savingEdit}
                                style={{ marginTop: Spacing.lg }}
                            />
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
        backgroundColor: Colors.surfaceSubtle,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: BorderRadius.md,
        minHeight: 40,
        gap: 4,
    },
    addBtnText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.white,
    },
    metricStrip: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    metricItem: {
        flex: 1,
        alignItems: 'center',
    },
    metricValue: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    metricLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    metricDivider: {
        width: 1,
        height: '80%',
        backgroundColor: Colors.border,
        alignSelf: 'center',
    },
    filterBar: {
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    filterChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.pill,
        backgroundColor: Colors.warmCream,
        marginRight: Spacing.xs,
    },
    filterChipActive: {
        backgroundColor: Colors.deepPlum,
    },
    filterChipText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.deepPlum,
    },
    filterChipTextActive: {
        color: Colors.white,
    },
    listContent: {
        padding: Spacing.base,
        gap: Spacing.md,
    },
    photoCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        height: 180,
        position: 'relative',
        backgroundColor: Colors.border,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.warning,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 4,
    },
    coverBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.white,
    },
    statusBadgeWrapper: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    cardDetails: {
        padding: Spacing.md,
    },
    cardCategory: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.deepPlum,
        textTransform: 'uppercase',
    },
    cardAlt: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        marginTop: 2,
    },
    cardRoomLink: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    cardToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.md,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        gap: Spacing.sm,
    },
    setCoverBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.deepPlum,
        gap: 4,
    },
    setCoverBtnText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.deepPlum,
    },
    editBtn: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    editBtnText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    reorderGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reorderBtn: {
        padding: 6,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceSubtle,
    },
    reorderBtnDisabled: {
        opacity: 0.4,
    },
    deleteBtn: {
        marginLeft: 'auto',
        padding: 8,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    emptyIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.warmCream,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.base,
    },
    emptyTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    emptySubtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    modalTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    modalSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.warningLight,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        gap: Spacing.xs,
    },
    errorBannerText: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.rose,
        fontWeight: '500',
    },
    inputLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
        marginTop: Spacing.xs,
    },
    pickerButtonRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    pickerBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.deepPlum,
        backgroundColor: Colors.peachCream,
        minHeight: 46,
    },
    pickerBtnText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    previewBox: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceSubtle,
    },
    previewImage: {
        width: '100%',
        height: 150,
    },
    previewMeta: {
        padding: Spacing.xs,
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    categoryOption: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.white,
    },
    categoryOptionActive: {
        borderColor: Colors.deepPlum,
        backgroundColor: Colors.deepPlum,
    },
    categoryOptionText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    categoryOptionTextActive: {
        color: Colors.white,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: Colors.border,
        marginTop: Spacing.md,
    },
    switchTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    switchSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
        paddingRight: Spacing.sm,
    },
});
