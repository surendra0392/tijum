import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OwnerApi } from '../../../src/api/owner';
import { CaseMessage, OwnerCase } from '../../../src/api/types';
import { Badge } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    MessageSquare,
    Send,
    Shield,
    User,
} from 'lucide-react-native';

export default function CaseDetailScreen() {
    const router = useRouter();
    const { reference } = useLocalSearchParams<{ reference: string }>();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [caseDetail, setCaseDetail] = useState<OwnerCase | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);

    const fetchCase = async () => {
        if (!reference) return;
        try {
            const res = await OwnerApi.getCase(reference);
            if (res.data) {
                setCaseDetail(res.data);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load case details.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCase();
    }, [reference]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchCase();
    };

    const handleSendMessage = async () => {
        if (!replyText.trim() || !reference) return;

        setSending(true);
        try {
            await OwnerApi.addCaseMessage(reference, replyText.trim());
            setReplyText('');
            fetchCase();
        } catch (error: any) {
            Alert.alert('Send Failed', error.message || 'Could not send message.');
        } finally {
            setSending(false);
        }
    };

    const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'error' | 'neutral' => {
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

    const messages = caseDetail?.messages || [];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    accessibilityLabel="Back to Cases"
                >
                    <ArrowLeft size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{reference}</Text>
                    <Text style={styles.headerSubtitle}>
                        {caseDetail?.type || 'Customer Protection'}
                    </Text>
                </View>
                {caseDetail?.status && (
                    <Badge variant={getStatusVariant(caseDetail.status)} size="sm">
                        {caseDetail.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                )}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading case timeline...</Text>
                </View>
            ) : !caseDetail ? (
                <View style={styles.centered}>
                    <AlertCircle size={40} color={Colors.textTertiary} />
                    <Text style={styles.emptyTitle}>Case Not Found</Text>
                    <Text style={styles.emptySubtitle}>Could not retrieve details for {reference}.</Text>
                </View>
            ) : (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                    >
                        {/* Case Overview Card */}
                        <View style={styles.overviewCard}>
                            <Text style={styles.caseTitleText}>{caseDetail.title}</Text>

                            {(caseDetail.booking_reference || caseDetail.guest_name || caseDetail.property_name) && (
                                <View style={styles.contextGrid}>
                                    {caseDetail.property_name ? (
                                        <View style={styles.contextRow}>
                                            <Text style={styles.contextLabel}>Property:</Text>
                                            <Text style={styles.contextValue}>{caseDetail.property_name}</Text>
                                        </View>
                                    ) : null}
                                    {caseDetail.booking_reference ? (
                                        <View style={styles.contextRow}>
                                            <Text style={styles.contextLabel}>Booking Ref:</Text>
                                            <Text style={styles.contextValueBold}>{caseDetail.booking_reference}</Text>
                                        </View>
                                    ) : null}
                                    {caseDetail.guest_name ? (
                                        <View style={styles.contextRow}>
                                            <Text style={styles.contextLabel}>Guest Name:</Text>
                                            <Text style={styles.contextValue}>{caseDetail.guest_name}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            )}

                            {caseDetail.resolution ? (
                                <View style={styles.resolutionBox}>
                                    <CheckCircle2 size={16} color={Colors.success} />
                                    <View style={{ flex: 1, marginLeft: Spacing.xs }}>
                                        <Text style={styles.resolutionTitle}>Resolution Note</Text>
                                        <Text style={styles.resolutionText}>{caseDetail.resolution}</Text>
                                    </View>
                                </View>
                            ) : null}
                        </View>

                        {/* Chronological Message Timeline */}
                        <View style={styles.timelineHeader}>
                            <MessageSquare size={16} color={Colors.primary} />
                            <Text style={styles.timelineTitle}>
                                Discussion & Evidence Timeline ({messages.length})
                            </Text>
                        </View>

                        {messages.length === 0 ? (
                            <View style={styles.emptyTimeline}>
                                <Text style={styles.emptyTimelineText}>
                                    No communication messages logged yet. Post an update below.
                                </Text>
                            </View>
                        ) : (
                            messages.map((msg) => {
                                const isHost = msg.is_owner || msg.sender_role?.toLowerCase() === 'owner';
                                const isAdmin = msg.sender_role?.toLowerCase() === 'admin' || msg.sender_role?.toLowerCase() === 'support';

                                return (
                                    <View
                                        key={msg.id}
                                        style={[
                                            styles.messageBubble,
                                            isHost ? styles.hostBubble : isAdmin ? styles.adminBubble : styles.guestBubble,
                                        ]}
                                    >
                                        <View style={styles.bubbleHeader}>
                                            <Text style={styles.senderName}>
                                                {msg.sender_name || (isHost ? 'You (Host)' : isAdmin ? 'TIJUM Support' : 'Guest')}
                                            </Text>
                                            <Text style={styles.senderRole}>
                                                {isHost ? 'HOST' : isAdmin ? 'TIJUM DESK' : 'GUEST'}
                                            </Text>
                                        </View>
                                        <Text style={styles.messageContent}>{msg.message}</Text>
                                        <Text style={styles.messageTime}>{msg.created_at}</Text>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>

                    {/* Reply Input Bar */}
                    <View style={styles.replyBar}>
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
                                (!replyText.trim() || sending) && styles.sendButtonDisabled,
                            ]}
                            onPress={handleSendMessage}
                            disabled={!replyText.trim() || sending}
                            accessibilityLabel="Send Message"
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color={Colors.surface} />
                            ) : (
                                <Send size={18} color={Colors.surface} />
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
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
