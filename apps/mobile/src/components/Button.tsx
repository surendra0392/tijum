import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableOpacityProps,
} from 'react-native';
import { Colors } from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

export function Button({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    style,
    accessibilityLabel,
    accessibilityState,
    accessibilityRole,
    ...props
}: ButtonProps) {
    const getBackgroundColor = () => {
        if (disabled || loading) return Colors.gray200;
        switch (variant) {
            case 'primary':
                return Colors.deepPlum;
            case 'secondary':
                return Colors.coral;
            case 'outline':
            case 'ghost':
                return 'transparent';
            case 'danger':
                return Colors.rose;
        }
    };

    const getTextColor = () => {
        if (disabled || loading) return Colors.gray400;
        switch (variant) {
            case 'primary':
            case 'secondary':
            case 'danger':
                return Colors.white;
            case 'outline':
                return Colors.deepPlum;
            case 'ghost':
                return Colors.deepPlum;
        }
    };

    const getBorderColor = () => {
        if (variant === 'outline') {
            return disabled ? Colors.gray300 : Colors.deepPlum;
        }
        return 'transparent';
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            accessibilityLabel={accessibilityLabel ?? title}
            accessibilityRole={accessibilityRole ?? 'button'}
            accessibilityState={{
                ...accessibilityState,
                busy: loading,
                disabled: disabled || loading,
            }}
            disabled={disabled || loading}
            style={[
                styles.base,
                styles[size],
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'outline' ? 1.5 : 0,
                },
                style,
            ]}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} size="small" />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        minHeight: 48,
        borderRadius: BorderRadius.base,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    sm: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    md: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    lg: {
        paddingVertical: Spacing.base,
        paddingHorizontal: Spacing.xl,
    },
    text: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
    },
});
