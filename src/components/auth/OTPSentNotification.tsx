/**
 * OTP Sent Notification Modal
 * Beautiful custom notification for OTP email sent
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTheme } from '@/contexts/ThemeContext';

interface OTPSentNotificationProps {
    visible: boolean;
    onVerifyNow: () => void;
    email: string;
}

export default function OTPSentNotification({ visible, onVerifyNow, email }: OTPSentNotificationProps) {
    const { colors } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
                <MotiView
                    from={{ opacity: 0, scale: 0.9, translateY: 20 }}
                    animate={{ opacity: 1, scale: 1, translateY: 0 }}
                    transition={{ 
                        type: 'spring', 
                        damping: 18,
                        stiffness: 200,
                    }}
                    style={styles.container}
                >
                    <Surface
                        style={[styles.card, { backgroundColor: colors.surface }]}
                        elevation={5}
                    >
                        {/* Animated Email Icon */}
                        <MotiView
                            from={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                                type: 'spring',
                                damping: 15,
                                stiffness: 150,
                                delay: 100,
                            }}
                            style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}
                        >
                            <MotiView
                                from={{ translateY: 5 }}
                                animate={{ translateY: 0 }}
                                transition={{
                                    type: 'spring',
                                    damping: 12,
                                    delay: 300,
                                }}
                            >
                                <MaterialCommunityIcons
                                    name="email-fast"
                                    size={56}
                                    color={colors.primary}
                                />
                            </MotiView>
                            
                            {/* Success checkmark badge */}
                            <MotiView
                                from={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                    type: 'spring',
                                    damping: 15,
                                    delay: 500,
                                }}
                                style={[styles.checkBadge, { backgroundColor: colors.success }]}
                            >
                                <MaterialCommunityIcons
                                    name="check"
                                    size={16}
                                    color="#fff"
                                />
                            </MotiView>
                        </MotiView>

                        {/* Text Content */}
                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 400 }}
                        >
                            <Text style={[styles.title, { color: colors.text }]}>
                                Check Your Email! 📧
                            </Text>
                            <Text style={[styles.message, { color: colors.textSecondary }]}>
                                We've sent a 6-digit verification code to
                            </Text>
                            <Text style={[styles.email, { color: colors.primary }]}>
                                {email}
                            </Text>
                        </MotiView>

                        {/* Info Card */}
                        <MotiView
                            from={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 600 }}
                            style={[styles.infoCard, { backgroundColor: `${colors.primary}08` }]}
                        >
                            <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
                            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                Code expires in <Text style={{ color: colors.warning, fontWeight: '700' }}>10 minutes</Text>
                            </Text>
                        </MotiView>

                        {/* Action Buttons */}
                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 800 }}
                            style={styles.buttonContainer}
                        >
                            <Pressable
                                onPress={onVerifyNow}
                                style={({ pressed }) => [
                                    styles.button,
                                    {
                                        backgroundColor: colors.primary,
                                        opacity: pressed ? 0.85 : 1,
                                    },
                                ]}
                            >
                                <MaterialCommunityIcons name="shield-check" size={22} color="#fff" />
                                <Text style={styles.buttonText}>Verify Now</Text>
                                <MaterialCommunityIcons name="arrow-right" size={22} color="#fff" />
                            </Pressable>
                        </MotiView>

                        {/* Tip */}
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1000 }}
                            style={styles.tipContainer}
                        >
                            <Text style={[styles.tipText, { color: colors.textLight }]}>
                                💡 Check your spam folder if you don't see it
                            </Text>
                        </MotiView>
                    </Surface>
                </MotiView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 420,
    },
    card: {
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
    },
    iconContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 22,
    },
    email: {
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 20,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 14,
        marginBottom: 24,
        width: '100%',
    },
    infoText: {
        fontSize: 13,
        flex: 1,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
    },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    tipContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(128, 128, 128, 0.1)',
    },
    tipText: {
        fontSize: 12,
        textAlign: 'center',
    },
});
