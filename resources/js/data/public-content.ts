export type ResponsiveImageSpec = {
    webpSrcSet: string;
    jpgSrcSet: string;
    fallbackSrc: string;
    sizes: string;
    width: number;
    height: number;
    alt: string;
    caption?: string;
};

export type ValuePropositionItem = {
    id: string;
    title: string;
    description: string;
    icon: 'utensils' | 'wallet' | 'calendar' | 'shield';
};

export type MealHighlightItem = {
    id: string;
    title: string;
    detail: string;
};

export type AccommodationCategoryItem = {
    id: 'hostels-pg' | 'homestays' | 'co-living';
    slug: 'hostels-pg' | 'homestays' | 'co-living';
    title: string;
    subtitle: string;
    description: string;
    highlights: string[];
    icon: 'bed' | 'building' | 'home' | 'users';
    image: ResponsiveImageSpec;
};

export type HowItWorksStepItem = {
    step: string;
    title: string;
    description: string;
    note: string;
    icon:
        | 'search'
        | 'sliders'
        | 'calendar-check'
        | 'message-check'
        | 'credit-card'
        | 'map-pin';
};

export type LaunchCityItem = {
    slug: string;
    name: string;
    state: string;
    context: string;
    audienceNote: string;
    statusLabel: string;
    image: ResponsiveImageSpec;
};

export type WhyTijumItem = {
    id: string;
    title: string;
    description: string;
};

export type FaqEntry = {
    id: string;
    question: string;
    answer: string;
};

export type FaqGroup = {
    id: string;
    category: string;
    description: string;
    items: FaqEntry[];
};

export const PUBLIC_IMAGES: Record<
    | 'heroStay'
    | 'heroMeal'
    | 'foodBreakfast'
    | 'foodDining'
    | 'partnerHospitality',
    ResponsiveImageSpec
> = {
    heroStay: {
        webpSrcSet:
            '/images/public/hero-stay-600w.webp 600w, /images/public/hero-stay-1200w.webp 1200w',
        jpgSrcSet:
            '/images/public/hero-stay-600w.jpg 600w, /images/public/hero-stay-1200w.jpg 1200w',
        fallbackSrc: '/images/public/hero-stay-1200w.jpg',
        sizes: '(max-width: 1023px) 100vw, 46vw',
        width: 1200,
        height: 900,
        alt: 'Bright, tidy twin-bed shared room with natural teak frames, warm cream bedding, study desk, and sunlit window',
        caption: 'Illustrative stay atmosphere · Verified stays open for booking',
    },
    heroMeal: {
        webpSrcSet:
            '/images/public/hero-meal-480w.webp 480w, /images/public/hero-meal-960w.webp 960w',
        jpgSrcSet:
            '/images/public/hero-meal-480w.jpg 480w, /images/public/hero-meal-960w.jpg 960w',
        fallbackSrc: '/images/public/hero-meal-960w.jpg',
        sizes: '(max-width: 1023px) 92vw, 38vw',
        width: 960,
        height: 720,
        alt: 'Home-style Indian meal served on a stainless-steel thali plate with phulkas, dal, vegetable sabzi, rice, salad, and curd',
        caption: 'Illustrative meal presentation · Inclusions vary by property',
    },
    foodBreakfast: {
        webpSrcSet:
            '/images/public/food-breakfast-480w.webp 480w, /images/public/food-breakfast-800w.webp 800w',
        jpgSrcSet:
            '/images/public/food-breakfast-480w.jpg 480w, /images/public/food-breakfast-800w.jpg 800w',
        fallbackSrc: '/images/public/food-breakfast-800w.jpg',
        sizes: '(max-width: 767px) 100vw, 33vw',
        width: 800,
        height: 600,
        alt: 'Fresh South Indian breakfast featuring steamed idli, crisp dosa, sambar, chutneys, and filter coffee in daylight',
    },
    foodDining: {
        webpSrcSet:
            '/images/public/food-dining-480w.webp 480w, /images/public/food-dining-800w.webp 800w',
        jpgSrcSet:
            '/images/public/food-dining-480w.jpg 480w, /images/public/food-dining-800w.jpg 800w',
        fallbackSrc: '/images/public/food-dining-800w.jpg',
        sizes: '(max-width: 767px) 100vw, 33vw',
        width: 800,
        height: 600,
        alt: 'Clean communal hostel and PG dining space with wooden tables, natural light, and tidy place settings',
    },
    partnerHospitality: {
        webpSrcSet:
            '/images/public/partner-hospitality-480w.webp 480w, /images/public/partner-hospitality-800w.webp 800w',
        jpgSrcSet:
            '/images/public/partner-hospitality-480w.jpg 480w, /images/public/partner-hospitality-800w.jpg 800w',
        fallbackSrc: '/images/public/partner-hospitality-800w.jpg',
        sizes: '(max-width: 1023px) 100vw, 44vw',
        width: 800,
        height: 600,
        alt: 'Sunlit courtyard reception inside an independent Indian hostel and homestay property with warm wooden desk and indoor plants',
        caption: 'Illustrative property reception concept',
    },
};

