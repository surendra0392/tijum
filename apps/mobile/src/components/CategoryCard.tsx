import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Building2, Home, Users } from 'lucide-react-native';
import { CanonicalCategorySlug } from '../constants/categories';
import { Colors } from '../theme/colors';
import { BorderRadius, Shadows, Spacing } from '../theme/spacing';

interface CategoryCardProps {
    category: CanonicalCategorySlug;
    isSelected: boolean;
    onPress: () => void;
}

const CATEGORY_META = {
    'hostels-pg': {
        title: 'Hostels & PGs',
        subtitle: 'Student & single worker stays with meals',
        Icon: Building2,
    },
    'homestays': {
        title: 'Homestays',
        subtitle: 'Authentic local hosts & home-style food',
        Icon: Home,
    },
    'co-living': {
        title: 'Co-Living',
        subtitle: 'Modern shared living & professional community',
        Icon: Users,
    },
};

export function CategoryCard({
    category,
    isSelected,
    onPress,
}: CategoryCardProps) {
    const meta = CATEGORY_META[category] || {
        title: category,
        subtitle: 'Verified stay',
        Icon: Home,
    };

    const IconComponent = meta.Icon;

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isSelected ? styles.selectedContainer : styles.unselectedContainer,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View
                style={[
                    styles.iconCircle,
                    isSelected ? styles.selectedIconCircle : styles.unselectedIconCircle,
                ]}
            >
                <IconComponent
                    size={22}
                    color={isSelected ? Colors.white : Colors.plumDeep}
                />
            </View>
            <Text
                style={[
                    styles.title,
                    isSelected ? styles.selectedTitle : styles.unselectedTitle,
                ]}
                numberOfLines={1}
            >
                {meta.title}
            </Text>
            <Text
                style={[
                    styles.subtitle,
                    isSelected ? styles.selectedSubtitle : styles.unselectedSubtitle,
                ]}
                numberOfLines={2}
            >
                {meta.subtitle}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 140,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        marginRight: Spacing.sm,
        ...Shadows.subtle,
    },
    selectedContainer: {
        backgroundColor: Colors.peachSoft,
        borderColor: Colors.coralPrimary,
    },
    unselectedContainer: {
        backgroundColor: Colors.white,
        borderColor: Colors.borderSubtle,
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    selectedIconCircle: {
        backgroundColor: Colors.coralPrimary,
    },
    unselectedIconCircle: {
        backgroundColor: Colors.peachCream,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 3,
    },
    selectedTitle: {
        color: Colors.inkPrimary,
    },
    unselectedTitle: {
        color: Colors.inkPrimary,
    },
    subtitle: {
        fontSize: 11,
        lineHeight: 15,
    },
    selectedSubtitle: {
        color: Colors.inkSecondary,
    },
    unselectedSubtitle: {
        color: Colors.inkMuted,
    },
});
