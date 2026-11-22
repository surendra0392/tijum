import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { OwnerApi } from '../../../src/api/owner';
import { OwnerCase } from '../../../src/api/types';
import { AppHeader } from '../../../src/components/AppHeader';
import { Badge } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { RequireAuth } from '../../../src/components/RequireAuth';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    ImagePlus,
    MessageSquare,
    Send,
    Shield,
    X,
} from 'lucide-react-native';

export default function CaseDetailScreen() {
    const insets = useSafeAreaInsets();
    const { reference } = useLocalSearchParams<{ reference: string }>();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [caseDetail, setCaseDetail] = useState<OwnerCase | null>(null);
    const [replyText, setReplyText] = useState('');
    const [selectedAttachment, setSelectedAttachment] = useState<{
        uri: string;
        name: string;
        type: string;
    } | null>(null);
    const [sending, setSending] = useState(false);

    const fetchCase = async (options?: { silent?: boolean }) => {
        if (!reference) {
            setLoading(false);
            setLoadError('Case reference is missing.');
            return;
        }
        try {
            if (!options?.silent) {
                setLoading(true);
            }
            setLoadError(null);
            const res = await OwnerApi.getCase(reference);
            const data = (res.data as any)?.case || res.data;
            if (data) {
                setCaseDetail(data);
                return;
            }
            setCaseDetail(null);
            setLoadError('Support case not found.');
        } catch (error: any) {
            setCaseDetail(null);
            setLoadError(
                error?.message || 'Failed to load case details.',
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setCaseDetail(null);
        setLoadError(null);
        setSelectedAttachment(null);
        void fetchCase();
    }, [reference]);

    const onRefresh = () => {
        setRefreshing(true);
        void fetchCase({ silent: true });
    };

    const handlePickAttachment = async () => {
        try {
            const perm =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert(
                    'Permission Required',
                    'Allow photo library access to attach evidence images.',
                );
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.85,
            });
            if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                const fileName =
                    asset.fileName || `case-evidence-${Date.now()}.jpg`;
                const mimeType = asset.mimeType || 'image/jpeg';
                setSelectedAttachment({
                    uri: asset.uri,
                    name: fileName,
                    type: mimeType,
                });
            }
        } catch (err: any) {
            Alert.alert(
                'Image Selection Failed',
                err?.message || 'Could not select image from library.',
            );
        }
    };

    const handleSendMessage = async () => {
        if ((!replyText.trim() && !selectedAttachment) || !reference) return;

        setSending(true);
        try {
            if (selectedAttachment) {
                const formData = new FormData();
                formData.append(
                    'message',
                    replyText.trim() || 'Attached evidence photo.',
                );
                if (Platform.OS === 'web') {
                    const blobRes = await fetch(selectedAttachment.uri);
                    const blob = await blobRes.blob();
                    formData.append(
                        'attachment',
                        blob,
                        selectedAttachment.name,
                    );
                } else {
                    formData.append('attachment', {
                        uri: selectedAttachment.uri,
                        name: selectedAttachment.name,
                        type: selectedAttachment.type,
                    } as any);
                }
                await OwnerApi.addCaseMessage(reference, formData);
            } else {
                await OwnerApi.addCaseMessage(reference, replyText.trim());
            }
            setReplyText('');
            setSelectedAttachment(null);
            void fetchCase({ silent: true });
        } catch (error: any) {
            Alert.alert(
                'Send Failed',
                error.message || 'Could not send message.',
            );
        } finally {
            setSending(false);
        }
    };

    const getStatusVariant = (
        status: string,
    ): 'success' | 'warning' | 'info' | 'error' | 'neutral' => {
        switch (status?.toLowerCase()) {
            case 'action_required':
            case 'urgent':
                return 'warning';
            case 'under_review':
            case 'open':
            case 'in_progress':
                return 'info';
            case 'resolved':
            case 'closed':
                return 'success';
            default:
                return 'neutral';
        }
    };

    const getPrioritySlaTarget = (priority?: string) => {
        switch (priority?.toLowerCase()) {
            case 'urgent':
                return {
                    target: '2 Hours',
                    label: 'Urgent Dispute',
                    color: Colors.error,
                    desc: 'Critical guest disruption. First-action response target is within 2 hours.',
                };
            case 'high':
                return {
                    target: '4 Hours',
                    label: 'High Priority',
                    color: Colors.error,
                    desc: 'High severity dispute. First-action response target is within 4 hours.',
                };
            case 'medium':
                return {
                    target: '24 Hours',
                    label: 'Medium Priority',
                    color: Colors.warning,
                    desc: 'Standard grievance. First-action response target is within 24 hours.',
                };
            case 'low':
            default:
                return {
                    target: '48 Hours',
                    label: 'Standard Inquiry',
                    color: Colors.textSecondary,
                    desc: 'Standard question or dispute. First-action response target is within 48 hours.',
                };
        }
    };

    const messages = caseDetail?.messages || [];
    const sla = getPrioritySlaTarget(caseDetail?.priority);
    const isClosed =
        caseDetail?.status?.toLowerCase() === 'resolved' ||
        caseDetail?.status?.toLowerCase() === 'closed';
    const guestName = caseDetail?.customer_name || caseDetail?.guest_name;
    const resolutionText =
        caseDetail?.resolution_summary || caseDetail?.resolution;

    return (
        <RequireAuth role="partner">
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <AppHeader
                    title={reference || 'Case Details'}
                    subtitle={
                        caseDetail?.category_label ||
                        caseDetail?.type ||
                        'Customer Protection'
                    }
                    showBack
                    fallbackRoute="/(partner)/cases"
                    rightAction={
                        caseDetail?.status ? (
                            <Badge
                                variant={getStatusVariant(caseDetail.status)}
                                size="sm"
                                label={(
                                    caseDetail.status_label ||
                                    caseDetail.status.replace(/_/g, ' ')
                                ).toUpperCase()}
                            />
                        ) : undefined
                    }
                />

                {loading && !caseDetail ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>
                            Loading case timeline...
                        </Text>
                    </View>
                ) : !caseDetail ? (
                    <View style={styles.centered}>
                        <AlertCircle size={40} color={Colors.textTertiary} />
                        <Text style={styles.emptyTitle}>
                            {loadError ? 'Case Unavailable' : 'Case Not Found'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {loadError ||
                                `Could not retrieve details for ${reference}.`}
                        </Text>
                        <Button
                            title="Retry"
                            onPress={() => void fetchCase()}
                            style={{ marginTop: Spacing.md }}
                        />
                    </View>
                ) : (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    colors={[Colors.deepPlum]}
                                    tintColor={Colors.deepPlum}
                                />
                            }
                        >
                            {/* Case Overview Card */}
                            <View style={styles.overviewCard}>
                                <Text style={styles.caseTitleText}>
                                    {caseDetail.title ||
                                        caseDetail.category_label ||
                                        'Customer Protection Case'}
                                </Text>

                                {caseDetail.description ? (
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            color: Colors.textSecondary,
                                            lineHeight: 19,
                                            marginTop: 6,
                                            marginBottom: 8,
                                        }}
                                    >
                                        {caseDetail.description}
                                    </Text>
                                ) : null}

                                {(caseDetail.booking_reference ||
                                    guestName ||
                                    caseDetail.property_name) && (
                                    <View style={styles.contextGrid}>
                                        {caseDetail.property_name ? (
                                            <View style={styles.contextRow}>
                                                <Text
                                                    style={styles.contextLabel}
                                                >
                                                    Property:
                                                </Text>
                                                <Text
                                                    style={styles.contextValue}
                                                >
                                                    {caseDetail.property_name}
                                                </Text>
                                            </View>
                                        ) : null}
                                        {caseDetail.booking_reference ? (
                                            <View style={styles.contextRow}>
                                                <Text
                                                    style={styles.contextLabel}
                                                >
                                                    Booking Ref:
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.contextValueBold
                                                    }
                                                >
                                                    {
                                                        caseDetail.booking_reference
                                                    }
                                                </Text>
                                            </View>
                                        ) : null}
                                        {guestName ? (
                                            <View style={styles.contextRow}>
                                                <Text
                                                    style={styles.contextLabel}
                                                >
                                                    Guest Name:
                                                </Text>
                                                <Text
                                                    style={styles.contextValue}
                                                >
                                                    {guestName}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                )}

                                {resolutionText ? (
                                    <View style={styles.resolutionBox}>
                                        <CheckCircle2
                                            size={16}
                                            color={Colors.success}
                                        />
                                        <View
                                            style={{
                                                flex: 1,
                                                marginLeft: Spacing.xs,
                                            }}
                                        >
                                            <Text
                                                style={styles.resolutionTitle}
                                            >
                                                Resolution Summary
                                            </Text>
                                            <Text style={styles.resolutionText}>
                                                {resolutionText}
                                            </Text>
                                        </View>
                                    </View>
                                ) : null}
                            </View>

                        {/* Customer Protection SLA Target Card */}
                        <View style={styles.slaCard}>
                            <View style={styles.slaHeaderRow}>
                                <Clock size={16} color={sla.color} />
                                <Text
                                    style={[
                                        styles.slaTitle,
                                        { color: sla.color },
                                    ]}
                                >
                                    First Action Target:{' '}
                                    {caseDetail.first_action_target_hours
                                        ? `${caseDetail.first_action_target_hours} Hours`
                                        : sla.target}
                                </Text>
                                <Badge
                                    variant={
                                        caseDetail.priority === 'urgent' ||
                                        caseDetail.priority === 'high'
                                            ? 'error'
                                            : caseDetail.priority === 'medium'
                                              ? 'warning'
                                              : 'neutral'
                                    }
                                    size="sm"
                                >
                                    {(
                                        caseDetail.priority || 'standard'
                                    ).toUpperCase()}
                                </Badge>
                            </View>
                            <Text style={styles.slaDesc}>{sla.desc}</Text>
                            {caseDetail.first_action_due_at ? (
                                <Text
                                    style={[
                                        styles.slaStatutoryText,
                                        {
                                            color: sla.color,
                                            marginTop: 4,
                                            fontWeight: '600',
                                        },
                                    ]}
                                >
                                    First action due by:{' '}
                                    {new Date(
                                        caseDetail.first_action_due_at,
                                    ).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                    ,{' '}
                                    {new Date(
                                        caseDetail.first_action_due_at,
                                    ).toLocaleDateString()}
                                </Text>
                            ) : null}
                            <View style={styles.slaDivider} />
                            <View style={styles.slaStatutoryRow}>
                                <Shield size={14} color={Colors.textTertiary} />
                                <Text style={styles.slaStatutoryText}>
                                    Statutory formal acknowledgement within 48h
                                    (
                                    {caseDetail.acknowledgement_due_at
                                        ? new Date(
                                              caseDetail.acknowledgement_due_at,
                                          ).toLocaleDateString()
                                        : 'within 48h'}
                                    ) • Statutory resolution deadline:{' '}
                                    {caseDetail.resolution_due_at ||
                                    caseDetail.sla_due_at
                                        ? new Date(
                                              (caseDetail.resolution_due_at ||
                                                  caseDetail.sla_due_at)!,
                                          ).toLocaleDateString()
                                        : '30 days from filing'}
                                </Text>
                            </View>
                        </View>

                        {/* Chronological Message Timeline */}
                        <View style={styles.timelineHeader}>
                            <MessageSquare size={16} color={Colors.primary} />
                            <Text style={styles.timelineTitle}>
                                Discussion & Evidence Timeline (
                                {messages.length})
                            </Text>
                        </View>

                        {messages.length === 0 ? (
                            <View style={styles.emptyTimeline}>
                                <Text style={styles.emptyTimelineText}>
                                    No communication messages logged yet. Post
                                    an update below.
                                </Text>
                            </View>
                        ) : (
                            messages.map((msg) => {
                                const senderTypeLower = String(
                                    msg.sender_type || '',
                                ).toLowerCase();
                                const senderRoleLower = String(
                                    msg.sender_role || '',
                                ).toLowerCase();
                                const isHost =
                                    Boolean(msg.is_owner) ||
                                    senderTypeLower === 'owner' ||
                                    senderRoleLower === 'owner';
                                const isAdmin =
                                    senderTypeLower === 'admin' ||
                                    senderRoleLower === 'admin' ||
                                    senderRoleLower === 'support';

                                return (
                                    <View
                                        key={msg.id}
                                        style={[
                                            styles.messageBubble,
                                            isHost
                                                ? styles.hostBubble
                                                : isAdmin
                                                  ? styles.adminBubble
                                                  : styles.guestBubble,
                                        ]}
                                    >
                                        <View style={styles.bubbleHeader}>
                                            <Text style={styles.senderName}>
                                                {msg.sender_name ||
                                                    (isHost
                                                        ? 'You (Host)'
                                                        : isAdmin
                                                          ? 'TIJUM Support'
                                                          : 'Guest')}
                                            </Text>
                                            <Text style={styles.senderRole}>
                                                {isHost
                                                    ? 'HOST'
                                                    : isAdmin
                                                      ? 'TIJUM DESK'
                                                      : 'GUEST'}
                                            </Text>
                                        </View>
                                        <Text style={styles.messageContent}>
                                            {msg.message}
                                        </Text>
                                        {msg.attachment_url ? (
                                            <Image
                                                source={{
                                                    uri: msg.attachment_url,
                                                }}
                                                style={{
                                                    width: '100%',
                                                    height: 160,
                                                    borderRadius:
                                                        BorderRadius.sm,
                                                    marginTop: Spacing.xs,
                                                }}
                                                resizeMode="cover"
                                            />
                                        ) : null}
                                        <Text style={styles.messageTime}>
                                            {msg.created_at}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>

                    {/* Reply Input Bar */}
                    {isClosed ? (
                        <View
                            style={{
                                padding: Spacing.md,
                                paddingBottom: Math.max(
                                    insets.bottom,
                                    Spacing.md,
                                ),
                                backgroundColor: '#F0FDF4',
                                borderTopWidth: 1,
                                borderTopColor: '#BBF7D0',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <CheckCircle2 size={16} color="#166534" />
                            <Text
                                style={{
                                    fontSize: 12,
                                    fontWeight: '700',
                                    color: '#166534',
                                }}
                            >
                                This case is marked{' '}
                                {caseDetail.status_label || caseDetail.status}.
                            </Text>
                        </View>
                    ) : (
                        <View
                            style={{
                                backgroundColor: Colors.surface,
                                borderTopWidth: 1,
                                borderTopColor: Colors.border,
                                paddingBottom: Math.max(insets.bottom, 0),
                            }}
                        >
                            {selectedAttachment ? (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingHorizontal: Spacing.md,
                                        paddingTop: Spacing.xs,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: '600',
                                            color: Colors.deepPlum,
                                            flex: 1,
                                        }}
                                        numberOfLines={1}
                                    >
                                        Attached: {selectedAttachment.name}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() =>
                                            setSelectedAttachment(null)
                                        }
                                        style={{
                                            width: 36,
                                            height: 36,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Remove attachment"
                                    >
                                        <X
                                            size={16}
                                            color={Colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                            <View style={styles.replyBar}>
                                <TouchableOpacity
                                    style={{
                                        width: 44,
                                        height: 44,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    onPress={() => void handlePickAttachment()}
                                    accessibilityRole="button"
                                    accessibilityLabel="Attach evidence photo"
                                >
                                    <ImagePlus
                                        size={20}
                                        color={Colors.deepPlum}
                                    />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.replyInput}
                                    placeholder="Type response, evidence, or resolution..."
                                    placeholderTextColor={Colors.textTertiary}
                                    value={replyText}
                                    onChangeText={setReplyText}
                                    multiline
                                    maxLength={1000}
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.sendButton,
                                        ((!replyText.trim() &&
                                            !selectedAttachment) ||
                                            sending) &&
                                            styles.sendButtonDisabled,
                                    ]}
                                    onPress={() => void handleSendMessage()}
                                    disabled={
                                        (!replyText.trim() &&
                                            !selectedAttachment) ||
                                        sending
                                    }
                                    accessibilityLabel="Send Message"
                                    accessibilityRole="button"
                                >
                                    {sending ? (
                                        <ActivityIndicator
                                            size="small"
                                            color={Colors.surface}
                                        />
                                    ) : (
                                        <Send
                                            size={18}
                                            color={Colors.surface}
                                        />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </KeyboardAvoidingView>
            )}
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
        fontSize: Typography.fontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    scrollContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    emptyTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginTop: Spacing.sm,
    },
    emptySubtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    overviewCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    caseTitleText: {
        fontSize: Typography.fontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    contextGrid: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        gap: 4,
    },
    contextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    contextLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    contextValue: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    contextValueBold: {
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: '700',
    },
    resolutionBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.success + '10',
        borderWidth: 1,
        borderColor: Colors.success + '40',
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        marginTop: Spacing.sm,
    },
    resolutionTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.success,
    },
    resolutionText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textPrimary,
        marginTop: 2,
        lineHeight: 16,
    },
    slaCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    slaHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    slaTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        flex: 1,
    },
    slaDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        lineHeight: 16,
    },
    slaDivider: {
        height: 1,
        backgroundColor: Colors.border + '50',
        marginVertical: Spacing.xs + 2,
    },
    slaStatutoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    slaStatutoryText: {
        fontSize: 11,
        color: Colors.textTertiary,
        flex: 1,
    },
    timelineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
        marginTop: Spacing.xs,
    },
    timelineTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    emptyTimeline: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyTimelineText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    messageBubble: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
    },
    hostBubble: {
        backgroundColor: Colors.primary + '10',
        borderColor: Colors.primary + '30',
        alignSelf: 'flex-end',
        maxWidth: '90%',
    },
    guestBubble: {
        backgroundColor: Colors.surface,
        borderColor: Colors.border,
        alignSelf: 'flex-start',
        maxWidth: '90%',
    },
    adminBubble: {
        backgroundColor: Colors.warning + '10',
        borderColor: Colors.warning + '40',
        alignSelf: 'stretch',
    },
    bubbleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    senderName: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    senderRole: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.textTertiary,
    },
    messageContent: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        lineHeight: 20,
    },
    messageTime: {
        fontSize: 10,
        color: Colors.textTertiary,
        marginTop: 6,
        alignSelf: 'flex-end',
    },
    replyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs + 2,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        gap: Spacing.xs,
    },
    replyInput: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs + 2,
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: Colors.primary,
        padding: Spacing.sm,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: Colors.border,
    },
});
