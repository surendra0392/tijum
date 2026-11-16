import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    Search,
    X,
    Globe,
    MapPin,
    Snowflake,
    AlertCircle,
    Building2,
    Home,
    Users,
    Sparkles,
    User,
} from 'lucide-react-native';
import { PublicApi } from '../../../src/api/public';
import { CustomerApi } from '../../../src/api/customer';
import { PropertyCard as PropertyCardType } from '../../../src/api/types';
import {
    CANONICAL_CATEGORIES,
    CanonicalCategorySlug,
    getCategoryDisplayName,
    normalizeCategorySlug,
} from '../../../src/constants/categories';
import { PropertyCard } from '../../../src/components/PropertyCard';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';

const CITIES = ['All', 'Hyderabad', 'Guntur', 'Vijayawada', 'Visakhapatnam'];

interface CategoryTabItem {
    key: 'all' | CanonicalCategorySlug;
    label: string;
    Icon: React.ComponentType<{ size?: number; color?: string; style?: any }>;
    activeBg: string;
}

const CATEGORY_TABS: CategoryTabItem[] = [
    {
        key: 'all',
        label: 'All Stays',
        Icon: Sparkles,
        activeBg: Colors.deepPlum,
    },
    {
        key: 'hostels-pg',
        label: 'Hostels/PG',
        Icon: Building2,
        activeBg: Colors.deepPlum,
    },
    {
        key: 'homestays',
        label: 'Homestays',
        Icon: Home,
        activeBg: Colors.deepPlum,
    },
    {
        key: 'co-living',
        label: 'Co-Living',
        Icon: Users,
        activeBg: Colors.deepPlum,
    },
];

const GENDER_OPTIONS: Array<{ key: 'all' | 'male' | 'female'; label: string }> =
    [
        { key: 'all', label: 'All Genders' },
        { key: 'male', label: 'Men Only' },
        { key: 'female', label: 'Women Only' },
    ];

