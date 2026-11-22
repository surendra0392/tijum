import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UtensilsCrossed, Ban } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';

export interface MealBadgeProps {
    label?: string;
    foodProvided?: boolean;
    breakfast?: boolean;
    lunch?: boolean;
    dinner?: boolean;
    meal?: string;
    included?: boolean;
    timing?: string;
}

export function MealBadge({
    label,
    foodProvided,
    breakfast,
    lunch,
    dinner,
    meal,
    included,
    timing,
}: MealBadgeProps) {
    let displayLabel = label;
    let isIncluded = included !== false;

    if (!displayLabel) {
        if (meal) {
            const mealName = meal.charAt(0).toUpperCase() + meal.slice(1);
            displayLabel =
                included !== false
                    ? `${mealName}${timing ? ` (${timing})` : ''}`
                    : `No ${mealName}`;
        } else {
            const meals: string[] = [];
            if (breakfast) meals.push('Breakfast');
            if (lunch) meals.push('Lunch');
            if (dinner) meals.push('Dinner');

            if (meals.length > 0) {
                displayLabel = meals.join(' • ');
                isIncluded = true;
            } else if (foodProvided) {
                displayLabel = 'Food Available (No Meals Included)';
                isIncluded = false;
            } else {
                displayLabel = 'Room Only / No Food';
                isIncluded = false;
            }
        }
    }

    return (
        <View
            style={[
                styles.container,
                !isIncluded && styles.notIncludedContainer,
            ]}
        >
            {isIncluded ? (
                <UtensilsCrossed
                    size={12}
                    color="#065F46"
                    style={styles.icon}
                />
            ) : (
                <Ban size={12} color={Colors.gray500} style={styles.icon} />
            )}
            <Text style={[styles.text, !isIncluded && styles.notIncludedText]}>
                {displayLabel}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.emeraldLight,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        alignSelf: 'flex-start',
    },
    notIncludedContainer: {
        backgroundColor: Colors.gray100,
    },
    icon: {
        marginRight: 4,
    },
    text: {
        color: '#065F46',
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: Typography.fontSize.xs,
    },
    notIncludedText: {
        color: Colors.inkSecondary,
    },
});
