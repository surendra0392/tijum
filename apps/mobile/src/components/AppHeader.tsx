import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/spacing';

interface AppHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    onBack?: () => void;
    rightAction?: React.ReactNode;
    style?: ViewStyle;
    variant?: 'plum' | 'white';
}

export function AppHeader({
    title,
    subtitle,
    showBack = false,
    onBack,
    rightAction,
    style,
    variant = 'plum',
}: AppHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    const isPlum = variant === 'plum';

    return (
        <View
            style={[
                styles.container,
                isPlum ? styles.plumContainer : styles.whiteContainer,
                style,
            ]}
        >
            <View style={styles.contentRow}>
                {showBack ? (
                    <TouchableOpacity
                        accessibilityLabel="Go back"
                        accessibilityRole="button"
                        onPress={handleBack}
                        style={[
                            styles.backButton,
                            isPlum
                                ? styles.plumBackButton
                                : styles.whiteBackButton,
                        ]}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft
                            size={20}
                            color={isPlum ? Colors.white : Colors.deepPlum}
                        />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.spacer} />
                )}

                <View style={styles.titleColumn}>
                    <Text
                        style={[
                            styles.title,
                            isPlum ? styles.plumTitle : styles.whiteTitle,
                        ]}
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text
                            style={[
                                styles.subtitle,
                                isPlum
                                    ? styles.plumSubtitle
                                    : styles.whiteSubtitle,
                            ]}
                            numberOfLines={1}
                        >
                            {subtitle}
                        </Text>
                    ) : null}
                </View>

                {rightAction ? (
                    <View style={styles.rightActionContainer}>
                        {rightAction}
                    </View>
                ) : (
                    <View style={styles.spacer} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.base,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.base,
    },
    plumContainer: {
        backgroundColor: Colors.plumDeep,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    whiteContainer: {
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    plumBackButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    whiteBackButton: {
        backgroundColor: Colors.surfaceSubtle,
    },
    titleColumn: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    plumTitle: {
        color: Colors.white,
    },
    whiteTitle: {
        color: Colors.inkPrimary,
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    plumSubtitle: {
        color: Colors.softPeach,
    },
    whiteSubtitle: {
        color: Colors.inkSecondary,
    },
    rightActionContainer: {
        minWidth: 48,
        alignItems: 'flex-end',
    },
    spacer: {
        width: 48,
    },
});
