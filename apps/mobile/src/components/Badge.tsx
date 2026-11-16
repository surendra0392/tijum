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
    | 'primary';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    style?: ViewStyle;
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
    const getBackgroundColor = () => {
        switch (variant) {
            case 'emerald':
                return Colors.emeraldLight;
            case 'amber':
                return Colors.amberLight;
            case 'rose':
                return Colors.roseLight;
            case 'secondary':
            case 'accent':
                return Colors.softPeach;
            case 'primary':
                return Colors.deepPlum;
            case 'outline':
                return 'transparent';
            default:
                return Colors.gray100;
        }
    };

    const getTextColor = () => {
        switch (variant) {
            case 'emerald':
                return '#065F46'; // Dark Emerald
            case 'amber':
                return '#92400E'; // Dark Amber
            case 'rose':
                return '#9F1239'; // Dark Rose
            case 'secondary':
            case 'accent':
                return Colors.coral;
            case 'primary':
                return Colors.white;
            case 'outline':
                return Colors.gray700;
            default:
                return Colors.gray800;
        }
    };

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor:
                        variant === 'outline' ? Colors.gray300 : 'transparent',
                },
                style,
            ]}
        >
            <Text style={[styles.text, { color: getTextColor() }]}>
                {label}
            </Text>
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
    text: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
    },
});
