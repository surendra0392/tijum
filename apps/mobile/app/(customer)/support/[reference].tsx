import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { useLocalSearchParams } from 'expo-router';
import { CustomerApi } from '../../../src/api/customer';
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
    MessageSquare,
    Send,
    Shield,
    ShieldCheck,
} from 'lucide-react-native';

export default function CustomerCaseDetailScreen() {
    const insets = useSafeAreaInsets();
    const { reference } = useLocalSearchParams<{ reference: string }>();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [caseData, setCaseData] = useState<any>(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);

    const fetchCase = async (options?: { silent?: boolean }) => {
        if (!reference) {
            setLoading(false);
            setLoadError('Support case reference is missing.');
            return;
        }
        try {
            if (!options?.silent) {
                setLoading(true);
            }
            setLoadError(null);
            const res = await CustomerApi.getCase(reference);
            const data = (res.data as any)?.case || res.data;
            if (data) {
                setCaseData(data);
                return;
            }
            setCaseData(null);
            setLoadError('Support case not found.');
        } catch (error: any) {
            setCaseData(null);
            setLoadError(
                error?.message || 'Failed to load support case details.',
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setCaseData(null);
        setLoadError(null);
        void fetchCase();
    }, [reference]);

    const onRefresh = () => {
        setRefreshing(true);
        void fetchCase({ silent: true });
    };

    const handleSendMessage = async () => {
        const text = replyText.trim();
        if (!text || !reference) return;

        if (text.length < 2) {
            Alert.alert(
                'Message Too Short',
                'Please enter at least 2 characters.',
            );
            return;
        }

        setSending(true);
        try {
            await CustomerApi.addCaseMessage(reference, text);
            setReplyText('');
            void fetchCase({ silent: true });
        } catch (error: any) {
            Alert.alert(
                'Send Failed',
                error.message || 'Could not send message. Please try again.',
            );
        } finally {
            setSending(false);
        }
    };

    const getStatusVariant = (
        status?: string,
    ): 'accent' | 'secondary' | 'neutral' => {
        switch (status?.toLowerCase()) {
            case 'resolved':
            case 'closed':
                return 'accent';
            default:
                return 'secondary';
        }
    };

    const getPrioritySlaTarget = (priority?: string) => {
        switch (priority?.toLowerCase()) {
            case 'urgent':
                return {
                    target: '2 Hours',
                    label: 'Urgent Disruption',
                    color: Colors.coral,
                    desc: 'Emergency room condition, relocation or safety incident. First response target is within 2 hours.',
                };
            case 'high':
                return {
                    target: '4 Hours',
                    label: 'High Priority',
                    color: Colors.coral,
                    desc: 'Missing meals or major amenity failure. First response target is within 4 hours.',
                };
            case 'medium':
                return {
                    target: '24 Hours',
                    label: 'Medium Priority',
                    color: '#B45309',
                    desc: 'Standard stay issue or billing discrepancy. First response target is within 24 hours.',
                };
            case 'low':
            default:
                return {
                    target: '48 Hours',
                    label: 'Standard Inquiry',
                    color: Colors.gray600,
                    desc: 'General inquiry or feedback. First response target is within 48 hours.',
                };
        }
    };

    const isClosed =
        caseData?.status === 'resolved' || caseData?.status === 'closed';
    const messages = caseData?.messages || [];
    const sla = getPrioritySlaTarget(caseData?.priority);
    const resolutionText =
        caseData?.resolution_summary || caseData?.resolution_notes || null;

    return (
        <RequireAuth role="customer">
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <AppHeader
                    title={reference || 'Case Details'}
                    subtitle={
                        caseData?.category_label ||
                        (caseData?.category
                            ? `Category: ${caseData.category.replace(/_/g, ' ')}`
                            : 'Protection Case')
                    }
                    showBack
                    fallbackRoute="/(customer)/support"
                    rightAction={
                        caseData?.status ? (
                            <Badge
                                label={
                                    caseData.status_label ||
                                    caseData.status.replace(/_/g, ' ')
                                }
                                variant={getStatusVariant(caseData.status)}
                            />
                        ) : undefined
                    }
                />

                {loading && !caseData ? (
                    <View style={styles.centered}>
                        <ActivityIndicator
                            size="large"
                            color={Colors.deepPlum}
                        />
                        <Text style={styles.loadingText}>
                            Loading case details...
                        </Text>
                    </View>
                ) : !caseData ? (
                    <View style={styles.centered}>
                        <AlertCircle size={40} color={Colors.gray400} />
                        <Text style={styles.emptyTitle}>
                            {loadError ? 'Case Unavailable' : 'Case Not Found'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {loadError ||
                                `Could not retrieve case details for reference ${reference}.`}
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
                        {/* Summary Card */}
                        <View style={styles.card}>
                            <View style={styles.cardHeaderRow}>
                                <ShieldCheck size={20} color="#166534" />
                                <Text style={styles.cardTitle}>
                                    Grievance Summary
                                </Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Property:</Text>
                                <Text style={styles.infoValue}>
                                    {caseData.property_name || 'N/A'}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Booking Ref:
                                </Text>
                                <Text style={styles.infoValueBold}>
                                    {caseData.booking_reference || 'N/A'}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Filed On:</Text>
                                <Text style={styles.infoValue}>
                                    {caseData.created_at
                                        ? new Date(
                                              caseData.created_at,
                                          ).toLocaleDateString()
                                        : 'N/A'}
                                </Text>
                            </View>

                            <View style={styles.descBox}>
                                <Text style={styles.descLabel}>
                                    Your Initial Grievance:
                                </Text>
                                <Text style={styles.descText}>
                                    {caseData.description}
                                </Text>
                            </View>

                            {resolutionText ? (
                                <View style={styles.resolutionBox}>
                                    <CheckCircle2 size={16} color="#166534" />
                                    <View
                                        style={{
                                            flex: 1,
                                            marginLeft: Spacing.xs,
                                        }}
                                    >
                                        <Text style={styles.resolutionTitle}>
                                            Resolution Summary:
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
                                    {caseData.first_action_target_hours
                                        ? `${caseData.first_action_target_hours} Hours`
                                        : sla.target}
                                </Text>
                                <Badge
                                    label={(
                                        caseData.priority || 'standard'
                                    ).toUpperCase()}
                                    variant="secondary"
                                />
                            </View>
                            <Text style={styles.slaDesc}>{sla.desc}</Text>
                            {caseData.first_action_due_at ? (
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
                                    First action target due:{' '}
                                    {new Date(
                                        caseData.first_action_due_at,
                                    ).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                    ,{' '}
                                    {new Date(
                                        caseData.first_action_due_at,
                                    ).toLocaleDateString()}
                                </Text>
                            ) : null}
                            <View style={styles.slaDivider} />
                            <View style={styles.slaStatutoryRow}>
                                <Shield size={14} color={Colors.gray500} />
                                <Text style={styles.slaStatutoryText}>
                                    Statutory formal acknowledgement within 48h
                                    (
                                    {caseData.acknowledgement_due_at
                                        ? new Date(
                                              caseData.acknowledgement_due_at,
                                          ).toLocaleDateString()
                                        : 'within 48h'}
                                    ) • Statutory resolution deadline:{' '}
                                    {caseData.resolution_due_at ||
                                    caseData.sla_due_at
                                        ? new Date(
                                              caseData.resolution_due_at ||
                                                  caseData.sla_due_at,
                                          ).toLocaleDateString()
                                        : '30 days from filing'}
                                </Text>
                            </View>
                        </View>

                        {/* Message Timeline */}
                        <View style={styles.timelineHeader}>
                            <MessageSquare size={16} color={Colors.coral} />
                            <Text style={styles.timelineTitle}>
                                Communication & Updates ({messages.length})
                            </Text>
                        </View>

                        {messages.length === 0 ? (
                            <View style={styles.emptyTimeline}>
                                <Text style={styles.emptyTimelineText}>
                                    No updates posted yet. You can post a
                                    message or evidence below.
                                </Text>
                            </View>
                        ) : (
                            messages.map((msg: any) => {
                                const senderTypeLower = String(
                                    msg.sender_type || '',
                                ).toLowerCase();
                                const senderRoleLower = String(
                                    msg.sender_role || '',
                                ).toLowerCase();
                                const isCustomer =
                                    senderTypeLower === 'customer' ||
                                    senderTypeLower === 'user' ||
                                    senderRoleLower === 'user' ||
                                    senderRoleLower === 'customer';
                                const isHost =
                                    senderTypeLower === 'owner' ||
                                    senderTypeLower === 'partner' ||
                                    senderRoleLower === 'owner' ||
                                    senderRoleLower === 'host';

                                return (
                                    <View
                                        key={msg.id}
                                        style={[
                                            styles.messageBubble,
                                            isCustomer
                                                ? styles.customerBubble
                                                : isHost
                                                  ? styles.hostBubble
                                                  : styles.deskBubble,
                                        ]}
                                    >
                                        <View style={styles.bubbleHeader}>
                                            <Text style={styles.senderName}>
                                                {msg.sender_name ||
                                                    (isCustomer
                                                        ? 'You (Guest)'
                                                        : isHost
                                                          ? 'Property Host'
                                                          : 'TIJUM Support Desk')}
                                            </Text>
                                            <Text style={styles.senderRole}>
                                                {isCustomer
                                                    ? 'YOU'
                                                    : isHost
                                                      ? 'HOST'
                                                      : 'TIJUM DESK'}
                                            </Text>
                                        </View>
                                        <Text style={styles.messageContent}>
                                            {msg.message}
                                        </Text>
                                        <Text style={styles.messageTime}>
                                            {msg.created_at
                                                ? new Date(
                                                      msg.created_at,
                                                  ).toLocaleString()
                                                : ''}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>

                    {/* Reply Input Bar */}
                    {isClosed ? (
                        <View style={styles.closedNoticeBar}>
                            <CheckCircle2 size={16} color="#166534" />
                            <Text style={styles.closedNoticeText}>
                                This grievance has been marked {caseData.status}
                                .
                            </Text>
                        </View>
                    ) : (
                        <View
                            style={[
                                styles.replyBar,
                                {
                                    paddingBottom: Math.max(
                                        insets.bottom,
                                        Spacing.sm,
                                    ),
                                },
                            ]}
                        >
                            <TextInput
                                style={styles.replyInput}
                                placeholder="Type your message or update..."
                                placeholderTextColor={Colors.gray400}
                                value={replyText}
                                onChangeText={setReplyText}
                                multiline
                                maxLength={3000}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    (!replyText.trim() || sending) &&
                                        styles.sendButtonDisabled,
                                ]}
                                onPress={handleSendMessage}
                                disabled={!replyText.trim() || sending}
                                accessibilityLabel="Send Message"
                                accessibilityRole="button"
                            >
                                {sending ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={Colors.white}
                                    />
                                ) : (
                                    <Send size={18} color={Colors.white} />
                                )}
                            </TouchableOpacity>
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
        backgroundColor: Colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
        backgroundColor: Colors.white,
    },
    backButton: {
        padding: Spacing.xs,
        marginRight: Spacing.xs,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    headerSubtitle: {
        ...Typography.bodySmall,
        fontSize: 11,
        color: Colors.gray500,
    },
    scrollContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        marginTop: Spacing.sm,
    },
    emptyTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
        marginTop: Spacing.md,
    },
    emptySubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
    card: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    cardTitle: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
    },
    infoLabel: {
        ...Typography.bodySmall,
        color: Colors.gray600,
    },
    infoValue: {
        ...Typography.bodySmall,
        color: Colors.gray800,
    },
    infoValueBold: {
        ...Typography.bodySmall,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    descBox: {
        marginTop: Spacing.sm,
        padding: Spacing.sm,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    descLabel: {
        ...Typography.labelSmall,
        color: Colors.gray500,
        marginBottom: 2,
    },
    descText: {
        ...Typography.bodySmall,
        color: Colors.gray800,
        lineHeight: 18,
    },
    resolutionBox: {
        marginTop: Spacing.sm,
        padding: Spacing.sm,
        backgroundColor: '#F0FDF4',
        borderRadius: BorderRadius.sm,
        borderLeftWidth: 3,
        borderLeftColor: '#166534',
        flexDirection: 'row',
    },
    resolutionTitle: {
        ...Typography.labelSmall,
        color: '#166534',
        fontWeight: '700',
    },
    resolutionText: {
        ...Typography.bodySmall,
        color: Colors.gray700,
        marginTop: 2,
    },
    slaCard: {
        backgroundColor: '#FFF7ED',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    slaHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.xs,
    },
    slaTitle: {
        ...Typography.labelMedium,
        fontWeight: '700',
        flex: 1,
    },
    slaDesc: {
        ...Typography.bodySmall,
        color: Colors.gray700,
        marginTop: 6,
        fontSize: 12,
        lineHeight: 17,
    },
    slaDivider: {
        height: 1,
        backgroundColor: '#FDBA74',
        marginVertical: Spacing.sm,
    },
    slaStatutoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    slaStatutoryText: {
        ...Typography.bodySmall,
        fontSize: 11,
        color: Colors.gray600,
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
        ...Typography.labelMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    emptyTimeline: {
        backgroundColor: Colors.warmOffWhite,
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    emptyTimelineText: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        textAlign: 'center',
    },
    messageBubble: {
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
        borderWidth: 1,
    },
    customerBubble: {
        backgroundColor: '#FFF1F2',
        borderColor: '#FECDD3',
        marginLeft: Spacing.md,
    },
    hostBubble: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
        marginRight: Spacing.md,
    },
    deskBubble: {
        backgroundColor: '#F0FDF4',
        borderColor: '#BBF7D0',
        marginRight: Spacing.md,
    },
    bubbleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    senderName: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    senderRole: {
        fontSize: 9,
        fontWeight: '800',
        color: Colors.gray500,
        letterSpacing: 0.5,
    },
    messageContent: {
        ...Typography.bodySmall,
        color: Colors.gray800,
        lineHeight: 18,
    },
    messageTime: {
        fontSize: 10,
        color: Colors.gray500,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    replyBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: Spacing.sm,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
        gap: Spacing.xs,
    },
    replyInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: Colors.warmOffWhite,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 8,
        ...Typography.bodySmall,
        color: Colors.deepPlum,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.deepPlum,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: Colors.gray300,
    },
    closedNoticeBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: Spacing.md,
        backgroundColor: '#F0FDF4',
        borderTopWidth: 1,
        borderTopColor: '#BBF7D0',
    },
    closedNoticeText: {
        ...Typography.labelSmall,
        color: '#166534',
        fontWeight: '600',
    },
});
