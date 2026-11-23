import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
    Search,
    X,
    Globe,
    MapPin,
    Snowflake,
    Building2,
    Home,
    Users,
    Sparkles,
    User,
    SlidersHorizontal,
    Utensils,
    Bell,
    ChevronDown,
} from 'lucide-react-native';
import { PublicApi } from '../../../src/api/public';
import { CustomerApi } from '../../../src/api/customer';
import { useAuth } from '../../../src/auth/AuthContext';
import { PropertyCard as PropertyCardType } from '../../../src/api/types';
import {
    CanonicalCategorySlug,
    getCategoryDisplayName,
    normalizeCategorySlug,
} from '../../../src/constants/categories';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { BrandLogo } from '../../../src/components/BrandLogo';
import { PropertyCard } from '../../../src/components/PropertyCard';
import { SkeletonCard } from '../../../src/components/Skeleton';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';

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

const GENDER_OPTIONS: { key: 'all' | 'male' | 'female'; label: string }[] =
    [
        { key: 'all', label: 'All Genders' },
        { key: 'male', label: 'Men Only' },
        { key: 'female', label: 'Women Only' },
    ];

interface ActiveFiltersState {
    city: string;
    category: 'all' | CanonicalCategorySlug;
    searchQuery: string;
    filterAc: boolean;
    gender: 'all' | 'male' | 'female';
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    sharing: number | null;
    minPrice: string;
    maxPrice: string;
    checkInDate: string;
    checkOutDate: string;
}

