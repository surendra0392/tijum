declare module 'react-native' {
    import * as React from 'react';

    export interface StyleProp<T> {
        [key: string]: any;
    }

    export interface ViewStyle {
        [key: string]: any;
    }

    export interface TextStyle {
        [key: string]: any;
    }

    export interface ImageStyle {
        [key: string]: any;
    }

    export interface ViewProps {
        style?: any;
        children?: React.ReactNode;
        [key: string]: any;
    }

    export interface TextProps {
        style?: any;
        children?: React.ReactNode;
        numberOfLines?: number;
        [key: string]: any;
    }

    export interface TextInputProps {
        value?: string;
        onChangeText?: (text: string) => void;
        placeholder?: string;
        placeholderTextColor?: string;
        secureTextEntry?: boolean;
        keyboardType?: string;
        autoCapitalize?: string;
        multiline?: boolean;
        numberOfLines?: number;
        style?: any;
        [key: string]: any;
    }

    export interface TouchableOpacityProps {
        onPress?: () => void | Promise<void>;
        disabled?: boolean;
        activeOpacity?: number;
        style?: any;
        children?: React.ReactNode;
        [key: string]: any;
    }

    export interface ScrollViewProps {
        style?: any;
        contentContainerStyle?: any;
        refreshControl?: any;
        children?: React.ReactNode;
        [key: string]: any;
    }

    export const View: React.FC<ViewProps>;
    export const Text: React.FC<TextProps>;
    export const TextInput: React.FC<TextInputProps>;
    export const TouchableOpacity: React.FC<TouchableOpacityProps>;
    export const ScrollView: React.FC<ScrollViewProps>;
    export const FlatList: React.FC<any>;
    export const SafeAreaView: React.FC<ViewProps>;
    export const KeyboardAvoidingView: React.FC<any>;
    export const ActivityIndicator: React.FC<any>;
    export const RefreshControl: React.FC<any>;
    export const Modal: React.FC<any>;
    export const Image: React.FC<any>;
    export const StatusBar: React.FC<any>;
    export const Switch: React.FC<any>;

    export const StyleSheet: {
        create: <T extends Record<string, any>>(styles: T) => T;
        hairlineWidth: number;
    };

    export const Platform: {
        OS: 'ios' | 'android' | 'web';
        select: <T>(specifics: { ios?: T; android?: T; default?: T }) => T;
    };

    export const Alert: {
        alert: (
            title: string,
            message?: string,
            buttons?: Array<{
                text: string;
                onPress?: () => void;
                style?: 'default' | 'cancel' | 'destructive';
            }>,
        ) => void;
    };

    export const Dimensions: {
        get: (dim: 'window' | 'screen') => {
            width: number;
            height: number;
            scale: number;
            fontScale: number;
        };
    };

    export const Linking: {
        openURL: (url: string) => Promise<any>;
        canOpenURL: (url: string) => Promise<boolean>;
    };

    export const Share: {
        share: (content: {
            message: string;
            title?: string;
            url?: string;
        }) => Promise<any>;
    };
}

declare module 'expo-router' {
    import * as React from 'react';

    export interface Router {
        push: (
            url: string | { pathname: string; params?: Record<string, any> },
        ) => void;
        replace: (
            url: string | { pathname: string; params?: Record<string, any> },
        ) => void;
        back: () => void;
        canGoBack: () => boolean;
    }

    export function useRouter(): Router;
    export function useLocalSearchParams<T extends Record<string, any>>(): T;
    export function usePathname(): string;
    export function useSegments(): string[];

    export const Stack: React.FC<any> & { Screen: React.FC<any> };
    export const Tabs: React.FC<any> & { Screen: React.FC<any> };
    export const Slot: React.FC<any>;
    export const Link: React.FC<any>;
}

declare module 'expo-notifications' {
    export enum PermissionStatus {
        GRANTED = 'granted',
        UNDETERMINED = 'undetermined',
        DENIED = 'denied',
    }

    export interface NotificationPermissionsStatus {
        status: PermissionStatus;
        granted: boolean;
        canAskAgain: boolean;
        expires: 'never' | number;
    }

    export interface Notification {
        request: {
            content: {
                title: string | null;
                body: string | null;
                data: Record<string, any>;
            };
        };
    }

    export interface NotificationResponse {
        notification: Notification;
        actionIdentifier: string;
    }

    export function setNotificationHandler(handler: {
        handleNotification: () => Promise<{
            shouldShowAlert: boolean;
            shouldPlaySound: boolean;
            shouldSetBadge: boolean;
        }>;
    }): void;

    export function getPermissionsAsync(): Promise<NotificationPermissionsStatus>;
    export function requestPermissionsAsync(
        permissions?: any,
    ): Promise<NotificationPermissionsStatus>;
    export function getExpoPushTokenAsync(
        options?: any,
    ): Promise<{ data: string }>;
    export function addNotificationReceivedListener(
        listener: (event: Notification) => void,
    ): { remove: () => void };
    export function addNotificationResponseReceivedListener(
        listener: (event: NotificationResponse) => void,
    ): { remove: () => void };
}

declare module 'expo-secure-store' {
    export function getItemAsync(
        key: string,
        options?: any,
    ): Promise<string | null>;
    export function setItemAsync(
        key: string,
        value: string,
        options?: any,
    ): Promise<void>;
    export function deleteItemAsync(key: string, options?: any): Promise<void>;
}

declare module 'react-native-razorpay' {
    export interface RazorpayCheckoutOptions {
        description?: string;
        image?: string;
        currency: string;
        key: string;
        amount: number;
        name: string;
        order_id: string;
        prefill?: {
            email?: string;
            contact?: string;
            name?: string;
        };
        theme?: {
            color?: string;
        };
        notes?: Record<string, string>;
    }

    export interface RazorpaySuccessResponse {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
    }

    export interface RazorpayErrorResponse {
        code: number;
        description: string;
        source?: string;
        step?: string;
        reason?: string;
        metadata?: {
            order_id?: string;
            payment_id?: string;
        };
    }

    export default class RazorpayCheckout {
        static open(
            options: RazorpayCheckoutOptions,
            successCallback: (data: RazorpaySuccessResponse) => void,
            errorCallback: (error: RazorpayErrorResponse) => void,
        ): void;
    }
}

declare module 'react-native-safe-area-context' {
    import * as React from 'react';
    export interface EdgeInsets {
        top: number;
        right: number;
        bottom: number;
        left: number;
    }
    export function useSafeAreaInsets(): EdgeInsets;
    export const SafeAreaProvider: React.FC<any>;
    export const SafeAreaView: React.FC<any>;
}

declare module 'react-native-screens' {
    export function enableScreens(shouldEnableScreens?: boolean): void;
}

declare module 'expo-status-bar' {
    import * as React from 'react';
    export interface StatusBarProps {
        style?: 'auto' | 'inverted' | 'light' | 'dark';
        backgroundColor?: string;
        translucent?: boolean;
        hidden?: boolean;
    }
    export const StatusBar: React.FC<StatusBarProps>;
}