export const VALUE_PROPOSITIONS: ValuePropositionItem[] = [
    {
        id: 'food-included',
        title: 'Clear Meal Information',
        description:
            'See whether food is provided and which of breakfast, lunch, or dinner is included before you choose.',
        icon: 'utensils',
    },
    {
        id: 'transparent-pricing',
        title: 'Transparent Pricing',
        description:
            'Compare Hostels/PG, Homestays, and Co-Living accommodations using real room-type rates.',
        icon: 'wallet',
    },
    {
        id: 'stay-durations',
        title: 'Multiple Stay Durations',
        description:
            'Search supported daily, weekly, and monthly rates for the duration that matches your plans.',
        icon: 'calendar',
    },
    {
        id: 'clear-information',
        title: 'Clear Property Information',
        description:
            'Review room types, amenities, meal inclusions, availability, and arrival conditions in one place.',
        icon: 'shield',
    },
];

export const MEAL_HIGHLIGHTS: MealHighlightItem[] = [
    {
        id: 'breakfast',
        title: 'Breakfast',
        detail: 'Morning meal inclusions clearly marked wherever offered in the property package.',
    },
    {
        id: 'lunch',
        title: 'Lunch',
        detail: 'Daytime meal coverage indicated transparently alongside daily, weekly, or monthly stays.',
    },
    {
        id: 'dinner',
        title: 'Dinner',
        detail: 'Evening meal timings shared upfront so residents can plan after work or classes.',
    },
    {
        id: 'meal-details',
        title: 'Meal Details',
        detail: 'Review configured meal options provided by independent accommodation hosts according to listing details.',
    },
    {
        id: 'transparency',
        title: 'Honest Meal Schedules',
        detail: 'Compare food and meal arrangements before booking. Meal availability and inclusion vary by property.',
    },
];

