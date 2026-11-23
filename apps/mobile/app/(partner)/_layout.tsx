import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Building2, ClipboardList, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/theme/colors';

const HIDDEN_TAB_STYLE = { display: 'none' } as const;

export default function PartnerTabsLayout() {
    const insets = useSafeAreaInsets();
    const bottomInset = Math.max(insets.bottom, 8);

    return (
        <Tabs
            backBehavior="history"
            screenOptions={{
                tabBarActiveTintColor: Colors.deepPlum,
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
                name="dashboard"
                options={{
                    title: 'Home',
                    headerShown: false,
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Home size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="properties/index"
                options={{
                    title: 'Properties',
                    headerShown: false,
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Building2 size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="reservations/index"
                options={{
                    title: 'Bookings',
                    headerShown: false,
                    tabBarIcon: ({ color }: { color: string }) => (
                        <ClipboardList size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="account"
                options={{
                    title: 'Profile',
                    headerShown: false,
                    tabBarIcon: ({ color }: { color: string }) => (
                        <User size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settlements/index"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
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
                name="reservations/[reference]"
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
                name="properties/create"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="properties/[id]/edit"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="properties/[id]/room-types"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="properties/[id]/rooms"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="properties/[id]/pricing"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="properties/[id]/availability"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="properties/[id]/media"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="properties/[id]/amenities"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="settlements/[reference]"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="financial-profile/index"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="financial-profile/agreements"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="cases/index"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
            <Tabs.Screen
                name="cases/[reference]"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: HIDDEN_TAB_STYLE,
                }}
            />
        </Tabs>
    );
}
