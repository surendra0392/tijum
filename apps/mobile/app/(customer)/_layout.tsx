import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Calendar, Headset, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/theme/colors';

const HIDDEN_TAB_STYLE = { display: 'none' } as const;

export default function CustomerTabsLayout() {
    const insets = useSafeAreaInsets();
    const bottomInset = Math.max(insets.bottom, 8);

    return (
        <Tabs
            backBehavior="history"
            screenOptions={{
                tabBarActiveTintColor: Colors.coral,
                tabBarInactiveTintColor: Colors.gray400,
                tabBarStyle: {
                    backgroundColor: Colors.white,
                    borderTopColor: Colors.gray200,
                    height: 68 + bottomInset,
                    paddingBottom: bottomInset + 4,
                    paddingTop: 6,
                },
                tabBarItemStyle: {
                    paddingVertical: 2,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    lineHeight: 15,
                    fontWeight: '700',
                    marginBottom: 2,
                },
                tabBarHideOnKeyboard: true,
                headerStyle: {
                    backgroundColor: Colors.white,
                },
                headerTintColor: Colors.deepPlum,
                headerTitleStyle: {
                    fontWeight: '700',
                },
            }}
        >
            <Tabs.Screen
                name="explore/index"
                options={{
                    title: 'Home',
                    headerShown: false,
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Home size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="bookings/index"
                options={{
                    title: 'Bookings',
                    headerShown: false,
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Calendar size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="support/index"
                options={{
                    title: 'Support',
                    headerShown: false,
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Headset size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile/index"
                options={{
                    title: 'Profile',
                    headerShown: false,
                    tabBarIcon: ({ color }: { color: string }) => (
                        <User size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications/index"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="explore/property/[slug]"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="bookings/[reference]"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="bookings/create"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="support/[reference]"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="support/tickets"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="support/ticket/[reference]"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="rewards/index"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="rewards/points"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="rewards/referrals"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="rewards/coupons"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="profile/edit"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="profile/security"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="reviews/index"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="wishlist/index"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
        </Tabs>
    );
}