export const ACCOMMODATION_CATEGORIES: AccommodationCategoryItem[] = [
    {
        id: 'hostels-pg',
        slug: 'hostels-pg',
        title: 'Hostels/PG',
        subtitle: 'Hostel & Paying Guest Accommodation',
        description:
            'Explore hostel and paying guest accommodation with room options, amenities and meal arrangements shown for each property.',
        highlights: [
            'Room options and sharing configurations shown for each property',
            'Property-specific amenities and meal arrangements',
            'Daily, weekly, and monthly stay durations available per listing',
        ],
        icon: 'bed',
        image: {
            webpSrcSet:
                '/images/public/category-hostel-480w.webp 480w, /images/public/category-hostel-800w.webp 800w',
            jpgSrcSet:
                '/images/public/category-hostel-480w.jpg 480w, /images/public/category-hostel-800w.jpg 800w',
            fallbackSrc: '/images/public/category-hostel-800w.jpg',
            sizes: '(max-width: 767px) 100vw, 33vw',
            width: 800,
            height: 600,
            alt: 'Illustrative interior of a tidy modern Indian hostel and PG shared room with wooden bunks and study desks',
        },
    },
    {
        id: 'homestays',
        slug: 'homestays',
        title: 'Homestays',
        subtitle: 'Residential Home Accommodation',
        description:
            'Explore accommodation in residential homes, with property details, room options and available services shown for each property.',
        highlights: [
            'Accommodation situated in residential neighborhood homes',
            'Property details, room options, and available services shown upfront',
            'Clear house guidelines and direct communication with hosts',
        ],
        icon: 'home',
        image: {
            webpSrcSet:
                '/images/public/category-homestay-480w.webp 480w, /images/public/category-homestay-800w.webp 800w',
            jpgSrcSet:
                '/images/public/category-homestay-480w.jpg 480w, /images/public/category-homestay-800w.jpg 800w',
            fallbackSrc: '/images/public/category-homestay-800w.jpg',
            sizes: '(max-width: 767px) 100vw, 33vw',
            width: 800,
            height: 600,
            alt: 'Illustrative sunlit Indian homestay room with carved teak bed, handloom bedding, cane chair, and leafy plants',
        },
    },
    {
        id: 'co-living',
        slug: 'co-living',
        title: 'Co-Living',
        subtitle: 'Shared-Living Spaces',
        description:
            'Explore shared-living accommodation with room options, property details and available amenities shown for each space.',
        highlights: [
            'Room options and living spaces configured per property',
            'Property details and available amenities shown for each space',
            'Flexible daily, weekly, and monthly payment options',
        ],
        icon: 'users',
        image: {
            webpSrcSet:
                '/images/public/category-pg-480w.webp 480w, /images/public/category-pg-800w.webp 800w',
            jpgSrcSet:
                '/images/public/category-pg-480w.jpg 480w, /images/public/category-pg-800w.jpg 800w',
            fallbackSrc: '/images/public/category-pg-800w.jpg',
            sizes: '(max-width: 767px) 100vw, 33vw',
            width: 800,
            height: 600,
            alt: 'Illustrative modern co-living space with private workstation, comfortable bedding, and natural daylight',
        },
    },
];

export const HOW_IT_WORKS_STEPS: HowItWorksStepItem[] = [
    {
        step: '01',
        title: 'Discover a Stay',
        description:
            'Choose a city, date, stay duration, and guest quantity to see eligible room types.',
        note: 'Date-specific discovery',
        icon: 'search',
    },
    {
        step: '02',
        title: 'Compare Your Options',
        description:
            'Review accommodation details, room-type rates, availability, amenities, and exact meal inclusions.',
        note: 'Real listing information',
        icon: 'sliders',
    },
    {
        step: '03',
        title: 'Select & Hold Inventory',
        description:
            'Select your room type and quantity. A 15-minute inventory hold secures your reservation quote while you checkout.',
        note: '15-minute inventory hold',
        icon: 'calendar-check',
    },
    {
        step: '04',
        title: 'Complete Payment',
        description:
            'Pay securely through online checkout. The backend verifies captured payment authoritatively.',
        note: 'Backend verifies payment',
        icon: 'credit-card',
    },
    {
        step: '05',
        title: 'Automatic Confirmation',
        description:
            'Your reservation confirms immediately upon verified payment. No owner approval required.',
        note: 'Instant confirmation',
        icon: 'message-check',
    },
    {
        step: '06',
        title: 'Ready for Arrival',
        description:
            'Review confirmed booking details and arrival guidelines. The partner allocates your physical room prior to check-in.',
        note: 'Ready for arrival',
        icon: 'map-pin',
    },
];

