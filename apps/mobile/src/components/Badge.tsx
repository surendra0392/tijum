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

export function Badge({ label, children, variant = 'default', size = 'md', style }: BadgeProps) {
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
                return Colors.softPeach;
            case 'primary':
                return Colors.deepPlum;
            case 'outline':
                return 'transparent';
            case 'neutral':
            default:
                return Colors.gray100;
        }
    };

    const getTextColor = () => {
        switch (variant) {
            case 'emerald':
            case 'success':
                return '#065F46'; // Dark Emerald
            case 'amber':
            case 'warning':
                return '#92400E'; // Dark Amber
            case 'rose':
            case 'error':
            case 'danger':
                return '#9F1239'; // Dark Rose
            case 'info':
                return '#0369A1'; // Dark Sky
            case 'secondary':
            case 'accent':
                return Colors.coral;
            case 'primary':
                return Colors.white;
            case 'outline':
                return Colors.gray700;
            case 'neutral':
            default:
                return Colors.gray800;
        }
    };

    const content = label ?? children;

    return (
        <View
            style={[
                styles.badge,
                size === 'sm' && styles.badgeSm,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor:
                        variant === 'outline' ? Colors.gray300 : 'transparent',
                },
                style,
            ]}
        >
            {typeof content === 'string' ? (
                <Text style={[styles.text, size === 'sm' && styles.textSm, { color: getTextColor() }]}>
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
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    badgeSm: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    text: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
    },
    textSm: {
        fontSize: 10,
        fontWeight: '700',
    },
});
