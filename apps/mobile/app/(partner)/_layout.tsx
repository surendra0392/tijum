import React from 'react';
import { Tabs } from 'expo-router';
import {
    LayoutDashboard,
    ClipboardList,
    Building2,
    IndianRupee,
    Bell,
    UserCheck,
} from 'lucide-react-native';
import { Colors } from '../../src/theme/colors';

export default function PartnerTabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors.deepPlum,
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
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    headerTitle: 'Host Command Center',
                    tabBarIcon: ({ color }: { color: string }) => (
                        <LayoutDashboard size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="reservations/index"
                options={{
                    title: 'Bookings',
                    headerTitle: 'Guest Bookings',
                    tabBarIcon: ({ color }: { color: string }) => (
                        <ClipboardList size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="properties/index"
                options={{
                    title: 'Stays',
                    headerTitle: 'My Properties',
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Building2 size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settlements/index"
                options={{
                    title: 'Finances',
                    headerTitle: 'Payouts & Settlements',
                    tabBarIcon: ({ color }: { color: string }) => (
                        <IndianRupee size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications/index"
                options={{
                    title: 'Alerts',
                    headerTitle: 'Partner Alerts',
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Bell size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="account"
                options={{
                    title: 'Account',
                    headerTitle: 'Host Profile',
                    tabBarIcon: ({ color }: { color: string }) => (
                        <UserCheck size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="reservations/[reference]"
                options={{
                    href: null,
                    headerTitle: 'Booking Review',
                }}
            />
            <Tabs.Screen
                name="reviews/index"
                options={{
                    href: null,
                    headerTitle: 'Guest Reviews',
                }}
            />
        </Tabs>
    );
}
