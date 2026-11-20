import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Calendar, Headset, User } from 'lucide-react-native';
import { Colors } from '../../src/theme/colors';

export default function CustomerTabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors.coral,
                tabBarInactiveTintColor: Colors.gray400,
                tabBarStyle: {
                    backgroundColor: Colors.white,
                    borderTopColor: Colors.gray200,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 6,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '700',
                },
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
                }}
            />
            <Tabs.Screen
                name="explore/property/[slug]"
                options={{
                    href: null,
                    headerTitle: 'Stay Details',
                }}
            />
            <Tabs.Screen
                name="bookings/[reference]"
                options={{
                    href: null,
                    headerTitle: 'Reservation Details',
                }}
            />
            <Tabs.Screen
                name="bookings/create"
                options={{
                    href: null,
                    headerTitle: 'Confirm Booking',
                }}
            />
            <Tabs.Screen
                name="support/[reference]"
                options={{
                    href: null,
                    headerTitle: 'Case Details & Timeline',
                }}
            />
            <Tabs.Screen
                name="rewards/index"
                options={{
                    href: null,
                    headerTitle: 'Rewards & Points',
                }}
            />
            <Tabs.Screen
                name="rewards/points"
                options={{
                    href: null,
                    headerTitle: 'Points Wallet',
                }}
            />
            <Tabs.Screen
                name="rewards/referrals"
                options={{
                    href: null,
                    headerTitle: 'Refer & Earn',
                }}
            />
            <Tabs.Screen
                name="rewards/coupons"
                options={{
                    href: null,
                    headerTitle: 'Available Coupons',
                }}
            />
            <Tabs.Screen
                name="wishlist/index"
                options={{
                    href: null,
                    headerShown: false,
                }}
            />
        </Tabs>
    );
}
