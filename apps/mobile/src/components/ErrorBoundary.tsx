import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Button } from './Button';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            errorMessage: null,
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            errorMessage: error?.message || 'An unexpected error occurred.',
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('[ErrorBoundary] Unhandled render error:', error, {
            componentStack: errorInfo?.componentStack,
        });
    }

    private handleReset = (): void => {
        this.setState({
            hasError: false,
            errorMessage: null,
        });
    };

    render(): React.ReactNode {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.eyebrow}>TIJUM</Text>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message}>
                        The screen encountered an unexpected problem. Your data
                        is safe—tap below to reload the view.
                    </Text>
                    {this.state.errorMessage ? (
                        <Text style={styles.detail} numberOfLines={3}>
                            {this.state.errorMessage}
                        </Text>
                    ) : null}
                    <Button
                        title="Reload Screen"
                        onPress={this.handleReset}
                        style={{ width: '100%' }}
                    />
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.cream,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    eyebrow: {
        fontFamily: Typography.fontFamily.headingExtraBold,
        fontSize: 12,
        letterSpacing: 1.4,
        color: Colors.coralDark,
        marginBottom: 8,
    },
    title: {
        fontFamily: Typography.fontFamily.heading,
        fontSize: 22,
        color: Colors.deepPlum,
        marginBottom: 10,
    },
    message: {
        fontFamily: Typography.fontFamily.body,
        fontSize: 14,
        lineHeight: 20,
        color: Colors.textSecondary,
        marginBottom: 14,
    },
    detail: {
        fontFamily: Typography.fontFamily.body,
        fontSize: 12,
        color: Colors.textMuted,
        backgroundColor: Colors.cream,
        padding: 10,
        borderRadius: 10,
        marginBottom: 18,
    },
});
