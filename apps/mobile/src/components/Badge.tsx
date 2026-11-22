import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';

export type BadgeVariant =
    | 'default'
    | 'emerald'
    | 'amber'
    | 'rose'
    | 'outline'
    | 'secondary'
    | 'accent'
    | 'primary'
    | 'success'
    | 'warning'
    | 'info'
    | 'error'
    | 'danger'
    | 'neutral';

interface BadgeProps {
    label?: string;
    children?: React.ReactNode;
    variant?: BadgeVariant;
    size?: 'sm' | 'md' | 'lg';
    style?: ViewStyle;
}

export function Badge({
    label,
    children,
    variant = 'default',
    size = 'md',
    style,
}: BadgeProps) {
    const getBackgroundColor = () => {
        switch (variant) {
            case 'emerald':
            case 'success':
                return Colors.emeraldLight;
            case 'amber':
            case 'warning':
                return Colors.amberLight;
            case 'rose':
            case 'error':
            case 'danger':
                return Colors.roseLight;
            case 'info':
                return '#E0F2FE';
            case 'secondary':
            case 'accent':
                return Colors.peachSoft;
            case 'primary':
                return Colors.deepPlum;
            case 'outline':
                return 'transparent';
            case 'neutral':
            default:
                return Colors.surfaceSubtle;
        }
    };

    const getTextColor = () => {
        switch (variant) {
            case 'emerald':
            case 'success':
                return Colors.successText;
            case 'amber':
            case 'warning':
                return Colors.warningText;
            case 'rose':
            case 'error':
            case 'danger':
                return Colors.dangerText;
            case 'info':
                return Colors.infoText;
            case 'secondary':
            case 'accent':
                return Colors.coralDark;
            case 'primary':
                return Colors.white;
            case 'outline':
                return Colors.deepPlum;
            case 'neutral':
            default:
                return Colors.inkPrimary;
        }
    };

    const content = label ?? children;

    return (
        <View
            style={[
                styles.badge,
                size === 'sm' && styles.badgeSm,
                size === 'lg' && styles.badgeLg,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor:
                        variant === 'outline'
                            ? Colors.borderStrong
                            : 'transparent',
                },
                style,
            ]}
        >
            {typeof content === 'string' ? (
                <Text
                    style={[
                        styles.text,
                        size === 'sm' && styles.textSm,
                        size === 'lg' && styles.textLg,
                        { color: getTextColor() },
                    ]}
                >
                    {content}
                </Text>
            ) : (
                content
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    badgeSm: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    badgeLg: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
    },
    text: {
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: Typography.fontSize.xs,
    },
    textSm: {
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: 10,
    },
    textLg: {
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: Typography.fontSize.sm,
    },
});
