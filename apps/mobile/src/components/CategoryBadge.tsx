import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Building2, Home, Users, Sparkles } from 'lucide-react-native';
import {
    CanonicalCategorySlug,
    getCanonicalCategory,
    normalizeCategorySlug,
} from '../constants/categories';
import { Colors } from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';

interface CategoryBadgeProps {
    category:
        | {
              id?: number;
              name?: string;
              slug?: string | CanonicalCategorySlug;
              code?: string;
          }
        | string
        | null
        | undefined;
    showIcon?: boolean;
    size?: 'sm' | 'md';
    style?: ViewStyle;
}

export function CategoryBadge({
    category,
    showIcon = true,
    size = 'md',
    style,
}: CategoryBadgeProps) {
    const rawIdentifier =
        typeof category === 'string'
            ? category
            : category?.slug || category?.name || null;

    const canonical = getCanonicalCategory(rawIdentifier);
    const displayName = canonical
        ? canonical.name
        : typeof category === 'object' && category?.name
          ? category.name
          : 'Stay';

    // Unified TIJUM brand visual tokens for categories
    const getVisuals = () => {
        switch (canonical?.slug) {
            case 'hostels-pg':
                return {
                    bg: '#FFF4EE',
                    border: '#E6E0DB',
                    text: Colors.deepPlum,
                    iconColor: Colors.deepPlum,
                    Icon: Building2,
                };
            case 'homestays':
                return {
                    bg: '#FFF4EE',
                    border: '#E6E0DB',
                    text: Colors.deepPlum,
                    iconColor: Colors.deepPlum,
                    Icon: Home,
                };
            case 'co-living':
                return {
                    bg: '#FFF4EE',
                    border: '#E6E0DB',
                    text: Colors.deepPlum,
                    iconColor: Colors.deepPlum,
                    Icon: Users,
                };
            default:
                return {
                    bg: '#FFF4EE',
                    border: '#E6E0DB',
                    text: Colors.deepPlum,
                    iconColor: Colors.deepPlum,
                    Icon: Sparkles,
                };
        }
    };

    const visuals = getVisuals();
    const IconComponent = visuals.Icon;
    const isSmall = size === 'sm';
    const iconSize = isSmall ? 10 : 12;

    return (
        <View
            style={[
                styles.badge,
                isSmall && styles.badgeSm,
                {
                    backgroundColor: visuals.bg,
                    borderColor: visuals.border,
                },
                style,
            ]}
        >
            {showIcon && (
                <IconComponent
                    size={iconSize}
                    color={visuals.iconColor}
                    style={styles.icon}
                />
            )}
            <Text
                style={[
                    styles.text,
                    isSmall && styles.textSm,
                    { color: visuals.text },
                ]}
                numberOfLines={1}
            >
                {displayName}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
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
    icon: {
        marginRight: 4,
    },
    text: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    textSm: {
        fontSize: 10,
        fontWeight: '700',
    },
});
