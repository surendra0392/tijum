import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OwnerApi } from '../../../../src/api/owner';
import { PropertyMediaItem } from '../../../../src/api/types';
import { Badge } from '../../../../src/components/Badge';
import { Button } from '../../../../src/components/Button';
import { Input } from '../../../../src/components/Input';
import { Colors } from '../../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../../src/theme/spacing';
import { Typography } from '../../../../src/theme/typography';
import {
    AlertCircle,
    ArrowLeft,
    Camera,
    CheckCircle2,
    Image as ImageIcon,
    MoreVertical,
    Plus,
    Star,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react-native';

const MEDIA_CATEGORIES = [
    { value: 'all', label: 'All Photos' },
    { value: 'exterior', label: 'Exterior' },
    { value: 'entrance', label: 'Entrance' },
    { value: 'reception', label: 'Reception' },
    { value: 'common_area', label: 'Common Area' },
    { value: 'dining', label: 'Dining Area' },
    { value: 'room_interior', label: 'Room Interior' },
    { value: 'bathroom', label: 'Bathroom' },
    { value: 'other', label: 'Other' },
];

export default function PropertyMediaScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const propertyId = Number(id);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mediaList, setMediaList] = useState<PropertyMediaItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [propertyName, setPropertyName] = useState<string>('');

    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadCategory, setUploadCategory] = useState('exterior');
    const [uploadAltText, setUploadAltText] = useState('');
    const [uploadMakeCover, setUploadMakeCover] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Edit Modal State
    const [editingMedia, setEditingMedia] = useState<PropertyMediaItem | null>(null);
    const [editAltText, setEditAltText] = useState('');
    const [editMakeCover, setEditMakeCover] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);

    const fetchMedia = async () => {
        try {
            setLoading(true);
            const [mediaRes, propRes] = await Promise.all([
                OwnerApi.getMedia(propertyId),
                OwnerApi.getProperty(propertyId).catch(() => null),
            ]);

            if (mediaRes && Array.isArray(mediaRes.data)) {
                setMediaList(mediaRes.data);
            }
            if (propRes?.data?.name) {
                setPropertyName(propRes.data.name);
            }
        } catch (error: any) {
            Alert.alert(
                'Failed to load media',
                error?.message || 'Could not retrieve property photographs.',
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (propertyId) {
            fetchMedia();
        }
    }, [propertyId]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchMedia();
    };

    const handleSetCover = async (media: PropertyMediaItem) => {
        try {
            await OwnerApi.updateMedia(propertyId, media.id, {
                alt_text: media.alt_text || 'Property photo',
                category: media.media_type,
                make_cover: true,
            });
            Alert.alert('Success', 'Cover image updated successfully.');
            fetchMedia();
        } catch (err: any) {
            Alert.alert('Update Failed', err?.message || 'Could not update cover image.');
        }
    };

    const handleDelete = (media: PropertyMediaItem) => {
        Alert.alert(
            'Delete Photograph',
            'Are you sure you want to remove this photograph from your property listing?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await OwnerApi.deleteMedia(propertyId, media.id);
                            setMediaList((prev) => prev.filter((m) => m.id !== media.id));
                            Alert.alert('Deleted', 'Photograph removed successfully.');
                        } catch (err: any) {
                            Alert.alert('Deletion Failed', err?.message || 'Could not delete photograph.');
                        }
                    },
                },
            ],
        );
    };

    const handleOpenEdit = (media: PropertyMediaItem) => {
        setEditingMedia(media);
        setEditAltText(media.alt_text);
        setEditMakeCover(Boolean(media.is_cover));
    };

    const handleSaveEdit = async () => {
        if (!editingMedia) return;
        if (!editAltText.trim()) {
            Alert.alert('Validation Error', 'Alt text cannot be empty.');
            return;
        }

        try {
            setSavingEdit(true);
            await OwnerApi.updateMedia(propertyId, editingMedia.id, {
                alt_text: editAltText.trim(),
                category: editingMedia.media_type,
                make_cover: editMakeCover,
            });
            setEditingMedia(null);
            fetchMedia();
            Alert.alert('Updated', 'Photograph details saved successfully.');
        } catch (err: any) {
            Alert.alert('Save Failed', err?.message || 'Could not update photograph details.');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleSimulatedUpload = async () => {
        if (!uploadAltText.trim()) {
            setUploadError('Descriptive alt text is required for accessibility.');
            return;
        }

        setUploadError(null);
        setUploading(true);

        try {
            // In React Native / Expo environment, create a FormData payload
            const formData = new FormData();
            // Create simulated file entry adhering to backend validation (mimes: jpeg, jpg, png, webp)
            const simulatedFile = {
                uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                name: `photo_${Date.now()}.png`,
                type: 'image/png',
            };
            formData.append('file', simulatedFile as any);
            formData.append('category', uploadCategory);
            formData.append('alt_text', uploadAltText.trim());
            if (uploadMakeCover) {
                formData.append('make_cover', '1');
            }

            await OwnerApi.uploadMedia(propertyId, formData);
            setIsUploadModalOpen(false);
            setUploadAltText('');
            setUploadMakeCover(false);
            fetchMedia();
            Alert.alert('Uploaded', 'Photograph uploaded successfully for verification.');
        } catch (err: any) {
            setUploadError(err?.message || 'Failed to upload photograph. Ensure file is under 12MB.');
        } finally {
            setUploading(false);
        }
    };

    const filteredMedia = mediaList.filter((m) => {
        if (selectedCategory === 'all') return true;
        return m.media_type === selectedCategory;
    });

    const coverPhoto = mediaList.find((m) => m.is_cover);

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
                    <Text style={styles.headerTitle}>Property Photographs</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                        {propertyName || `Property #${propertyId}`}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setIsUploadModalOpen(true)}
                    activeOpacity={0.8}
                >
                    <Plus size={16} color={Colors.white} />
                    <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
            </View>

            {/* Overview Metric Strip */}
            <View style={styles.metricStrip}>
                <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>{mediaList.length}</Text>
                    <Text style={styles.metricLabel}>Total Photos</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                    <Text
                        style={[
                            styles.metricValue,
                            { color: coverPhoto ? Colors.emerald : Colors.rose },
                        ]}
                    >
                        {coverPhoto ? 'Set' : 'Missing'}
                    </Text>
                    <Text style={styles.metricLabel}>Cover Photo</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                        {mediaList.filter((m) => m.moderation_status === 'approved').length}
                    </Text>
                    <Text style={styles.metricLabel}>Verified</Text>
                </View>
            </View>

            {/* Category Filter Chips */}
            <View style={styles.filterBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.base }}>
                    {MEDIA_CATEGORIES.map((cat) => {
                        const count = cat.value === 'all'
                            ? mediaList.length
                            : mediaList.filter((m) => m.media_type === cat.value).length;
                        const isSelected = selectedCategory === cat.value;
                        return (
                            <TouchableOpacity
                                key={cat.value}
                                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                                onPress={() => setSelectedCategory(cat.value)}
                            >
                                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                                    {cat.label} ({count})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Photos List / Grid */}
            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                    <Text style={styles.loadingText}>Loading photographs...</Text>
                </View>
            ) : filteredMedia.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                        <Camera size={36} color={Colors.deepPlum} />
                    </View>
                    <Text style={styles.emptyTitle}>No Photographs Found</Text>
                    <Text style={styles.emptySubtitle}>
                        {selectedCategory === 'all'
                            ? 'Upload high-resolution property exterior, entrance, dining, and room photographs to attract guests.'
                            : `No photos uploaded under category "${selectedCategory}".`}
                    </Text>
                    <Button
                        title="Upload Photograph"
                        onPress={() => setIsUploadModalOpen(true)}
                        style={{ marginTop: Spacing.lg, width: 200 }}
                    />
                </View>
            ) : (
                <FlatList
                    data={filteredMedia}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    renderItem={({ item }) => (
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

                                {/* Cover Badge */}
                                {item.is_cover && (
                                    <View style={styles.coverBadge}>
                                        <Star size={12} color={Colors.white} fill={Colors.white} />
                                        <Text style={styles.coverBadgeText}>PRIMARY COVER</Text>
                                    </View>
                                )}

                                {/* Moderation Status Badge */}
                                <View style={styles.statusBadgeWrapper}>
                                    <Badge
                                        label={item.moderation_status.toUpperCase()}
                                        variant={
                                            item.moderation_status === 'approved'
                                                ? 'success'
                                                : item.moderation_status === 'rejected'
                                                  ? 'danger'
                                                  : 'warning'
                                        }
                                    />
                                </View>
                            </View>

                            {/* Card Content & Metadata */}
                            <View style={styles.cardDetails}>
                                <Text style={styles.cardCategory}>
                                    {item.media_type_label || item.media_type}
                                </Text>
                                <Text style={styles.cardAlt} numberOfLines={2}>
                                    {item.alt_text}
                                </Text>

                                {item.room_type_name && (
                                    <Text style={styles.cardRoomLink}>
                                        Linked Room: {item.room_type_name}
                                    </Text>
                                )}

                                {/* Action Toolbar */}
                                <View style={styles.cardToolbar}>
                                    {!item.is_cover && (
                                        <TouchableOpacity
                                            style={styles.setCoverBtn}
                                            onPress={() => handleSetCover(item)}
                                        >
                                            <Star size={13} color={Colors.deepPlum} />
                                            <Text style={styles.setCoverBtnText}>Make Cover</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={styles.editBtn}
                                        onPress={() => handleOpenEdit(item)}
                                    >
                                        <Text style={styles.editBtnText}>Edit Alt</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => handleDelete(item)}
                                    >
                                        <Trash2 size={15} color={Colors.rose} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                />
            )}

            {/* Upload Modal */}
            <Modal
                visible={isUploadModalOpen}
                animationType="slide"
                transparent
                onRequestClose={() => setIsUploadModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Upload Photograph</Text>
                                <Text style={styles.modalSubtitle}>
                                    Add a high-clarity photo to your accommodation profile
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsUploadModalOpen(false)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X size={20} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.lg }}>
                            {uploadError && (
                                <View style={styles.errorBanner}>
                                    <AlertCircle size={16} color={Colors.rose} />
                                    <Text style={styles.errorBannerText}>{uploadError}</Text>
                                </View>
                            )}

                            {/* Category Selector */}
                            <Text style={styles.inputLabel}>Visual Category *</Text>
                            <View style={styles.categoryGrid}>
                                {MEDIA_CATEGORIES.filter((c) => c.value !== 'all').map((c) => {
                                    const active = uploadCategory === c.value;
                                    return (
                                        <TouchableOpacity
                                            key={c.value}
                                            style={[styles.categoryOption, active && styles.categoryOptionActive]}
                                            onPress={() => setUploadCategory(c.value)}
                                        >
                                            <Text style={[styles.categoryOptionText, active && styles.categoryOptionTextActive]}>
                                                {c.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Alt Text Input */}
                            <View style={{ marginTop: Spacing.md }}>
                                <Input
                                    label="Descriptive Caption / Alt Text *"
                                    value={uploadAltText}
                                    onChangeText={setUploadAltText}
                                    placeholder="e.g. Spacious Double Sharing Room with study table"
                                    multiline
                                    numberOfLines={2}
                                />
                            </View>

                            {/* Cover Switch */}
                            <View style={styles.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.switchTitle}>Set as Primary Cover</Text>
                                    <Text style={styles.switchSubtitle}>
                                        Featured as main photo in search results and customer explore cards
                                    </Text>
                                </View>
                                <Switch
                                    value={uploadMakeCover}
                                    onValueChange={setUploadMakeCover}
                                    trackColor={{ false: Colors.border, true: Colors.deepPlum }}
                                />
                            </View>

                            {/* Upload Action */}
                            <Button
                                title={uploading ? 'Uploading Photo...' : 'Upload Photograph'}
                                onPress={handleSimulatedUpload}
                                loading={uploading}
                                style={{ marginTop: Spacing.lg }}
                            />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Edit Alt Modal */}
            <Modal
                visible={Boolean(editingMedia)}
                animationType="slide"
                transparent
                onRequestClose={() => setEditingMedia(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Edit Photograph Details</Text>
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
                                <Text style={styles.switchTitle}>Primary Cover Photo</Text>
                                <Text style={styles.switchSubtitle}>
                                    Set this image as property primary cover
                                </Text>
                            </View>
                            <Switch
                                value={editMakeCover}
                                onValueChange={setEditMakeCover}
                                trackColor={{ false: Colors.border, true: Colors.deepPlum }}
                            />
                        </View>

                        <Button
                            title={savingEdit ? 'Saving...' : 'Save Changes'}
                            onPress={handleSaveEdit}
                            loading={savingEdit}
                            style={{ marginTop: Spacing.lg }}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.warmOffWhite || '#FDFBF9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: {
        padding: 4,
        marginRight: Spacing.sm,
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
        color: Colors.textSecondary,
        marginTop: 1,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.md,
        paddingVertical: 7,
        borderRadius: BorderRadius.md,
        gap: 4,
    },
    addBtnText: {
        fontSize: Typography.fontSize.sm,
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
        backgroundColor: Colors.warmCream || '#FFF4EE',
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
        backgroundColor: '#D97706',
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
        paddingVertical: 5,
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
        paddingVertical: 5,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    editBtnText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    deleteBtn: {
        marginLeft: 'auto',
        padding: 6,
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
        backgroundColor: Colors.warmCream || '#FFF4EE',
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
        backgroundColor: '#FEE2E2',
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
