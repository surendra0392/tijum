import React from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
} from 'react-native';
import { Colors } from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
    return (
        <View style={styles.container}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TextInput
                placeholderTextColor={Colors.gray400}
                style={[styles.input, error ? styles.inputError : null, style]}
                {...props}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '600',
        color: Colors.gray700,
        marginBottom: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.white,
        borderColor: Colors.gray200,
        borderWidth: 1.5,
        borderRadius: BorderRadius.base,
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.md,
        fontSize: Typography.fontSize.base,
        color: Colors.gray900,
    },
    inputError: {
        borderColor: Colors.rose,
    },
    errorText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.rose,
        marginTop: Spacing.xs,
    },
});