export const LAUNCH_CITIES: LaunchCityItem[] = [
    {
        slug: 'hyderabad',
        name: 'Hyderabad',
        state: 'Telangana',
        context:
            'Explore accommodation around technology corridors, coaching hubs, and student neighbourhoods.',
        audienceNote: 'Hostels/PG, Homestays, and Co-Living',
        statusLabel: 'Explore Hyderabad',
        image: {
            webpSrcSet:
                '/images/public/city-hyderabad-480w.webp 480w, /images/public/city-hyderabad-800w.webp 800w',
            jpgSrcSet:
                '/images/public/city-hyderabad-480w.jpg 480w, /images/public/city-hyderabad-800w.jpg 800w',
            fallbackSrc: '/images/public/city-hyderabad-800w.jpg',
            sizes: '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw',
            width: 800,
            height: 500,
            alt: 'Illustrative daylight skyline view of Hyderabad showing historic Deccan heritage arches and modern districts',
        },
    },
    {
        slug: 'guntur',
        name: 'Guntur',
        state: 'Andhra Pradesh',
        context:
            'Discover stay options around university corridors, residential areas, and key city connections.',
        audienceNote: 'Student and flexible stays',
        statusLabel: 'Explore Guntur',
        image: {
            webpSrcSet:
                '/images/public/city-guntur-480w.webp 480w, /images/public/city-guntur-800w.webp 800w',
            jpgSrcSet:
                '/images/public/city-guntur-480w.jpg 480w, /images/public/city-guntur-800w.jpg 800w',
            fallbackSrc: '/images/public/city-guntur-800w.jpg',
            sizes: '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw',
            width: 800,
            height: 500,
            alt: 'Illustrative sunny tree-lined avenue in Guntur framed by flowering trees and quiet urban neighbourhoods',
        },
    },
    {
        slug: 'vijayawada',
        name: 'Vijayawada',
        state: 'Andhra Pradesh',
        context:
            'Search around transit junctions, business districts, and established residential areas.',
        audienceNote: 'Transit, work and study stays',
        statusLabel: 'Explore Vijayawada',
        image: {
            webpSrcSet:
                '/images/public/city-vijayawada-480w.webp 480w, /images/public/city-vijayawada-800w.webp 800w',
            jpgSrcSet:
                '/images/public/city-vijayawada-480w.jpg 480w, /images/public/city-vijayawada-800w.jpg 800w',
            fallbackSrc: '/images/public/city-vijayawada-800w.jpg',
            sizes: '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw',
            width: 800,
            height: 500,
            alt: 'Illustrative panoramic view of Vijayawada with the Krishna River, bridges, and green hills in afternoon light',
        },
    },
    {
        slug: 'visakhapatnam',
        name: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        context:
            'Browse accommodation for campus moves, work travel, and longer stays across the coastal city.',
        audienceNote: 'Campus, coastal and work stays',
        statusLabel: 'Explore Visakhapatnam',
        image: {
            webpSrcSet:
                '/images/public/city-visakhapatnam-480w.webp 480w, /images/public/city-visakhapatnam-800w.webp 800w',
            jpgSrcSet:
                '/images/public/city-visakhapatnam-480w.jpg 480w, /images/public/city-visakhapatnam-800w.jpg 800w',
            fallbackSrc: '/images/public/city-visakhapatnam-800w.jpg',
            sizes: '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw',
            width: 800,
            height: 500,
            alt: 'Illustrative sunlit coastal view of Visakhapatnam showing green hills meeting the curved shoreline of the Bay of Bengal',
        },
    },
];

export const WHY_CHOOSE_TIJUM: WhyTijumItem[] = [
    {
        id: 'food-inclusive',
        title: 'Food-inclusive accommodation',
        description:
            'Customers see whether food is provided and which meals are included before booking.',
    },
    {
        id: 'affordable-choices',
        title: 'Affordable choices',
        description:
            'Multiple independent Hostels/PG, Homestays, and Co-Living accommodations in one marketplace instead of fragmented phone calls or listings.',
    },
    {
        id: 'transparent-info',
        title: 'Transparent property information',
        description:
            'Room configurations, included food details, amenities, city locality context, and stay policies shown clearly upfront.',
    },
    {
        id: 'convenient-booking',
        title: 'Convenient booking',
        description:
            'Discover stays, compare room types, complete payment, and receive automatic reservation confirmation.',
    },
    {
        id: 'flexible-arrival',
        title: 'Flexible arrival options',
        description:
            'Standard stay timing with eligible early check-in shown per room type where offered, subject to availability.',
    },
    {
        id: 'customer-support',
        title: 'Customer-focused support',
        description:
            'Use structured support and reservation-linked issue reporting when a booking needs attention.',
    },
];

export function createCheckinRules(timing: StayTimingData) {
    const standardCheckin = formatStayTime(timing.standard_check_in_time);
    const standardCheckout = formatStayTime(timing.standard_check_out_time);
    const earliestEarlyCheckin = formatStayTime(
        timing.earliest_early_check_in_time,
    );

    return {
        standardCheckin,
        standardCheckout: `${standardCheckout} (stay end date)`,
        earliestEarlyCheckin,
        earliestCutoffNote: `No check-in permitted before ${earliestEarlyCheckin}`,
        highlights: [
            `Standard check-in is ${standardCheckin}, with checkout at ${standardCheckout} on the calculated stay end date.`,
            `Early check-in from ${earliestEarlyCheckin} is available only where an individual room type enables it and actual room availability permits.`,
            `Check-in earlier than ${earliestEarlyCheckin} is not permitted on TIJUM packages.`,
            'Early check-in availability is shown per eligible room type and is subject to actual availability (not guaranteed).',
        ],
    };
}