export default function ExploreScreen() {
    const router = useRouter();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const { token, authState, sessionEpoch } = useAuth();
    const [properties, setProperties] = useState<PropertyCardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState<
        'all' | CanonicalCategorySlug
    >('all');
    const [selectedCity, setSelectedCity] = useState('All');
    const [cities, setCities] = useState<{ label: string; value: string }[]>([
        { label: 'All', value: 'All' },
    ]);
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

    // Staged draft state for Filters Modal (applied only on explicit tap)
    const [draftCity, setDraftCity] = useState('All');
    const [draftBreakfast, setDraftBreakfast] = useState(false);
    const [draftLunch, setDraftLunch] = useState(false);
    const [draftDinner, setDraftDinner] = useState(false);
    const [draftSharing, setDraftSharing] = useState<number | null>(null);
    const [draftMinPrice, setDraftMinPrice] = useState('');
    const [draftMaxPrice, setDraftMaxPrice] = useState('');
    const [draftCheckInDate, setDraftCheckInDate] = useState('');
    const [draftCheckOutDate, setDraftCheckOutDate] = useState('');

    const [advancedModalVisible, setAdvancedModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorStatus, setErrorStatus] = useState<number | null>(null);
    const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set());
    const [unreadCount, setUnreadCount] = useState(0);

    // Restore customer wishlist & unread badge state on auth/focus/epoch
    useEffect(() => {
        if (!token || authState !== 'customer_authenticated') {
            setWishlistedIds(new Set());
            setUnreadCount(0);
            return;
        }
        if (!isFocused) {
            return;
        }

        void CustomerApi.getWishlist()
            .then((res) => {
                if (Array.isArray(res?.data)) {
                    setWishlistedIds(new Set(res.data.map((p) => p.id)));
                }
            })
            .catch(() => {});

        void CustomerApi.getUnreadCount()
            .then((res) => {
                setUnreadCount(Number(res?.data?.unread_count ?? 0));
            })
            .catch(() => {});
    }, [authState, token, sessionEpoch, isFocused]);

    const handleToggleWishlist = async (propertyId: number) => {
        if (!token || authState !== 'customer_authenticated') {
            router.push('/(auth)/customer-login');
            return;
        }

        const wasWishlisted = wishlistedIds.has(propertyId);
        setWishlistedIds((current) => {
            const next = new Set(current);
            if (wasWishlisted) {
                next.delete(propertyId);
            } else {
                next.add(propertyId);
            }
            return next;
        });

        try {
            const response = await CustomerApi.toggleWishlist(propertyId);
            setWishlistedIds((current) => {
                const next = new Set(current);
                if (response.wishlisted) {
                    next.add(propertyId);
                } else {
                    next.delete(propertyId);
                }
                return next;
            });
        } catch {
            setWishlistedIds((current) => {
                const next = new Set(current);
                if (wasWishlisted) {
                    next.add(propertyId);
                } else {
                    next.delete(propertyId);
                }
                return next;
            });
            Alert.alert(
                'Wishlist Not Updated',
                'Please check your connection and try again.',
            );
        }
    };

    const activeFiltersCount =
        (selectedCity !== 'All' ? 1 : 0) +
        (filterAc ? 1 : 0) +
        (selectedGender !== 'all' ? 1 : 0) +
        (filterBreakfast ? 1 : 0) +
        (filterLunch ? 1 : 0) +
        (filterDinner ? 1 : 0) +
        (selectedSharing ? 1 : 0) +
        (minPrice || maxPrice ? 1 : 0) +
        (checkInDate ? 1 : 0);

    const openAdvancedModal = () => {
        setDraftCity(selectedCity);
        setDraftBreakfast(filterBreakfast);
        setDraftLunch(filterLunch);
        setDraftDinner(filterDinner);
        setDraftSharing(selectedSharing);
        setDraftMinPrice(minPrice);
        setDraftMaxPrice(maxPrice);
        setDraftCheckInDate(checkInDate);
        setDraftCheckOutDate(checkOutDate);
        setAdvancedModalVisible(true);
    };

    const resetDraftFilters = () => {
        setDraftCity('All');
        setDraftBreakfast(false);
        setDraftLunch(false);
        setDraftDinner(false);
        setDraftSharing(null);
        setDraftMinPrice('');
        setDraftMaxPrice('');
        setDraftCheckInDate('');
        setDraftCheckOutDate('');
    };

    const resetAdvancedFilters = () => {
        setSelectedCity('All');
        setFilterBreakfast(false);
        setFilterLunch(false);
        setFilterDinner(false);
        setSelectedSharing(null);
        setMinPrice('');
        setMaxPrice('');
        setCheckInDate('');
        setCheckOutDate('');
        resetDraftFilters();
    };

    const searchQueryRef = useRef(searchQuery);
    searchQueryRef.current = searchQuery;
    const fetchSeqRef = useRef(0);

    const fetchProperties = useCallback(
        async (
            pageNum: number = 1,
            isRefresh: boolean = false,
            override?: Partial<ActiveFiltersState>,
        ) => {
            const effCity = override?.city ?? selectedCity;
            const effCat = override?.category ?? selectedCategory;
            const effSearch = override?.searchQuery ?? searchQueryRef.current;
            const effAc = override?.filterAc ?? filterAc;
            const effGender = override?.gender ?? selectedGender;
            const effBreakfast = override?.breakfast ?? filterBreakfast;
            const effLunch = override?.lunch ?? filterLunch;
            const effDinner = override?.dinner ?? filterDinner;
            const effSharing =
                override && 'sharing' in override
                    ? override.sharing
                    : selectedSharing;
            const effMinPrice = override?.minPrice ?? minPrice;
            const effMaxPrice = override?.maxPrice ?? maxPrice;
            const effCheckIn = override?.checkInDate ?? checkInDate;
            const effCheckOut = override?.checkOutDate ?? checkOutDate;
            const reqId = ++fetchSeqRef.current;

            if (pageNum > 1) {
                setLoadingMore(true);
            } else if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setErrorMessage(null);
            setErrorStatus(null);

            try {
                const filters: Record<string, any> = { page: pageNum };
                if (effCity !== 'All') {
                    filters.city = effCity.toLowerCase();
                }
                if (effCat !== 'all') {
                    filters.category = effCat;
                }
                if (effSearch.trim()) {
                    filters.locality = effSearch.trim();
                }
                if (effAc) {
                    filters.ac = true;
                }
                if (effGender !== 'all') {
                    filters.gender = effGender;
                    filters.gender_preference = effGender;
                }
                if (effBreakfast) {
                    filters.breakfast = true;
                }
                if (effLunch) {
                    filters.lunch = true;
                }
                if (effDinner) {
                    filters.dinner = true;
                }
                if (effSharing) {
                    filters.sharing_capacity =
                        effSharing === 4 ? [4, 5, 6, 7, 8] : effSharing;
                }
                if (effMinPrice && !isNaN(Number(effMinPrice))) {
                    filters.min_price = Number(effMinPrice) * 100;
                }
                if (effMaxPrice && !isNaN(Number(effMaxPrice))) {
                    filters.max_price = Number(effMaxPrice) * 100;
                }
                if (effCheckIn.trim()) {
                    filters.check_in_date = effCheckIn.trim();
                }
                if (effCheckOut.trim()) {
                    filters.check_out_date = effCheckOut.trim();
                }

                const res = await PublicApi.getProperties(filters);
                if (reqId !== fetchSeqRef.current) {
                    return;
                }
                let nextProperties = res.data || [];

                // Local normalization filter to ensure client displays strictly matching canonical category
                if (effCat !== 'all') {
                    nextProperties = nextProperties.filter((p) => {
                        const rawCat = p.category?.slug || p.category?.name;
                        const normalized = normalizeCategorySlug(rawCat);
                        return normalized === effCat;
                    });
                }

                if (pageNum > 1) {
                    setProperties((prev) => {
                        const seen = new Set(prev.map((item) => item.id));
                        return [
                            ...prev,
                            ...nextProperties.filter(
                                (item) => !seen.has(item.id),
                            ),
                        ];
                    });
                } else {
                    setProperties(nextProperties);
                }

                setCurrentPage(res.meta?.current_page ?? pageNum);
                setLastPage(res.meta?.last_page ?? pageNum);
            } catch (err: any) {
                if (reqId !== fetchSeqRef.current) {
                    return;
                }
                if (pageNum === 1) {
                    setProperties([]);
                    setErrorStatus(
                        typeof err?.status === 'number' ? err.status : null,
                    );
                    setErrorMessage(
                        err?.message ||
                            'Unable to load stays. Please try again.',
                    );
                }
            } finally {
                if (reqId === fetchSeqRef.current) {
                    setLoading(false);
                    setRefreshing(false);
                    setLoadingMore(false);
                }
            }
        },
        [
            selectedCity,
            selectedCategory,
            filterAc,
            selectedGender,
            filterBreakfast,
            filterLunch,
            filterDinner,
            selectedSharing,
            minPrice,
            maxPrice,
            checkInDate,
            checkOutDate,
        ],
    );

    const loadProperties = (isRefresh = false) =>
        fetchProperties(1, isRefresh);

    const loadMoreProperties = () => {
        if (loading || refreshing || loadingMore || currentPage >= lastPage) {
            return;
        }
        void fetchProperties(currentPage + 1, false);
    };

    useEffect(() => {
        void fetchProperties(1, false);
    }, [fetchProperties]);

    // Fetch cities from API for city selector
    useEffect(() => {
        PublicApi.getCities()
            .then((res) => {
                if (res.data && Array.isArray(res.data)) {
                    const cityOptions = res.data.map((city: any) => ({
                        label: city.name || city.slug || 'Unknown',
                        value: city.slug || '',
                    }));
                    setCities([{ label: 'All', value: 'All' }, ...cityOptions]);
                }
            })
            .catch(() => {
                setCities([{ label: 'All', value: 'All' }]);
            });
    }, []);

    const handleSearchSubmit = () => {
        void loadProperties();
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
    const selectedCityLabel =
        selectedCity === 'All'
            ? 'All Cities'
            : cities.find((c) => c.value === selectedCity)?.label ||
              selectedCity;

    return (
        <View style={styles.container}>
            {/* Top Curved Plum Header */}
            <View
                style={[
                    styles.plumHeader,
                    { paddingTop: Math.max(insets.top, Spacing.sm) + 4 },
                ]}
            >
                <SafeAreaView edges={[]}>
                    <View style={styles.plumHeaderTopRow}>
                        <TouchableOpacity
                            style={styles.locationSelector}
                            accessibilityRole="button"
                            accessibilityLabel="Select city or filters"
                            onPress={openAdvancedModal}
                            activeOpacity={0.8}
                        >
                            <MapPin
                                size={15}
                                color={Colors.coral}
                                style={{ marginRight: 4 }}
                            />
                            <Text style={styles.locationText}>
                                {selectedCityLabel}
                            </Text>
                            <ChevronDown
                                size={14}
                                color={Colors.white}
                                style={{ marginLeft: 4 }}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.notificationBell}
                            accessibilityRole="button"
                            accessibilityLabel={
                                unreadCount > 0
                                    ? `Notifications, ${unreadCount} unread`
                                    : 'Notifications'
                            }
                            onPress={() =>
                                router.push('/(customer)/notifications')
                            }
                            activeOpacity={0.8}
                        >
                            <Bell size={18} color={Colors.white} />
                            {unreadCount > 0 ? (
                                <View style={styles.notificationBadgeDot} />
                            ) : null}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.brandHeroCenter}>
                        <BrandLogo size={122} tone="light" />
                    </View>

                    <View style={styles.searchBar}>
                        <Search
                            size={18}
                            color={Colors.inkMuted}
                            style={styles.searchIcon}
                        />
                        <TextInput
                            testID="explore-search-input"
                            placeholder="Search locality, landmark or stay..."
                            placeholderTextColor={Colors.inkMuted}
                            accessibilityLabel="Search properties by locality or name"
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearchSubmit}
                            returnKeyType="search"
                        />
                        {searchQuery ? (
                            <TouchableOpacity
                                testID="explore-search-clear-btn"
                                accessibilityRole="button"
                                accessibilityLabel="Clear search query"
                                onPress={() => {
                                    setSearchQuery('');
                                    void fetchProperties(1, false, {
                                        searchQuery: '',
                                    });
                                }}
                                style={styles.searchIconBtn}
                            >
                                <X size={16} color={Colors.inkMuted} />
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            testID="explore-filter-button"
                            accessibilityRole="button"
                            accessibilityLabel="Open stay filters"
                            onPress={openAdvancedModal}
                            style={styles.searchFilterBtn}
                            activeOpacity={0.8}
                        >
                            <SlidersHorizontal
                                size={16}
                                color={
                                    activeFiltersCount > 0
                                        ? Colors.coralDark
                                        : Colors.deepPlum
                                }
                            />
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
                                testID={`category-tab-${tab.key}`}
                                accessibilityRole="tab"
                                accessibilityLabel={tab.label}
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
                        accessibilityRole="button"
                        onPress={openAdvancedModal}
                        style={[
                            styles.cityPill,
                            activeFiltersCount > 0 && styles.filterPillActive,
                        ]}
                    >
                        <SlidersHorizontal
                            size={12}
                            color={
                                activeFiltersCount > 0
                                    ? Colors.white
                                    : Colors.deepPlum
                            }
                            style={{ marginRight: 4 }}
                        />
                        <Text
                            style={[
                                styles.cityPillText,
                                activeFiltersCount > 0 &&
                                    styles.cityPillTextActive,
                                { fontWeight: '700' },
                            ]}
                        >
                            {activeFiltersCount > 0
                                ? `Filters (${activeFiltersCount})`
                                : 'Filters'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.pillDivider} />

                    {cities.map((city) => {
                        const isSelected = selectedCity === city.value;
                        return (
                            <TouchableOpacity
                                key={city.value}
                                activeOpacity={0.8}
                                onPress={() => setSelectedCity(city.value)}
                                style={[
                                    styles.cityPill,
                                    isSelected && styles.cityPillActive,
                                ]}
                            >
                                {city.value === 'All' ? (
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
                                    {city.value === 'All'
                                        ? 'All Cities'
                                        : city.label}
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
                <ScrollView
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                >
                    <SkeletonCard />
                    <SkeletonCard />
                </ScrollView>
            ) : errorMessage && properties.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ExceptionalState
                        type={
                            errorStatus === 422 ? 'no-results' : 'no-internet'
                        }
                        title={
                            errorStatus === 422
                                ? 'Adjust Search Filters'
                                : 'Unable to Load Stays'
                        }
                        description={errorMessage}
                        primaryActionLabel={
                            errorStatus === 422
                                ? 'Reset Filters'
                                : 'Tap to Retry'
                        }
                        onPrimaryAction={() => {
                            if (errorStatus === 422) {
                                setSelectedCategory('all');
                                setSelectedCity('All');
                                setSearchQuery('');
                                setFilterAc(false);
                                setSelectedGender('all');
                                resetAdvancedFilters();
                                void fetchProperties(1, false, {
                                    city: 'All',
                                    category: 'all',
                                    searchQuery: '',
                                    filterAc: false,
                                    gender: 'all',
                                    breakfast: false,
                                    lunch: false,
                                    dinner: false,
                                    sharing: null,
                                    minPrice: '',
                                    maxPrice: '',
                                    checkInDate: '',
                                    checkOutDate: '',
                                });
                            } else {
                                void loadProperties();
                            }
                        }}
                    />
                </View>
            ) : (
                <FlatList
                    data={properties}
                    keyExtractor={(item: any) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    onEndReached={loadMoreProperties}
                    onEndReachedThreshold={0.35}
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
                                    <Text style={styles.sectionHeading}>
                                        Stay Categories
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() =>
                                            setSelectedCategory('all')
                                        }
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.seeAllText}>
                                            See All &gt;
                                        </Text>
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
                                                selectedCategory ===
                                                    'hostels-pg'
                                                    ? 'all'
                                                    : 'hostels-pg',
                                            )
                                        }
                                        activeOpacity={0.85}
                                    >
                                        <Image
                                            source={require('../../../assets/categories/hostels-pg.jpg')}
                                            style={styles.visualCatImg}
                                        />
                                        <Text
                                            style={[
                                                styles.visualCatLabel,
                                                selectedCategory ===
                                                    'hostels-pg' &&
                                                    styles.visualCatLabelActive,
                                            ]}
                                        >
                                            Hostels/PG
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
                                            source={require('../../../assets/categories/homestays.jpg')}
                                            style={styles.visualCatImg}
                                        />
                                        <Text
                                            style={[
                                                styles.visualCatLabel,
                                                selectedCategory ===
                                                    'homestays' &&
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
                                            source={require('../../../assets/categories/co-living.jpg')}
                                            style={styles.visualCatImg}
                                        />
                                        <Text
                                            style={[
                                                styles.visualCatLabel,
                                                selectedCategory ===
                                                    'co-living' &&
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
                            <View
                                style={[
                                    styles.sectionHeaderRow,
                                    { marginTop: Spacing.md },
                                ]}
                            >
                                <Text style={styles.sectionHeading}>
                                    Featured Properties
                                </Text>
                                <TouchableOpacity
                                    onPress={() => loadProperties(true)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.seeAllText}>
                                        See All &gt;
                                    </Text>
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
                                void fetchProperties(1, false, {
                                    city: 'All',
                                    category: 'all',
                                    searchQuery: '',
                                    filterAc: false,
                                    gender: 'all',
                                    breakfast: false,
                                    lunch: false,
                                    dinner: false,
                                    sharing: null,
                                    minPrice: '',
                                    maxPrice: '',
                                    checkInDate: '',
                                    checkOutDate: '',
                                });
                            }}
                        />
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={{ paddingVertical: Spacing.md }}>
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.deepPlum}
                                />
                            </View>
                        ) : null
                    }
                    renderItem={({ item }: { item: any }) => (
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
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <SlidersHorizontal
                                    size={18}
                                    color={Colors.deepPlum}
                                />
                                <Text style={styles.modalTitle}>
                                    Stay Filters
                                </Text>
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
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* City */}
                            <Text style={styles.filterGroupTitle}>City</Text>
                            <View style={styles.chipsWrap}>
                                {cities.map((city) => {
                                    const isSelected = draftCity === city.value;
                                    return (
                                        <TouchableOpacity
                                            key={city.value}
                                            style={[
                                                styles.filterChip,
                                                isSelected &&
                                                    styles.filterChipActive,
                                            ]}
                                            onPress={() =>
                                                setDraftCity(city.value)
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.filterChipText,
                                                    isSelected &&
                                                        styles.filterChipTextActive,
                                                ]}
                                            >
                                                {city.value === 'All'
                                                    ? 'All Cities'
                                                    : city.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Dates */}
                            <Text style={styles.filterGroupTitle}>
                                Stay Dates
                            </Text>
                            <View style={styles.dateInputsRow}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Check-in Date"
                                        placeholder="YYYY-MM-DD"
                                        value={draftCheckInDate}
                                        onChangeText={setDraftCheckInDate}
                                    />
                                </View>
                                <View style={{ width: Spacing.sm }} />
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Check-out Date"
                                        placeholder="YYYY-MM-DD"
                                        value={draftCheckOutDate}
                                        onChangeText={setDraftCheckOutDate}
                                    />
                                </View>
                            </View>

                            {/* Meal Inclusions */}
                            <Text style={styles.filterGroupTitle}>
                                Meal Inclusions
                            </Text>
                            <Text style={styles.filterGroupSub}>
                                Filter properties offering verified meal
                                services.
                            </Text>
                            <View style={styles.chipsWrap}>
                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        draftBreakfast &&
                                            styles.filterChipActive,
                                    ]}
                                    onPress={() =>
                                        setDraftBreakfast(!draftBreakfast)
                                    }
                                >
                                    <Utensils
                                        size={14}
                                        color={
                                            draftBreakfast
                                                ? Colors.white
                                                : Colors.gray700
                                        }
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            draftBreakfast &&
                                                styles.filterChipTextActive,
                                        ]}
                                    >
                                        Breakfast
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        draftLunch && styles.filterChipActive,
                                    ]}
                                    onPress={() => setDraftLunch(!draftLunch)}
                                >
                                    <Utensils
                                        size={14}
                                        color={
                                            draftLunch
                                                ? Colors.white
                                                : Colors.gray700
                                        }
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            draftLunch &&
                                                styles.filterChipTextActive,
                                        ]}
                                    >
                                        Lunch
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.filterChip,
                                        draftDinner && styles.filterChipActive,
                                    ]}
                                    onPress={() => setDraftDinner(!draftDinner)}
                                >
                                    <Utensils
                                        size={14}
                                        color={
                                            draftDinner
                                                ? Colors.white
                                                : Colors.gray700
                                        }
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            draftDinner &&
                                                styles.filterChipTextActive,
                                        ]}
                                    >
                                        Dinner
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Sharing Capacity */}
                            <Text style={styles.filterGroupTitle}>
                                Room Sharing Capacity
                            </Text>
                            <View style={styles.chipsWrap}>
                                {[
                                    { capacity: 1, label: 'Single / 1-Share' },
                                    { capacity: 2, label: '2-Share' },
                                    { capacity: 3, label: '3-Share' },
                                    { capacity: 4, label: '4+ Share' },
                                ].map((item: any) => {
                                    const isSelected =
                                        draftSharing === item.capacity;
                                    return (
                                        <TouchableOpacity
                                            key={item.capacity}
                                            style={[
                                                styles.filterChip,
                                                isSelected &&
                                                    styles.filterChipActive,
                                            ]}
                                            onPress={() =>
                                                setDraftSharing(
                                                    isSelected
                                                        ? null
                                                        : item.capacity,
                                                )
                                            }
                                        >
                                            <Users
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
                                                    styles.filterChipText,
                                                    isSelected &&
                                                        styles.filterChipTextActive,
                                                ]}
                                            >
                                                {item.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Monthly Price Range */}
                            <Text style={styles.filterGroupTitle}>
                                Monthly Budget Range
                            </Text>
                            <View style={styles.dateInputsRow}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Min Monthly (₹)"
                                        placeholder="e.g. 5000"
                                        keyboardType="numeric"
                                        value={draftMinPrice}
                                        onChangeText={setDraftMinPrice}
                                    />
                                </View>
                                <View style={{ width: Spacing.sm }} />
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Max Monthly (₹)"
                                        placeholder="e.g. 25000"
                                        keyboardType="numeric"
                                        value={draftMaxPrice}
                                        onChangeText={setDraftMaxPrice}
                                    />
                                </View>
                            </View>

                            {/* Modal Action Buttons */}
                            <View style={styles.modalButtonsRow}>
                                <Button
                                    title="Reset All"
                                    variant="outline"
                                    onPress={resetDraftFilters}
                                    style={{ flex: 1 }}
                                />
                                <Button
                                    title="Apply Filters"
                                    onPress={() => {
                                        setSelectedCity(draftCity);
                                        setFilterBreakfast(draftBreakfast);
                                        setFilterLunch(draftLunch);
                                        setFilterDinner(draftDinner);
                                        setSelectedSharing(draftSharing);
                                        setMinPrice(draftMinPrice);
                                        setMaxPrice(draftMaxPrice);
                                        setCheckInDate(draftCheckInDate);
                                        setCheckOutDate(draftCheckOutDate);
                                        setAdvancedModalVisible(false);
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
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: BorderRadius.pill,
    },
    locationText: {
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: Typography.fontSize.xs,
        color: Colors.white,
    },
    notificationBell: {
        width: 48,
        height: 48,
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
        minHeight: 40,
        fontFamily: Typography.fontFamily.body,
        fontSize: Typography.fontSize.sm,
        color: Colors.inkPrimary,
    },
    searchIconBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchFilterBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
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
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: 13,
        color: Colors.coralDark,
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
        borderColor: Colors.deepPlum,
        backgroundColor: Colors.peachCream,
    },
    visualCatImg: {
        width: '100%',
        height: 76,
        borderRadius: 12,
        marginBottom: 6,
    },
    visualCatLabel: {
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: 12,
        color: Colors.deepPlum,
    },
    visualCatLabelActive: {
        color: Colors.coralDark,
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
