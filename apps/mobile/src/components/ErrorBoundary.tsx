import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../theme/colors';
import { BorderRadius, Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { Button } from './Button';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    diagnosticCode: string | null;
    timestamp: string | null;
    copied: boolean;
}

function generateDiagnosticCode(): string {
    const timeSegment = Date.now().toString(36).toUpperCase().slice(-5);
    const randSegment = Math.floor(1000 + Math.random() * 9000).toString(36).toUpperCase();
    return `ERR-${timeSegment}-${randSegment}`;
}

export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            diagnosticCode: null,
            timestamp: null,
            copied: false,
        };
    }

    static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
        return {
            hasError: true,
            diagnosticCode: generateDiagnosticCode(),
            timestamp: new Date().toISOString(),
            copied: false,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Redacted internal logging — do not log private user state to console
        console.error('[ErrorBoundary] Render exception caught:', {
            diagnosticCode: this.state.diagnosticCode,
            name: error?.name,
            componentStack: errorInfo?.componentStack?.slice(0, 500),
        });
    }

    private handleReset = (): void => {
        this.setState({
            hasError: false,
            diagnosticCode: null,
            timestamp: null,
            copied: false,
        });
    };

    private handleCopyCode = async (): Promise<void> => {
        if (!this.state.diagnosticCode) return;
        const textToCopy = `TIJUM Diagnostic Reference: ${this.state.diagnosticCode}\nTimestamp: ${this.state.timestamp}`;
        await Clipboard.setStringAsync(textToCopy);
        this.setState({ copied: true });
        setTimeout(() => {
            this.setState({ copied: false });
        }, 3000);
    };

    render(): React.ReactNode {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.badgeWrapper}>
                        <Text style={styles.eyebrow}>TIJUM APP RECOVERY</Text>
                    </View>

                    <Text style={styles.title}>Something went wrong</Text>
                    
                    <Text style={styles.message}>
                        The application encountered an unexpected problem loading this screen.
                        You can try reloading the view or returning to the main screen. If this
                        continues, please share the diagnostic code below with TIJUM Support.
                    </Text>

                    {/* Privacy-Safe Diagnostic Box (No raw exception leakage) */}
                    <View style={styles.diagnosticCard}>
                        <View style={styles.diagnosticRow}>
                            <Text style={styles.diagnosticLabel}>Reference Code:</Text>
                            <Text style={styles.diagnosticValue}>
                                {this.state.diagnosticCode ?? 'ERR-UNKNOWN'}
                            </Text>
                        </View>
                        <View style={styles.diagnosticRow}>
                            <Text style={styles.diagnosticLabel}>Recorded:</Text>
                            <Text style={styles.diagnosticMeta}>
                                {this.state.timestamp
                                    ? new Date(this.state.timestamp).toLocaleTimeString()
                                    : 'Just now'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.copyBtn}
                            onPress={() => void this.handleCopyCode()}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Copy diagnostic code to clipboard"
                        >
                            <Text style={styles.copyBtnText}>
                                {this.state.copied
                                    ? '✓ Reference Code Copied'
                                    : 'Copy Reference for Support'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actionButtons}>
                        <Button
                            title="Reload Screen"
                            onPress={this.handleReset}
                            style={{ marginBottom: Spacing.sm }}
                        />
                    </View>
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
        padding: Spacing.lg,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.gray200,
        shadowColor: Colors.deepPlum,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    badgeWrapper: {
        marginBottom: Spacing.sm,
    },
    eyebrow: {
        fontFamily: Typography.fontFamily.headingExtraBold,
        fontSize: 11,
        letterSpacing: 1.5,
        color: Colors.coralDark,
    },
    title: {
        fontFamily: Typography.fontFamily.heading,
        fontSize: 22,
        color: Colors.deepPlum,
        marginBottom: Spacing.sm,
    },
    message: {
        fontFamily: Typography.fontFamily.body,
        fontSize: 14,
        lineHeight: 20,
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
    },
    diagnosticCard: {
        backgroundColor: Colors.cream,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        marginBottom: Spacing.xl,
    },
    diagnosticRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    diagnosticLabel: {
        fontFamily: Typography.fontFamily.bodyMedium,
        fontSize: 12,
        color: Colors.textMuted,
    },
    diagnosticValue: {
        fontFamily: Typography.fontFamily.heading,
        fontSize: 13,
        color: Colors.deepPlum,
        letterSpacing: 0.5,
    },
    diagnosticMeta: {
        fontFamily: Typography.fontFamily.body,
        fontSize: 12,
        color: Colors.textSecondary,
    },
    copyBtn: {
        marginTop: Spacing.sm,
        paddingVertical: Spacing.xs,
        alignItems: 'center',
    },
    copyBtnText: {
        fontFamily: Typography.fontFamily.bodyMedium,
        fontSize: 12,
        color: Colors.coralDark,
    },
    actionButtons: {
        width: '100%',
    },
});
