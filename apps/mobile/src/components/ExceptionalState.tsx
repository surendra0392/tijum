import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import {
    WifiOff,
    SearchX,
    Clock,
    ShieldAlert,
    AlertCircle,
    Sparkles,
    User,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { BorderRadius, Shadows, Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';

export type ExceptionalStateType =
    | 'no-internet'
    | 'no-results'
    | 'session-expired'
    | 'auth-required'
    | 'account-blocked'
    | 'payment-failed'
    | 'resume-booking';

interface ExceptionalStateProps {
    type: ExceptionalStateType;
    title?: string;
    description?: string;
    countdownSeconds?: number;
    primaryActionLabel?: string;
    onPrimaryAction?: () => void;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    style?: ViewStyle;
}

export function ExceptionalState({
    type,
    title,
    description,
    countdownSeconds,
    primaryActionLabel,
    onPrimaryAction,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    style,
}: ExceptionalStateProps) {
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const getConfig = () => {
        switch (type) {
            case 'no-internet':
                return {
                    Icon: WifiOff,
                    iconBg: Colors.peachSoft,
                    iconColor: Colors.coralPrimary,
                    defaultTitle: 'No Internet Connection',
                    defaultDesc:
                        'Please check your Wi-Fi or cellular network settings and try again.',
                    defaultPrimary: 'Retry Connection',
                };
            case 'no-results':
                return {
                    Icon: SearchX,
                    iconBg: Colors.surfaceSubtle,
                    iconColor: Colors.plumDeep,
                    defaultTitle: 'No Matches Found',
                    defaultDesc:
                        'We could not find any stays matching your current filters. Try loosening your criteria or choosing another city.',
                    defaultPrimary: 'Reset Filters',
                };
            case 'session-expired':
                return {
                    Icon: Clock,
                    iconBg: Colors.warningLight,
                    iconColor: Colors.warning,
                    defaultTitle: 'Session Expired',
                    defaultDesc:
                        'Your security session has expired or your account was signed in on another device. Please sign in to continue.',
                    defaultPrimary: 'Sign In Again',
                };
            case 'auth-required':
                return {
                    Icon: User,
                    iconBg: Colors.peachSoft,
                    iconColor: Colors.deepPlum,
                    defaultTitle: 'Sign In to Continue',
                    defaultDesc:
                        'Sign in to access your bookings, saved stays, and account settings.',
                    defaultPrimary: 'Sign In Now',
                };
            case 'account-blocked':
                return {
                    Icon: ShieldAlert,
                    iconBg: Colors.dangerLight,
                    iconColor: Colors.danger,
                    defaultTitle: 'Account Notice',
                    defaultDesc:
                        'Your account has been temporarily restricted for security reasons. Please reach out to TIJUM Support.',
                    defaultPrimary: 'Contact Support',
                };
            case 'payment-failed':
                return {
                    Icon: AlertCircle,
                    iconBg: Colors.dangerLight,
                    iconColor: Colors.danger,
                    defaultTitle: 'Payment Unsuccessful',
                    defaultDesc:
                        'The transaction could not be completed by your bank. Your room hold remains active for a limited time.',
                    defaultPrimary: 'Try Payment Again',
                };
            case 'resume-booking':
                return {
                    Icon: Clock,
                    iconBg: Colors.peachSoft,
                    iconColor: Colors.coralPrimary,
                    defaultTitle: 'Complete Your Stay Booking',
                    defaultDesc:
                        'Your room inventory is currently on hold. Complete your booking before the timer expires to secure your spot.',
                    defaultPrimary: 'Resume Booking',
                };
            default:
                return {
                    Icon: Sparkles,
                    iconBg: Colors.peachSoft,
                    iconColor: Colors.coralPrimary,
                    defaultTitle: 'Attention Needed',
                    defaultDesc: '',
                    defaultPrimary: 'Continue',
                };
        }
    };

    const config = getConfig();
    const IconComponent = config.Icon;

    return (
        <View style={[styles.container, style]}>
            <View
                style={[styles.iconCircle, { backgroundColor: config.iconBg }]}
            >
                <IconComponent size={36} color={config.iconColor} />
            </View>

            <Text style={styles.title}>{title || config.defaultTitle}</Text>
            <Text style={styles.description}>
                {description || config.defaultDesc}
            </Text>

            {type === 'resume-booking' &&
            typeof countdownSeconds === 'number' ? (
                <View style={styles.timerBadge}>
                    <Clock
                        size={16}
                        color={Colors.warningText}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={styles.timerText}>
                        Hold Expires In: {formatTime(countdownSeconds)}
                    </Text>
                </View>
            ) : null}

            <View style={styles.buttonContainer}>
                {onPrimaryAction || onAction ? (
                    <TouchableOpacity
                        accessibilityLabel={
                            primaryActionLabel ||
                            actionLabel ||
                            config.defaultPrimary
                        }
                        accessibilityRole="button"
                        style={styles.primaryButton}
                        onPress={onPrimaryAction || onAction}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>
                            {primaryActionLabel ||
                                actionLabel ||
                                config.defaultPrimary}
                        </Text>
                    </TouchableOpacity>
                ) : null}

                {onSecondaryAction && secondaryActionLabel ? (
                    <TouchableOpacity
                        accessibilityLabel={secondaryActionLabel}
                        accessibilityRole="button"
                        style={styles.secondaryButton}
                        onPress={onSecondaryAction}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.secondaryButtonText}>
                            {secondaryActionLabel}
                        </Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        margin: Spacing.base,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.card,
    },
    iconCircle: {
        width: 76,
        height: 76,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontFamily: Typography.fontFamily.heading,
        fontSize: 18,
        color: Colors.deepPlum,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    description: {
        fontFamily: Typography.fontFamily.body,
        fontSize: 13,
        lineHeight: 20,
        color: Colors.inkSecondary,
        textAlign: 'center',
        maxWidth: 290,
        marginBottom: Spacing.lg,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.warningLight,
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        borderColor: '#FFE0B2',
        marginBottom: Spacing.lg,
    },
    timerText: {
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: 13,
        color: Colors.warningText,
    },
    buttonContainer: {
        width: '100%',
        maxWidth: 280,
        gap: Spacing.sm,
    },
    primaryButton: {
        minHeight: 48,
        backgroundColor: Colors.deepPlum,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.subtle,
    },
    primaryButtonText: {
        color: Colors.white,
        fontFamily: Typography.fontFamily.heading,
        fontSize: 14,
    },
    secondaryButton: {
        minHeight: 48,
        backgroundColor: 'transparent',
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: Colors.inkSecondary,
        fontFamily: Typography.fontFamily.bodyMedium,
        fontSize: 13,
    },
});
