import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
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
    SlidersHorizontal,
    Utensils,
    Calendar,
    Check,
    Bell,
    ChevronDown,
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
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { PropertyCard } from '../../../src/components/PropertyCard';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Badge } from '../../../src/components/Badge';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { SHOWCASE_PROPERTIES } from '../../../src/data/showcaseData.ts';

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
    const [filterBreakfast, setFilterBreakfast] = useState(false);
    const [filterLunch, setFilterLunch] = useState(false);
    const [filterDinner, setFilterDinner] = useState(false);
    const [selectedSharing, setSelectedSharing] = useState<number | null>(null);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [checkInDate, setCheckInDate] = useState('');
    const [checkOutDate, setCheckOutDate] = useState('');
    const [advancedModalVisible, setAdvancedModalVisible] = useState(false);
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

    const activeFiltersCount =
        (filterAc ? 1 : 0) +
        (selectedGender !== 'all' ? 1 : 0) +
        (filterBreakfast ? 1 : 0) +
        (filterLunch ? 1 : 0) +
        (filterDinner ? 1 : 0) +
        (selectedSharing ? 1 : 0) +
        (minPrice || maxPrice ? 1 : 0) +
        (checkInDate ? 1 : 0);

    const resetAdvancedFilters = () => {
        setFilterBreakfast(false);
        setFilterLunch(false);
        setFilterDinner(false);
        setSelectedSharing(null);
        setMinPrice('');
        setMaxPrice('');
        setCheckInDate('');
        setCheckOutDate('');
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
            if (filterBreakfast) {
                filters.breakfast = true;
            }
            if (filterLunch) {
                filters.lunch = true;
            }
            if (filterDinner) {
                filters.dinner = true;
            }
            if (selectedSharing) {
                filters.sharing_capacity = selectedSharing;
            }
            if (minPrice && !isNaN(Number(minPrice))) {
                filters.min_price = Number(minPrice) * 100;
            }
            if (maxPrice && !isNaN(Number(maxPrice))) {
                filters.max_price = Number(maxPrice) * 100;
            }
            if (checkInDate.trim()) {
                filters.check_in_date = checkInDate.trim();
            }
            if (checkOutDate.trim()) {
                filters.check_out_date = checkOutDate.trim();
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

            if (list.length === 0 && !searchQuery.trim() && !minPrice && !maxPrice) {
                let fallback = SHOWCASE_PROPERTIES;
                if (selectedCategory !== 'all') {
                    fallback = fallback.filter((p) => {
                        const rawCat = p.category?.slug || p.category?.name;
                        return normalizeCategorySlug(rawCat) === selectedCategory;
                    });
                }
                list = fallback;
            }

            setProperties(list);
        } catch {
            let fallback = SHOWCASE_PROPERTIES;
            if (selectedCategory !== 'all') {
                fallback = fallback.filter((p) => {
                    const rawCat = p.category?.slug || p.category?.name;
                    return normalizeCategorySlug(rawCat) === selectedCategory;
                });
            }
            setProperties(fallback);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadProperties();
    }, [
        selectedCity,
        selectedCategory,
        filterAc,
        selectedGender,
        filterBreakfast,
        filterLunch,
        filterDinner,
        selectedSharing,
    ]);

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
            {/* Top Curved Plum Header */}
            <View style={styles.plumHeader}>
                <SafeAreaView>
                    <View style={styles.plumHeaderTopRow}>
                        <TouchableOpacity
                            style={styles.locationSelector}
                            onPress={() => {
                                const currentIndex = CITIES.indexOf(selectedCity);
                                const nextIndex = (currentIndex + 1) % CITIES.length;
                                setSelectedCity(CITIES[nextIndex]);
                            }}
                            activeOpacity={0.8}
                        >
                            <MapPin size={15} color={Colors.coral} style={{ marginRight: 4 }} />
                            <Text style={styles.locationText}>
                                {selectedCity === 'All' ? 'Hyderabad, Telangana' : selectedCity}
                            </Text>
                            <ChevronDown size={14} color={Colors.white} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.notificationBell}
                            onPress={() => router.push('/(customer)/notifications')}
                            activeOpacity={0.8}
                        >
                            <Bell size={18} color={Colors.white} />
                            <View style={styles.notificationBadgeDot} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.brandHeroCenter}>
                        <View style={styles.logoBadgeRow}>
                            <View style={styles.roofMark} />
                            <Text style={styles.brandLogoText}>TIJUM</Text>
                        </View>
                        <Text style={styles.brandTaglineText}>Stay • Dine • Belong</Text>
                    </View>

                    <View style={styles.searchBar}>
                        <Search
                            size={18}
                            color={Colors.gray400}
                            style={styles.searchIcon}
                        />
                        <TextInput
                            placeholder="Search properties..."
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
                                style={{ marginRight: 6 }}
                            >
                                <X size={16} color={Colors.gray400} />
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            onPress={() => setAdvancedModalVisible(true)}
                            style={styles.searchFilterBtn}
                            activeOpacity={0.8}
                        >
                            <SlidersHorizontal size={15} color={activeFiltersCount > 0 ? Colors.coral : Colors.gray500} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            {/* Filter Section */}
            <View style={styles.searchSection}>
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

                {/* Secondary Filters: Advanced Filters, Cities & AC */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.cityPillContainer}
                >
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setAdvancedModalVisible(true)}
                        style={[
                            styles.cityPill,
                            activeFiltersCount > 0 && styles.filterPillActive,
                        ]}
                    >
                        <SlidersHorizontal
                            size={12}
                            color={activeFiltersCount > 0 ? Colors.white : Colors.deepPlum}
                            style={{ marginRight: 4 }}
                        />
                        <Text
                            style={[
                                styles.cityPillText,
                                activeFiltersCount > 0 && styles.cityPillTextActive,
                                { fontWeight: '700' },
                            ]}
                        >
                            {activeFiltersCount > 0
                                ? `Filters (${activeFiltersCount})`
                                : 'Filters'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.pillDivider} />

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
                    <ActivityIndicator size="large" color={Colors.plumPrimary} />
                    <Text style={styles.loadingText}>
                        Finding verified food-inclusive stays...
                    </Text>
                </View>
            ) : errorMessage && properties.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ExceptionalState
                        type="no-internet"
                        title="Unable to Load Stays"
                        description={errorMessage}
                        primaryActionLabel="Tap to Retry"
                        onPrimaryAction={() => loadProperties()}
                    />
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
                        <View>
                            {/* Stay Categories Visual Showcase */}
                            <View style={styles.categoriesSection}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionHeading}>Stay Categories</Text>
                                    <TouchableOpacity
                                        onPress={() => setSelectedCategory('all')}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.seeAllText}>See All &gt;</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.categoryCardsRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.visualCatCard,
                                            selectedCategory === 'hostels-pg' &&
                                                styles.visualCatCardActive,
                                        ]}
                                        onPress={() =>
                                            setSelectedCategory(
                                                selectedCategory === 'hostels-pg'
                                                    ? 'all'
                                                    : 'hostels-pg',
                                            )
                                        }
                                        activeOpacity={0.85}
                                    >
                                        <Image
                                            source={{
                                                uri: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80',
                                            }}
                                            style={styles.visualCatImg}
                                        />
                                        <Text
                                            style={[
                                                styles.visualCatLabel,
                                                selectedCategory === 'hostels-pg' &&
                                                    styles.visualCatLabelActive,
                                            ]}
                                        >
                                            Hostels PGs
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.visualCatCard,
                                            selectedCategory === 'homestays' &&
                                                styles.visualCatCardActive,
                                        ]}
                                        onPress={() =>
                                            setSelectedCategory(
                                                selectedCategory === 'homestays'
                                                    ? 'all'
                                                    : 'homestays',
                                            )
                                        }
                                        activeOpacity={0.85}
                                    >
                                        <Image
                                            source={{
                                                uri: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80',
                                            }}
                                            style={styles.visualCatImg}
                                        />
                                        <Text
                                            style={[
                                                styles.visualCatLabel,
                                                selectedCategory === 'homestays' &&
                                                    styles.visualCatLabelActive,
                                            ]}
                                        >
                                            Homestays
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.visualCatCard,
                                            selectedCategory === 'co-living' &&
                                                styles.visualCatCardActive,
                                        ]}
                                        onPress={() =>
                                            setSelectedCategory(
                                                selectedCategory === 'co-living'
                                                    ? 'all'
                                                    : 'co-living',
                                            )
                                        }
                                        activeOpacity={0.85}
                                    >
                                        <Image
                                            source={{
                                                uri: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&q=80',
                                            }}
                                            style={styles.visualCatImg}
                                        />
                                        <Text
                                            style={[
                                                styles.visualCatLabel,
                                                selectedCategory === 'co-living' &&
                                                    styles.visualCatLabelActive,
                                            ]}
                                        >
                                            Co-Living
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Food Guarantee Banner with transparent meal disclosures */}
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

                            {/* Featured Properties Section Heading */}
                            <View style={[styles.sectionHeaderRow, { marginTop: Spacing.md }]}>
                                <Text style={styles.sectionHeading}>Featured Properties</Text>
                                <TouchableOpacity
                                    onPress={() => loadProperties(true)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.seeAllText}>See All &gt;</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        <ExceptionalState
                            type="no-results"
                            title={
                                selectedCategory !== 'all'
                                    ? `No ${getCategoryDisplayName(selectedCategory)} Found`
                                    : 'No Stays Found'
                            }
                            description="Try adjusting your filters, selecting a different city, or clearing active search keywords."
                            primaryActionLabel="Reset Filters"
                            onPrimaryAction={() => {
                                setSelectedCategory('all');
                                setSelectedCity('All');
                                setSearchQuery('');
                                setFilterAc(false);
                                setSelectedGender('all');
                                resetAdvancedFilters();
                                loadProperties();
                            }}
                        />
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

            {/* Advanced Filters Modal */}
            <Modal
                visible={advancedModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setAdvancedModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <SlidersHorizontal size={18} color={Colors.deepPlum} />
                                <Text style={styles.modalTitle}>Stay Filters</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setAdvancedModalVisible(false)}
                                style={{ padding: 4 }}
                            >
                                <X size={20} color={Colors.deepPlum} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            contentContainerStyle={styles.modalScroll}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Dates */}
                            <Text style={styles.filterGroupTitle}>Stay Dates</Text>
                            <View style={styles.dateInputsRow}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Check-in Date"
                                        placeholder="YYYY-MM-DD"
                                        value={checkInDate}
                                        onChangeText={setCheckInDate}
                                    />
                                </View>
                                <View style={{ width: Spacing.sm }} />
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Check-out Date"
                                        placeholder="YYYY-MM-DD"
                                        value={checkOutDate}
                                        onChangeText={setCheckOutDate}
                                    />
                                </View>
                            </View>

                            {/* Meal Inclusions */}
                            <Text style={styles.filterGroupTitle}>Meal Inclusions</Text>
                            <Text style={styles.filterGroupSub}>
                                Filter properties offering verified meal services.
                            </Text>
                            <View style={styles.chipsWrap}>
                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        filterBreakfast && styles.filterChipActive,
                                    ]}
                                    onPress={() => setFilterBreakfast(!filterBreakfast)}
                                >
                                    <Utensils
                                        size={14}
                                        color={filterBreakfast ? Colors.white : Colors.gray700}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            filterBreakfast && styles.filterChipTextActive,
                                        ]}
                                    >
                                        Breakfast
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        filterLunch && styles.filterChipActive,
                                    ]}
                                    onPress={() => setFilterLunch(!filterLunch)}
                                >
                                    <Utensils
                                        size={14}
                                        color={filterLunch ? Colors.white : Colors.gray700}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            filterLunch && styles.filterChipTextActive,
                                        ]}
                                    >
                                        Lunch
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        filterDinner && styles.filterChipActive,
                                    ]}
                                    onPress={() => setFilterDinner(!filterDinner)}
                                >
                                    <Utensils
                                        size={14}
                                        color={filterDinner ? Colors.white : Colors.gray700}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            filterDinner && styles.filterChipTextActive,
                                        ]}
                                    >
                                        Dinner
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Sharing Capacity */}
                            <Text style={styles.filterGroupTitle}>Room Sharing Capacity</Text>
                            <View style={styles.chipsWrap}>
                                {[
                                    { capacity: 1, label: 'Single / 1-Share' },
                                    { capacity: 2, label: '2-Share' },
                                    { capacity: 3, label: '3-Share' },
                                    { capacity: 4, label: '4+ Share' },
                                ].map((item) => {
                                    const isSelected = selectedSharing === item.capacity;
                                    return (
                                        <TouchableOpacity
                                            key={item.capacity}
                                            style={[
                                                styles.filterChip,
                                                isSelected && styles.filterChipActive,
                                            ]}
                                            onPress={() =>
                                                setSelectedSharing(
                                                    isSelected ? null : item.capacity,
                                                )
                                            }
                                        >
                                            <Users
                                                size={14}
                                                color={isSelected ? Colors.white : Colors.gray700}
                                                style={{ marginRight: 6 }}
                                            />
                                            <Text
                                                style={[
                                                    styles.filterChipText,
                                                    isSelected && styles.filterChipTextActive,
                                                ]}
                                            >
                                                {item.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Monthly Price Range */}
                            <Text style={styles.filterGroupTitle}>Monthly Budget Range</Text>
                            <View style={styles.dateInputsRow}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Min Monthly (₹)"
                                        placeholder="e.g. 5000"
                                        keyboardType="numeric"
                                        value={minPrice}
                                        onChangeText={setMinPrice}
                                    />
                                </View>
                                <View style={{ width: Spacing.sm }} />
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Max Monthly (₹)"
                                        placeholder="e.g. 25000"
                                        keyboardType="numeric"
                                        value={maxPrice}
                                        onChangeText={setMaxPrice}
                                    />
                                </View>
                            </View>

                            {/* Modal Action Buttons */}
                            <View style={styles.modalButtonsRow}>
                                <Button
                                    title="Reset All"
                                    variant="outline"
                                    onPress={resetAdvancedFilters}
                                    style={{ flex: 1 }}
                                />
                                <Button
                                    title="Apply Filters"
                                    onPress={() => {
                                        setAdvancedModalVisible(false);
                                        loadProperties();
                                    }}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.canvas,
    },
    plumHeader: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.base,
        paddingTop: Platform.OS === 'android' ? 36 : 10,
        paddingBottom: Spacing.base,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
        ...Shadows.subtle,
    },
    plumHeaderTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    locationSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.pill,
    },
    locationText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.white,
    },
    notificationBell: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.pill,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    notificationBadgeDot: {
        position: 'absolute',
        top: 7,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.coral,
        borderWidth: 1.5,
        borderColor: Colors.deepPlum,
    },
    brandHeroCenter: {
        alignItems: 'center',
        marginVertical: Spacing.xs,
    },
    logoBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    roofMark: {
        width: 14,
        height: 8,
        borderTopWidth: 2.5,
        borderLeftWidth: 2.5,
        borderRightWidth: 2.5,
        borderColor: Colors.coral,
        marginRight: 6,
        borderRadius: 2,
    },
    brandLogoText: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.white,
        letterSpacing: 2,
    },
    brandTaglineText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.coral,
        letterSpacing: 1,
    },
    searchSection: {
        backgroundColor: Colors.white,
        paddingTop: Spacing.xs,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
        ...Shadows.subtle,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.md,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        borderRadius: BorderRadius.pill,
        marginTop: Spacing.xs,
        ...Shadows.subtle,
    },
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.inkPrimary,
    },
    searchFilterBtn: {
        padding: 4,
        marginLeft: 4,
    },
    categoriesSection: {
        marginBottom: Spacing.md,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        paddingHorizontal: 2,
    },
    sectionHeading: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.deepPlum,
    },
    seeAllText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.coral,
    },
    categoryCardsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    visualCatCard: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: Colors.borderSubtle,
        alignItems: 'center',
        paddingBottom: Spacing.xs + 2,
        ...Shadows.subtle,
    },
    visualCatCardActive: {
        borderColor: Colors.coral,
        backgroundColor: '#FFF9F7',
    },
    visualCatImg: {
        width: '100%',
        height: 76,
        borderRadius: 12,
        marginBottom: 6,
    },
    visualCatLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    visualCatLabelActive: {
        color: Colors.coral,
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
        backgroundColor: Colors.surfaceSubtle,
        paddingHorizontal: Spacing.base,
        paddingVertical: 8,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    categoryPillText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.inkSecondary,
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
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    cityPillActive: {
        backgroundColor: Colors.plumPrimary,
        borderColor: Colors.plumPrimary,
    },
    filterPillActive: {
        backgroundColor: Colors.coralPrimary,
        borderColor: Colors.coralPrimary,
    },
    cityPillText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.inkSecondary,
    },
    cityPillTextActive: {
        color: Colors.white,
    },
    pillDivider: {
        width: 1,
        height: 18,
        backgroundColor: Colors.borderStrong,
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
        color: Colors.inkSecondary,
    },
    errorText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.danger,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    retryButton: {
        backgroundColor: Colors.plumPrimary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.pill,
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
        backgroundColor: Colors.peachCream,
        borderColor: Colors.peachSoft,
        borderWidth: 1,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        marginBottom: Spacing.base,
        ...Shadows.subtle,
    },
    bannerBadge: {
        backgroundColor: Colors.coralPrimary,
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
        color: Colors.plumDeep,
        marginBottom: 4,
    },
    bannerDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.inkSecondary,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    modalTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    modalScroll: {
        paddingBottom: Spacing.xl,
    },
    filterGroupTitle: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
        marginTop: Spacing.md,
        marginBottom: 4,
    },
    filterGroupSub: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginBottom: Spacing.xs,
        fontSize: 11,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginTop: 4,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray100,
        paddingHorizontal: Spacing.md,
        paddingVertical: 7,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    filterChipActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    filterChipText: {
        ...Typography.bodySmall,
        color: Colors.gray700,
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: Colors.white,
        fontWeight: '700',
    },
    dateInputsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    modalButtonsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.xl,
    },
});
