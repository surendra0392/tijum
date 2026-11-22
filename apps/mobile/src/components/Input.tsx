import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export function Input({
    label,
    error,
    style,
    accessibilityLabel,
    accessibilityHint,
    secureTextEntry,
    onFocus,
    onBlur,
    ...props
}: InputProps) {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const showPasswordToggle = Boolean(secureTextEntry);

    return (
        <View style={styles.container}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <View
                style={[
                    styles.inputWrapper,
                    isFocused && styles.inputWrapperFocused,
                    error ? styles.inputError : null,
                ]}
            >
                <TextInput
                    accessibilityLabel={
                        accessibilityLabel ?? label ?? props.placeholder
                    }
                    accessibilityHint={accessibilityHint ?? error}
                    placeholderTextColor={Colors.inkMuted}
                    secureTextEntry={
                        showPasswordToggle ? !isPasswordVisible : false
                    }
                    onFocus={(e) => {
                        setIsFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        onBlur?.(e);
                    }}
                    style={[styles.input, style]}
                    {...props}
                />
                {showPasswordToggle ? (
                    <TouchableOpacity
                        accessibilityLabel={
                            isPasswordVisible ? 'Hide password' : 'Show password'
                        }
                        accessibilityRole="button"
                        onPress={() => setIsPasswordVisible((prev) => !prev)}
                        style={styles.eyeButton}
                        activeOpacity={0.7}
                    >
                        {isPasswordVisible ? (
                            <EyeOff size={18} color={Colors.inkSecondary} />
                        ) : (
                            <Eye size={18} color={Colors.inkSecondary} />
                        )}
                    </TouchableOpacity>
                ) : null}
            </View>
            {error ? (
                <Text
                    accessibilityLiveRegion="polite"
                    accessibilityRole="alert"
                    style={styles.errorText}
                >
                    {error}
                </Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    label: {
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: Typography.fontSize.sm,
        color: Colors.deepPlum,
        marginBottom: Spacing.xs,
    },
    inputWrapper: {
        minHeight: 48,
        backgroundColor: Colors.white,
        borderColor: Colors.borderSubtle,
        borderWidth: 1.5,
        borderRadius: BorderRadius.base,
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputWrapperFocused: {
        borderColor: Colors.deepPlum,
    },
    input: {
        flex: 1,
        minHeight: 46,
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.sm,
        fontFamily: Typography.fontFamily.body,
        fontSize: Typography.fontSize.base,
        color: Colors.inkPrimary,
    },
    eyeButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputError: {
        borderColor: Colors.danger,
    },
    errorText: {
        fontFamily: Typography.fontFamily.bodyMedium,
        fontSize: Typography.fontSize.xs,
        color: Colors.danger,
        marginTop: Spacing.xs,
    },
});