export default function ExploreScreen() {
    const router = useRouter();
    const [properties, setProperties] = useState<PropertyCardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<
        'all' | CanonicalCategorySlug
    >('all');
    const [selectedCity, setSelectedCity] = useState('All');
    const [selectedGender, setSelectedGender] = useState<
        'all' | 'male' | 'female'
    >('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAc, setFilterAc] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set());

    // Restore customer wishlist state on mount
    useEffect(() => {
        CustomerApi.getWishlist()
            .then((res) => {
                if (Array.isArray(res?.data)) {
                    setWishlistedIds(new Set(res.data.map((p) => p.id)));
                }
            })
            .catch(() => {});
    }, []);

    const handleToggleWishlist = async (propertyId: number) => {
        setWishlistedIds((prev) => {
            const next = new Set(prev);
            if (next.has(propertyId)) {
                next.delete(propertyId);
                CustomerApi.removeFromWishlist(propertyId).catch(() => {});
            } else {
                next.add(propertyId);
                CustomerApi.addToWishlist(propertyId).catch(() => {});
            }
            return next;
        });
    };

    const loadProperties = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setErrorMessage(null);

        try {
            const filters: any = {};
            if (selectedCity !== 'All') {
                filters.city = selectedCity.toLowerCase();
            }
            if (selectedCategory !== 'all') {
                filters.category = selectedCategory;
            }
            if (searchQuery.trim()) {
                filters.locality = searchQuery.trim();
            }
            if (filterAc) {
                filters.ac = true;
            }
            if (selectedGender !== 'all') {
                filters.gender = selectedGender;
                filters.gender_preference = selectedGender;
            }

            const res = await PublicApi.getProperties(filters);
            let list = res.data || [];

            // Local normalization filter to ensure client displays strictly matching canonical category
            if (selectedCategory !== 'all') {
                list = list.filter((p) => {
                    const rawCat = p.category?.slug || p.category?.name;
                    const normalized = normalizeCategorySlug(rawCat);
                    return normalized === selectedCategory;
                });
            }

            setProperties(list);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to load properties.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadProperties();
    }, [selectedCity, selectedCategory, filterAc, selectedGender]);

    const handleSearchSubmit = () => {
        loadProperties();
    };

    const getGuaranteeContent = () => {
        switch (selectedCategory) {
            case 'hostels-pg':
                return {
                    tag: 'HOSTEL & PG ACCOMMODATION',
                    title: 'Hostel & Paying Guest Stays',
                    desc: 'Explore hostel and paying guest accommodation with room options, amenities, and meal arrangements shown for each property.',
                };
            case 'homestays':
                return {
                    tag: 'HOMESTAY ACCOMMODATION',
                    title: 'Residential Homestay Stays',
                    desc: 'Explore accommodation in residential homes, with property details, room options, and available services shown for each property.',
                };
            case 'co-living':
                return {
                    tag: 'CO-LIVING ACCOMMODATION',
                    title: 'Shared-Living Spaces',
                    desc: 'Explore shared-living accommodation with room options, property details, and available amenities shown for each space.',
                };
            default:
                return {
                    tag: 'ACCOMMODATION CATEGORIES',
                    title: 'Hostels/PG, Homestays & Co-Living',
                    desc: 'Filter properties across canonical categories. Meal arrangements, amenities, and policies are declared independently per property.',
                };
        }
    };

    const guarantee = getGuaranteeContent();

    return (
        <View style={styles.container}>
            {/* Search Bar & Filters */}
            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Search
                        size={18}
                        color={Colors.gray400}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        placeholder="Search locality, area, or stay name..."
                        placeholderTextColor={Colors.gray400}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearchSubmit}
                        returnKeyType="search"
                    />
                    {searchQuery ? (
                        <TouchableOpacity
                            onPress={() => {
                                setSearchQuery('');
                                loadProperties();
                            }}
                        >
                            <X size={16} color={Colors.gray400} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Canonical Category Selector Bar */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryPillContainer}
                >
                    {CATEGORY_TABS.map((tab) => {
                        const isSelected = selectedCategory === tab.key;
                        const IconComponent = tab.Icon;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                activeOpacity={0.8}
                                onPress={() => setSelectedCategory(tab.key)}
                                style={[
                                    styles.categoryPill,
                                    isSelected && {
                                        backgroundColor: tab.activeBg,
                                        borderColor: tab.activeBg,
                                    },
                                ]}
                            >
                                <IconComponent
                                    size={14}
                                    color={
                                        isSelected
                                            ? Colors.white
                                            : Colors.gray700
                                    }
                                    style={{ marginRight: 6 }}
                                />
                                <Text
                                    style={[
                                        styles.categoryPillText,
                                        isSelected &&
                                            styles.categoryPillTextActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Secondary Filters: Cities & AC */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.cityPillContainer}
                >
                    {CITIES.map((city) => {
                        const isSelected = selectedCity === city;
                        return (
                            <TouchableOpacity
                                key={city}
                                activeOpacity={0.8}
                                onPress={() => setSelectedCity(city)}
                                style={[
                                    styles.cityPill,
                                    isSelected && styles.cityPillActive,
                                ]}
                            >
                                {city === 'All' ? (
                                    <Globe
                                        size={12}
                                        color={
                                            isSelected
                                                ? Colors.white
                                                : Colors.gray600
                                        }
                                        style={{ marginRight: 4 }}
                                    />
                                ) : (
                                    <MapPin
                                        size={12}
                                        color={
                                            isSelected
                                                ? Colors.white
                                                : Colors.gray600
                                        }
                                        style={{ marginRight: 4 }}
                                    />
                                )}
                                <Text
                                    style={[
                                        styles.cityPillText,
                                        isSelected && styles.cityPillTextActive,
                                    ]}
                                >
                                    {city === 'All' ? 'All Cities' : city}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setFilterAc(!filterAc)}
                        style={[
                            styles.cityPill,
                            filterAc && styles.cityPillActive,
                        ]}
                    >
                        <Snowflake
                            size={12}
                            color={filterAc ? Colors.white : Colors.gray600}
                            style={{ marginRight: 4 }}
                        />
                        <Text
                            style={[
                                styles.cityPillText,
                                filterAc && styles.cityPillTextActive,
                            ]}
                        >
                            AC Only
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.pillDivider} />

                    {GENDER_OPTIONS.map((opt) => {
                        const isSelected = selectedGender === opt.key;
                        return (
                            <TouchableOpacity
                                key={opt.key}
                                activeOpacity={0.8}
                                onPress={() => setSelectedGender(opt.key)}
                                style={[
                                    styles.cityPill,
                                    isSelected && styles.cityPillActive,
                                ]}
                            >
                                <User
                                    size={12}
                                    color={
                                        isSelected
                                            ? Colors.white
                                            : Colors.gray600
                                    }
                                    style={{ marginRight: 4 }}
                                />
                                <Text
                                    style={[
                                        styles.cityPillText,
                                        isSelected && styles.cityPillTextActive,
                                    ]}
                                >
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Main List */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                    <Text style={styles.loadingText}>
                        Finding verified food-inclusive stays...
                    </Text>
                </View>
            ) : errorMessage ? (
                <View style={styles.centerContainer}>
                    <AlertCircle
                        size={28}
                        color={Colors.rose}
                        style={{ marginBottom: 8 }}
                    />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity
                        onPress={() => loadProperties()}
                        style={styles.retryButton}
                    >
                        <Text style={styles.retryButtonText}>Tap to Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={properties}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadProperties(true)}
                        />
                    }
                    ListHeaderComponent={
                        <View style={styles.foodGuaranteeBanner}>
                            <View style={styles.bannerBadge}>
                                <Text style={styles.bannerBadgeText}>
                                    {guarantee.tag}
                                </Text>
                            </View>
                            <Text style={styles.bannerTitle}>
                                {guarantee.title}
                            </Text>
                            <Text style={styles.bannerDesc}>
                                {guarantee.desc}
                            </Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Building2
                                size={48}
                                color={Colors.gray300}
                                style={{ marginBottom: 12 }}
                            />
                            <Text style={styles.emptyTitle}>
                                {selectedCategory !== 'all'
                                    ? `No ${getCategoryDisplayName(selectedCategory)} found`
                                    : 'No accommodations found'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                Try selecting &ldquo;All Stays&rdquo; or
                                adjusting your city filter or search keyword.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <PropertyCard
                            property={item}
                            isWishlisted={wishlistedIds.has(item.id)}
                            onToggleWishlist={handleToggleWishlist}
                            onPress={() => {
                                router.push({
                                    pathname:
                                        '/(customer)/explore/property/[slug]',
                                    params: { slug: item.slug },
                                } as any);
                            }}
                        />
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    searchSection: {
        backgroundColor: Colors.white,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray100,
        marginHorizontal: Spacing.base,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.base,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray900,
    },
    categoryPillContainer: {
        paddingHorizontal: Spacing.base,
        paddingTop: Spacing.sm,
        paddingBottom: 4,
        gap: Spacing.xs,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray100,
        paddingHorizontal: Spacing.base,
        paddingVertical: 8,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    categoryPillText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.gray700,
    },
    categoryPillTextActive: {
        color: Colors.white,
    },
    cityPillContainer: {
        paddingHorizontal: Spacing.base,
        paddingTop: 6,
        gap: Spacing.xs,
    },
    cityPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray50,
        paddingHorizontal: Spacing.md,
        paddingVertical: 5,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    cityPillActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    cityPillText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.gray700,
    },
    cityPillTextActive: {
        color: Colors.white,
    },
    pillDivider: {
        width: 1,
        height: 18,
        backgroundColor: Colors.gray300,
        marginHorizontal: 4,
        alignSelf: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
    },
    errorText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.rose,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    retryButton: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.base,
    },
    retryButtonText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: Typography.fontSize.sm,
    },
    listContent: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxl,
    },
    foodGuaranteeBanner: {
        backgroundColor: Colors.cream,
        borderColor: '#FED7AA',
        borderWidth: 1,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        marginBottom: Spacing.lg,
    },
    bannerBadge: {
        backgroundColor: Colors.coral,
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        marginBottom: Spacing.xs,
    },
    bannerBadgeText: {
        color: Colors.white,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    bannerTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginBottom: 4,
    },
    bannerDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray700,
        lineHeight: 18,
    },
    emptyContainer: {
        padding: Spacing.xxl,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
        color: Colors.gray800,
        marginBottom: Spacing.xs,
    },
    emptySubtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray500,
        textAlign: 'center',
        maxWidth: 280,
    },
});
