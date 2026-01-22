#!/usr/bin/env node
/**
 * Test Backend Connectivity
 * ==========================
 * Quick script to test if your backend is accessible
 * 
 * Usage:
 *   node test-backend.js
 *   npm run test:backend
 */

const http = require('http');
const https = require('https');

// Load environment variables
require('dotenv').config();

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://146.59.93.94:3000';

console.log('🧪 Testing Backend Connectivity\n');
console.log('═'.repeat(60));
console.log(`📡 Target: ${API_URL}`);
console.log('═'.repeat(60));

// Parse URL
const url = new URL(API_URL);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

// Test 1: Basic connectivity
function testConnectivity() {
    return new Promise((resolve, reject) => {
        console.log('\n1️⃣ Testing basic connectivity...');
        const startTime = Date.now();

        const req = client.get(`${API_URL}/health`, (res) => {
            const duration = Date.now() - startTime;
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`   ✅ Connected! (${duration}ms)`);
                console.log(`   📥 Status: ${res.statusCode}`);
                console.log(`   📦 Response:`, data.substring(0, 200));
                resolve({ success: true, status: res.statusCode, data, duration });
            });
        });

        req.on('error', (error) => {
            const duration = Date.now() - startTime;
            console.log(`   ❌ Failed! (${duration}ms)`);
            console.log(`   🔴 Error: ${error.message}`);
            
            if (error.code === 'ENOTFOUND') {
                console.log(`   💡 DNS lookup failed. Check if ${url.hostname} is correct.`);
            } else if (error.code === 'ECONNREFUSED') {
                console.log(`   💡 Connection refused. Backend might not be running on port ${url.port}.`);
            } else if (error.code === 'ETIMEDOUT') {
                console.log(`   💡 Connection timeout. Firewall might be blocking port ${url.port}.`);
            }
            
            resolve({ success: false, error: error.message, code: error.code, duration });
        });

        req.setTimeout(10000, () => {
            req.destroy();
            console.log(`   ⏱️ Request timeout after 10 seconds`);
            resolve({ success: false, error: 'Timeout', duration: 10000 });
        });
    });
}

// Test 2: Login endpoint
function testLogin() {
    return new Promise((resolve, reject) => {
        console.log('\n2️⃣ Testing login endpoint...');
        const startTime = Date.now();

        const postData = JSON.stringify({
            email: 'test@example.com',
            password: 'test123'
        });

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: '/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = client.request(options, (res) => {
            const duration = Date.now() - startTime;
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`   ✅ Endpoint reachable! (${duration}ms)`);
                console.log(`   📥 Status: ${res.statusCode}`);
                
                if (res.statusCode === 401) {
                    console.log(`   💡 401 Unauthorized - Expected (test credentials invalid)`);
                } else if (res.statusCode === 200) {
                    console.log(`   ⚠️ 200 OK - Unexpected (test credentials worked?)`);
                }
                
                console.log(`   📦 Response:`, data.substring(0, 200));
                resolve({ success: true, status: res.statusCode, data, duration });
            });
        });

        req.on('error', (error) => {
            const duration = Date.now() - startTime;
            console.log(`   ❌ Failed! (${duration}ms)`);
            console.log(`   🔴 Error: ${error.message}`);
            resolve({ success: false, error: error.message, duration });
        });

        req.setTimeout(10000, () => {
            req.destroy();
            console.log(`   ⏱️ Request timeout after 10 seconds`);
            resolve({ success: false, error: 'Timeout', duration: 10000 });
        });

        req.write(postData);
        req.end();
    });
}

// Test 3: CORS check (if applicable)
function testCORS() {
    return new Promise((resolve) => {
        console.log('\n3️⃣ Testing CORS configuration...');
        
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: '/health',
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:8081',
                'Access-Control-Request-Method': 'POST'
            }
        };

        const req = client.request(options, (res) => {
            const corsHeader = res.headers['access-control-allow-origin'];
            
            if (corsHeader) {
                console.log(`   ✅ CORS enabled`);
                console.log(`   🌐 Allow-Origin: ${corsHeader}`);
            } else {
                console.log(`   ⚠️ CORS headers not found (might not be needed for mobile)`);
            }
            
            resolve({ success: true, cors: corsHeader });
        });

        req.on('error', () => {
            console.log(`   ℹ️ CORS check skipped (not critical for mobile apps)`);
            resolve({ success: false });
        });

        req.setTimeout(5000, () => {
            req.destroy();
            resolve({ success: false });
        });

        req.end();
    });
}

// Run all tests
async function runTests() {
    const results = {
        connectivity: await testConnectivity(),
        login: await testLogin(),
        cors: await testCORS(),
    };

    console.log('\n' + '═'.repeat(60));
    console.log('📊 Test Summary');
    console.log('═'.repeat(60));

    const allSuccess = results.connectivity.success && results.login.success;

    if (allSuccess) {
        console.log('✅ All tests passed! Backend is accessible.');
        console.log('\n💡 If your app still can\'t connect:');
        console.log('   1. Check if .env file is loaded correctly');
        console.log('   2. Rebuild the app (env vars are baked in at build time)');
        console.log('   3. Check Android cleartext traffic config');
        console.log('   4. Look at Metro terminal logs during app usage');
    } else {
        console.log('❌ Some tests failed. Backend might not be accessible.');
        console.log('\n🔧 Troubleshooting:');
        
        if (!results.connectivity.success) {
            console.log('   • Backend server might be down');
            console.log('   • Firewall blocking port', url.port);
            console.log('   • Wrong IP address in .env');
        }
        
        console.log('\n🔍 Verify:');
        console.log(`   1. Backend running: ssh to server and check "netstat -tlnp | grep ${url.port}"`);
        console.log(`   2. Firewall open: "sudo ufw status" or "iptables -L"`);
        console.log(`   3. Public IP: "curl ifconfig.me" on your server`);
        console.log(`   4. Try from browser: ${API_URL}/health`);
    }

    console.log('\n' + '═'.repeat(60));
}

// Run
runTests().catch(console.error);