export const PARTNER_BENEFITS = [
    'Reach customers actively seeking daily, weekly, and monthly food-inclusive stays.',
    'Gain an additional digital booking channel without changing how you independently run your property.',
    'Present your room types, included food details, and amenities clearly in one structured storefront.',
    'Manage availability, confirmed bookings, and physical-room allocation in the Partner Portal.',
    'Connect with demand across initial launch markets: Hyderabad, Guntur, Vijayawada, and Visakhapatnam.',
];

export function createHomeFaqs(timing: StayTimingData): FaqEntry[] {
    const rules = createCheckinRules(timing);

    return [
        {
            id: 'what-is-tijum',
            question: 'What is TIJUM?',
            answer: 'TIJUM is an accommodation marketplace connecting customers with independent Hostels/PG, Homestays, and Co-Living spaces. Search-eligible stays provide food and show each included meal separately.',
        },
        {
            id: 'accommodation-types',
            question: 'What types of accommodation will be available?',
            answer: 'TIJUM focuses strictly on three canonical accommodation categories operated by independent providers: Hostels/PG, Homestays, and Co-Living across Hyderabad, Guntur, Vijayawada, and Visakhapatnam.',
        },
        {
            id: 'food-included',
            question: 'Is food included in every bookable stay?',
            answer: 'Search-eligible TIJUM stays provide food and include at least one configured meal. Breakfast, lunch, and dinner are independent property-level inclusions, so customers should review each status before booking.',
        },
        {
            id: 'daily-booking',
            question: 'Can I book accommodation for one day?',
            answer: 'Yes. Customers can book daily, weekly, and monthly food-inclusive stays using live date-specific availability.',
        },
        {
            id: 'weekly-monthly',
            question: 'Can I book weekly or monthly accommodation?',
            answer: 'Yes. TIJUM is designed to support daily, weekly, and monthly stay durations so students, interns, relocated workers, and travellers can select the duration that fits their plans.',
        },
        {
            id: 'standard-timings',
            question: 'What are the standard check-in and checkout timings?',
            answer: `Standard check-in is ${rules.standardCheckin} and checkout is ${rules.standardCheckout}.`,
        },
        {
            id: 'early-checkin-7am',
            question: `Can I check in at ${rules.earliestEarlyCheckin}?`,
            answer: `Eligible room types may offer early check-in from ${rules.earliestEarlyCheckin}, subject to actual room availability and operational readiness. ${rules.earliestCutoffNote}.`,
        },
        {
            id: 'online-payment',
            question: 'When do I pay for a reservation?',
            answer: 'When you select an available room type, a 15-minute inventory hold begins. Complete payment during this window, and your reservation confirms automatically once verified by the backend.',
        },
        {
            id: 'owner-registration',
            question:
                'Can hostel, PG, homestay, and co-living owners register?',
            answer: 'Yes. Independent Hostel/PG, Homestay, and Co-Living operators can create and verify an owner account, publish approved properties, receive confirmed reservations, and allocate stays to physical rooms.',
        },
    ];
}

