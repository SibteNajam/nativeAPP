/**
 * API Health Checker
 * Tests connectivity to your backend and displays detailed status
 * Use this component during development to debug connection issues
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { api } from '@/services/api/client';
import { config } from '@/constants/config';

interface HealthStatus {
    status: 'checking' | 'success' | 'error';
    message: string;
    details?: any;
    timestamp?: string;
}

export const APIHealthChecker = () => {
    const [health, setHealth] = useState<HealthStatus>({
        status: 'checking',
        message: 'Not checked yet'
    });

    const checkHealth = async () => {
        setHealth({ status: 'checking', message: 'Checking backend...' });
        
        const startTime = Date.now();
        
        try {
            console.log('🏥 Health Check: Starting...');
            console.log('🏥 Backend URL:', config.API_URL);
            
            const response = await api.get('/health', { timeout: 10000 });
            const duration = Date.now() - startTime;
            
            console.log('🏥 Health Check: Success!', response.data);
            
            setHealth({
                status: 'success',
                message: `Backend is healthy! (${duration}ms)`,
                details: {
                    url: config.API_URL,
                    status: response.status,
                    data: response.data,
                    duration: `${duration}ms`
                },
                timestamp: new Date().toLocaleTimeString()
            });
        } catch (error: any) {
            const duration = Date.now() - startTime;
            
            console.error('🏥 Health Check: Failed!', {
                message: error.message,
                code: error.code,
                response: error.response?.data,
                status: error.response?.status
            });
            
            let errorMessage = 'Backend unreachable';
            const details: any = {
                url: config.API_URL,
                duration: `${duration}ms`,
                timestamp: new Date().toLocaleTimeString()
            };
            
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                errorMessage = '⏱️ Request timeout - Backend too slow or unreachable';
                details.reason = 'Timeout after 10 seconds';
            } else if (error.code === 'ENOTFOUND' || error.message.includes('Network Error')) {
                errorMessage = '🌐 Network Error - Cannot reach backend';
                details.reason = 'DNS resolution failed or no internet';
                details.possibleCauses = [
                    'Backend server is down',
                    'Wrong IP address in .env',
                    'Firewall blocking port 3000',
                    'No internet connection'
                ];
            } else if (error.response?.status === 404) {
                errorMessage = '❌ 404 Not Found - /health endpoint missing';
                details.reason = 'Backend running but health endpoint not found';
            } else if (error.response?.status >= 500) {
                errorMessage = `⚠️ ${error.response.status} Server Error`;
                details.reason = 'Backend crashed or misconfigured';
            } else {
                errorMessage = `❌ ${error.message}`;
                details.error = error.code;
            }
            
            setHealth({
                status: 'error',
                message: errorMessage,
                details,
                timestamp: new Date().toLocaleTimeString()
            });
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    const getStatusColor = () => {
        switch (health.status) {
            case 'success': return '#4CAF50';
            case 'error': return '#F44336';
            default: return '#FF9800';
        }
    };

    const getStatusIcon = () => {
        switch (health.status) {
            case 'success': return '✅';
            case 'error': return '❌';
            default: return '🔄';
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.headerText}>
                    {getStatusIcon()} API Health Check
                </Text>
            </View>
            
            <View style={styles.content}>
                <Text style={styles.message}>{health.message}</Text>
                
                {health.timestamp && (
                    <Text style={styles.timestamp}>
                        Last checked: {health.timestamp}
                    </Text>
                )}
                
                {health.details && (
                    <ScrollView style={styles.detailsContainer}>
                        <Text style={styles.detailsTitle}>Details:</Text>
                        <Text style={styles.detailsText}>
                            {JSON.stringify(health.details, null, 2)}
                        </Text>
                    </ScrollView>
                )}
                
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={checkHealth}
                    disabled={health.status === 'checking'}
                >
                    <Text style={styles.buttonText}>
                        {health.status === 'checking' ? 'Checking...' : 'Check Again'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        margin: 16,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        padding: 12,
    },
    headerText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    content: {
        padding: 16,
    },
    message: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8,
    },
    timestamp: {
        fontSize: 12,
        color: '#666',
        marginBottom: 12,
    },
    detailsContainer: {
        backgroundColor: '#F5F5F5',
        borderRadius: 4,
        padding: 12,
        marginVertical: 12,
        maxHeight: 200,
    },
    detailsTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    detailsText: {
        fontSize: 11,
        color: '#666',
        fontFamily: 'monospace',
    },
    button: {
        backgroundColor: '#2196F3',
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
