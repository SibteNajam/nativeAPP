/**
 * Network Status Indicator
 * Shows real-time network connectivity and API status
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export const NetworkStatusIndicator = () => {
    const [isConnected, setIsConnected] = useState(true);
    const [networkType, setNetworkType] = useState('unknown');

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected ?? false);
            setNetworkType(state.type);
            
            // Log network changes
            console.log('📶 Network Status:', {
                connected: state.isConnected,
                type: state.type,
                details: state.details
            });
        });

        return () => unsubscribe();
    }, []);

    if (isConnected) return null; // Only show when disconnected

    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                ⚠️ No Internet Connection ({networkType})
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FF6B6B',
        padding: 8,
        alignItems: 'center',
    },
    text: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
});