export function createFullFaqGroups(timing: StayTimingData): FaqGroup[] {
    const homeFaqs = createHomeFaqs(timing);
    const rules = createCheckinRules(timing);

    return [
        {
            id: 'general',
            category: 'General',
            description:
                'How TIJUM operates as an accommodation marketplace and where we are launching.',
            items: [
                homeFaqs[0],
                {
                    id: 'does-tijum-own',
                    question:
                        'Does TIJUM own properties or operate its own kitchens?',
                    answer: 'No. TIJUM is an asset-light marketplace platform. Independent property owners and operators manage their own Hostels/PG, Homestays, Co-Living spaces, rooms, and food preparation.',
                },
                {
                    id: 'launch-cities-faq',
                    question:
                        'Which cities are included in the initial launch?',
                    answer: 'Our initial launch focuses on Hyderabad (Telangana), Guntur (Andhra Pradesh), Vijayawada (Andhra Pradesh), and Visakhapatnam (Andhra Pradesh). Live listings will roll out as partner properties complete onboarding.',
                },
            ],
        },
        {
            id: 'customers',
            category: 'Customers',
            description:
                'Creating a customer account and managing live reservations.',
            items: [
                {
                    id: 'can-i-book-now',
                    question: 'Can I search and complete a stay booking today?',
                    answer: 'Yes. Customers can search eligible properties, review date-specific quantity and pricing, hold inventory, and complete payment. The reservation confirms automatically upon verified payment without waiting for owner approval.',
                },
                {
                    id: 'phone-email-auth',
                    question:
                        'Can I sign in or reset my password with my mobile number?',
                    answer: 'Yes. TIJUM supports signing in with either your registered mobile number or your email address. You can also reset your password and receive verified SMS notifications directly to your phone.',
                },
                {
                    id: 'wishlist-and-compare',
                    question:
                        'Can I save stays to a wishlist or compare accommodations side-by-side?',
                    answer: 'Yes. Tap the heart icon on any property card to save it to your Wishlist in your Customer Dashboard. You can also add properties to the comparison tray to compare their room rates, meal inclusions, house rules, and amenities side-by-side.',
                },
                homeFaqs[3],
                homeFaqs[4],
            ],
        },
        {
            id: 'accommodation',
            category: 'Accommodation',
            description:
                'Canonical property categories (Hostels/PG, Homestays, Co-Living) and transparent listing details.',
            items: [
                homeFaqs[1],
                {
                    id: 'gender-preference-filter',
                    question:
                        'How does the gender filter work for Hostels, PGs, and Co-Living?',
                    answer: 'You can filter search results by gender eligibility: Men, Women, or Any/All. This helps students, female professionals, and male travelers find gender-segregated or co-ed spaces that match their stay requirements.',
                },
                {
                    id: 'map-view-search',
                    question:
                        'How do I explore properties on the interactive Map View?',
                    answer: 'Toggle the Map View button on the search page or city explore page. You will see an interactive map with custom TIJUM price markers alongside the property cards, allowing you to browse neighborhoods, distances, and transit hubs visually.',
                },
                {
                    id: 'other-categories-faq',
                    question: 'Are hotels or serviced apartments offered?',
                    answer: 'Not in Phase 1. TIJUM is purposefully focused on affordable Hostels/PG, Homestays, and Co-Living accommodations where daily food-inclusive stays deliver the clearest value.',
                },
                {
                    id: 'amenities-transparency',
                    question:
                        'Will amenities and stay rules be shown before booking?',
                    answer: 'Yes. Property and reservation-review pages present room setup, covered meals, available amenities, timing, live quantity, and the complete price snapshot before submission.',
                },
            ],
        },
        {
            id: 'food-and-meals',
            category: 'Food & Meals',
            description:
                'Our core food-inclusive rule and how meal packages work per property.',
            items: [
                homeFaqs[2],
                {
                    id: 'property-food-flags-faq',
                    question: 'What are property-specific food flags?',
                    answer: 'Each listing displays property-specific flags: Food Provided, Breakfast Included, Lunch Included, and Dinner Included. Properties declare their exact meal offerings so guests know precisely what is covered before booking.',
                },
                {
                    id: 'room-only-faq',
                    question: 'Can I book a room without food on TIJUM?',
                    answer: 'Search-eligible listings provide food and identify their included meals. Meal combinations vary, so review the separate breakfast, lunch, and dinner statuses before booking.',
                },
                {
                    id: 'meal-variety-faq',
                    question:
                        'Do all properties offer the exact same meals and dietary choices?',
                    answer: 'No. Each independent Hostel/PG, Homestay, or Co-Living property defines its own covered meals (such as breakfast, lunch, or dinner), meal timings, and dietary availability, which will be displayed transparently on each listing.',
                },
            ],
        },
        {
            id: 'checkin-checkout',
            category: 'Check-In & Checkout',
            description: `Standard stay hours and the strict ${rules.earliestEarlyCheckin} early-arrival boundary.`,
            items: [homeFaqs[5], homeFaqs[6]],
        },
        {
            id: 'reservation-total',
            category: 'Reservation Total',
            description:
                'How the quote, inventory hold, payment window, and automatic confirmation work.',
            items: [
                homeFaqs[7],
                {
                    id: 'transparent-total',
                    question:
                        'Are meal costs included inside the displayed package total?',
                    answer: 'Yes. Because food is built into every bookable TIJUM stay, the full reservation total is shown clearly before submission.',
                },
            ],
        },
        {
            id: 'property-partners',
            category: 'Property Partners',
            description:
                'Joining TIJUM as an independent Hostel/PG, Homestay, or Co-Living partner.',
            items: [
                homeFaqs[8],
                {
                    id: 'partner-registration-ten-fields',
                    question:
                        'What information is required to register as a property partner?',
                    answer: 'Partner registration is simple and transparent. You provide your Full Name, Email, Mobile Number, Property Name, Category (Hostels/PG, Homestays, or Co-Living), Gender Availability (Male, Female, or Both), City, Locality/Area, Property Description, and agree to the Platform Partner Terms.',
                },
                {
                    id: 'partner-who-eligible',
                    question: 'What kind of property partners can join now?',
                    answer: 'Operators and homeowners managing existing independent Hostels/PG, Homestays, or Co-Living accommodations in or around Hyderabad, Guntur, Vijayawada, and Visakhapatnam who offer food-inclusive stays.',
                },
                {
                    id: 'partner-when-listings',
                    question:
                        'When can I upload rooms, meals, and pricing in the Partner Portal?',
                    answer: 'Verified owners can manage property listings, physical rooms, food inclusions, direct rates, availability blocks, incoming confirmed reservations, and room allocation in the Partner Portal.',
                },
            ],
        },
        {
            id: 'rewards-and-coupons',
            category: 'Rewards, Referrals & Coupons',
            description:
                'How to earn loyalty points, share referral links, and apply promotional coupon codes.',
            items: [
                {
                    id: 'how-points-work',
                    question: 'How do TIJUM Loyalty Points work?',
                    answer: 'You earn loyalty points on eligible confirmed stay bookings once your stay completes. Points are credited to your Rewards Wallet and can be redeemed as a discount on future bookings. 1 point translates to a fixed rupee discount at checkout according to platform conversion rates.',
                },
                {
                    id: 'how-referral-works',
                    question: 'How does the Refer & Earn programme work?',
                    answer: 'Every customer receives a unique referral code and link (/r/{code}) in their Rewards Dashboard. When a friend signs up with your link and completes their first verified stay, both you and your friend receive reward points credited to your wallets.',
                },
                {
                    id: 'how-to-apply-coupon',
                    question: 'How do I apply a coupon code at checkout?',
                    answer: 'On the reservation checkout page, enter your coupon code in the promotion box and tap Apply. If the coupon is active and your booking meets eligibility criteria (such as minimum subtotal or category), the discount is deducted immediately from your accommodation subtotal.',
                },
                {
                    id: 'combine-coupons-points',
                    question:
                        'Can I use a coupon code and loyalty points together on the same booking?',
                    answer: 'Yes! The Central Promotion Engine calculates your bill in order: Accommodation Subtotal minus Coupon Discount, plus applicable taxes, minus Points Redemption, resulting in your Final Payable total.',
                },
                {
                    id: 'points-expiry-faq',
                    question: 'Do my TIJUM loyalty points expire?',
                    answer: 'Points have a defined validity period and expire on a First-Earned, First-Out (FEFO) basis. You can view your expiring points schedule and full transaction history anytime in your Customer Rewards Dashboard.',
                },
                {
                    id: 'owner-discount-impact',
                    question:
                        'Do platform coupons reduce property owners’ earnings?',
                    answer: 'No. Platform-funded promotional discounts and loyalty points redemptions are funded directly by TIJUM. Property partners receive their full agreed payout based on base rates, ensuring partner settlement integrity.',
                },
            ],
        },
    ];
}
import { formatStayTime } from '@/lib/stay-timing';
import type { StayTimingData } from '@/types/public-search';
