import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../src/theme/colors';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: Colors.white,
                },
                headerTintColor: Colors.deepPlum,
                headerTitleStyle: {
                    fontWeight: '700',
                },
                contentStyle: {
                    backgroundColor: Colors.cream,
                },
            }}
        >
            <Stack.Screen
                name="customer-login"
                options={{ title: 'Customer Sign In' }}
            />
            <Stack.Screen
                name="customer-register"
                options={{ title: 'Create Customer Account' }}
            />
            <Stack.Screen
                name="owner-login"
                options={{ title: 'Partner Sign In' }}
            />
            <Stack.Screen
                name="owner-register"
                options={{ title: 'Partner Registration' }}
            />
        </Stack>
    );
}
