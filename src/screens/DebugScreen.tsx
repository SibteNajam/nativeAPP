/**
 * Debug Screen
 * ============
 * Development-only screen for debugging API connectivity
 * Shows:
 * - API configuration
 * - Network status
 * - Health check
 * - Test requests
 * 
 * Usage:
 * 1. Add to your navigation during development
 * 2. Or add a secret button (press logo 5 times) to open it
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import { config } from '@/constants/config';
import { api } from '@/services/api/client';
import { APIHealthChecker } from '@/components/APIHealthChecker';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';

export const DebugScreen = () => {
    const [testResults, setTestResults] = useState<any[]>([]);

    const runTest = async (name: string, testFn: () => Promise<any>) => {
        const startTime = Date.now();
        console.log(`\n🧪 Running test: ${name}`);
        
        try {
            const result = await testFn();
            const duration = Date.now() - startTime;
            
            const testResult = {
                name,
                status: 'success',
                duration: `${duration}ms`,
                result,
                timestamp: new Date().toLocaleTimeString(),
            };
            
            console.log(`✅ Test passed: ${name}`, testResult);
            setTestResults(prev => [testResult, ...prev]);
            
            Alert.alert('✅ Success', `${name}\n\nDuration: ${duration}ms`);
        } catch (error: any) {
            const duration = Date.now() - startTime;
            
            const testResult = {
                name,
                status: 'error',
                duration: `${duration}ms`,
                error: {
                    message: error.message,
                    code: error.code,
                    status: error.response?.status,
                    data: error.response?.data,
                },
                timestamp: new Date().toLocaleTimeString(),
            };
            
            console.error(`❌ Test failed: ${name}`, testResult);
            setTestResults(prev => [testResult, ...prev]);
            
            Alert.alert(
                '❌ Error',
                `${name}\n\n${error.message}\n\nStatus: ${error.response?.status || 'N/A'}`
            );
        }
    };

    const tests = [
        {
            name: 'Health Check',
            description: 'Test /health endpoint',
            run: () => runTest('Health Check', () => api.get('/health')),
        },
        {
            name: 'Test Login',
            description: 'Try login with test credentials',
            run: () => runTest('Test Login', () => 
                api.post('/auth/login', {
                    email: 'test@example.com',
                    password: 'test123'
                })
            ),
        },
        {
            name: 'Test Register',
            description: 'Try register endpoint',
            run: () => runTest('Test Register', () =>
                api.post('/auth/register', {
                    email: 'test@example.com',
                    password: 'test123',
                    firstName: 'Test',
                    lastName: 'User'
                })
            ),
        },
        {
            name: 'DNS Check',
            description: 'Check if backend URL is reachable',
            run: async () => {
                console.log('🌐 DNS Check: Testing connectivity...');
                const url = config.API_URL.replace('/api', '');
                
                try {
                    const response = await fetch(url, { method: 'GET' });
                    Alert.alert(
                        '✅ Backend Reachable',
                        `Status: ${response.status}\nURL: ${url}`
                    );
                } catch (error: any) {
                    Alert.alert(
                        '❌ Backend Unreachable',
                        `Cannot connect to:\n${url}\n\nError: ${error.message}`
                    );
                }
            },
        },
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🔧 Debug Screen</Text>
                <Text style={styles.subtitle}>
                    Development Only - Not in Production
                </Text>
            </View>

            <NetworkStatusIndicator />

            {/* API Configuration */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📡 API Configuration</Text>
                <View style={styles.infoCard}>
                    <InfoRow label="API URL" value={config.API_URL} />
                    <InfoRow label="Timeout" value={`${config.API_TIMEOUT}ms`} />
                    <InfoRow label="Platform" value={Platform.OS} />
                    <InfoRow 
                        label="Environment" 
                        value={__DEV__ ? 'Development' : 'Production'} 
                    />
                </View>
            </View>

            {/* Health Check */}
            <APIHealthChecker />

            {/* Test Buttons */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🧪 API Tests</Text>
                {tests.map((test, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.testButton}
                        onPress={test.run}
                    >
                        <Text style={styles.testButtonTitle}>{test.name}</Text>
                        <Text style={styles.testButtonDescription}>
                            {test.description}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Test Results */}
            {testResults.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.resultsHeader}>
                        <Text style={styles.sectionTitle}>📊 Test Results</Text>
                        <TouchableOpacity onPress={() => setTestResults([])}>
                            <Text style={styles.clearButton}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {testResults.map((result, index) => (
                        <View
                            key={index}
                            style={[
                                styles.resultCard,
                                { borderLeftColor: result.status === 'success' ? '#4CAF50' : '#F44336' }
                            ]}
                        >
                            <View style={styles.resultHeader}>
                                <Text style={styles.resultName}>
                                    {result.status === 'success' ? '✅' : '❌'} {result.name}
                                </Text>
                                <Text style={styles.resultDuration}>
                                    {result.duration}
                                </Text>
                            </View>
                            <Text style={styles.resultTimestamp}>
                                {result.timestamp}
                            </Text>
                            <ScrollView
                                style={styles.resultDetails}
                                horizontal
                            >
                                <Text style={styles.resultDetailsText}>
                                    {JSON.stringify(
                                        result.result || result.error,
                                        null,
                                        2
                                    )}
                                </Text>
                            </ScrollView>
                        </View>
                    ))}
                </View>
            )}

            {/* Instructions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📝 How to Use</Text>
                <Text style={styles.instructionsText}>
                    1. Check API Configuration - Verify the URL is correct{'\n'}
                    2. Run Health Check - Test backend connectivity{'\n'}
                    3. Check Metro Terminal - All requests are logged there{'\n'}
                    4. Run API Tests - Test specific endpoints{'\n'}
                    5. View Results - See detailed response/error info
                </Text>
            </View>
        </ScrollView>
    );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        backgroundColor: '#2196F3',
        padding: 20,
        paddingTop: 60,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#FFF',
        opacity: 0.9,
    },
    section: {
        margin: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    infoCard: {
        backgroundColor: '#FFF',
        borderRadius: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        width: 100,
    },
    infoValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    testButton: {
        backgroundColor: '#FFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    testButtonTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2196F3',
        marginBottom: 4,
    },
    testButtonDescription: {
        fontSize: 14,
        color: '#666',
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    clearButton: {
        color: '#2196F3',
        fontSize: 14,
        fontWeight: '600',
    },
    resultCard: {
        backgroundColor: '#FFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    resultDuration: {
        fontSize: 14,
        color: '#666',
    },
    resultTimestamp: {
        fontSize: 12,
        color: '#999',
        marginBottom: 8,
    },
    resultDetails: {
        backgroundColor: '#F5F5F5',
        borderRadius: 4,
        padding: 12,
        maxHeight: 150,
    },
    resultDetailsText: {
        fontSize: 11,
        color: '#666',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    instructionsText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 24,
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 8,
    },
});
