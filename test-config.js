#!/usr/bin/env node

/**
 * Test script to verify deployment configuration
 * Run with: node test-config.js
 */

const path = require('path');
const fs = require('fs');

// Import our configuration
const pathConfig = require('./server/config/paths');
const envConfig = require('./server/config/environment');

console.log('🔧 Testing Deployment Configuration\n');

// Test 1: Environment Configuration
console.log('1. Environment Configuration:');
console.log(`   Environment: ${envConfig.getEnvironment()}`);
console.log(`   Port: ${envConfig.get('port')}`);
console.log(`   CORS Origin: ${envConfig.get('cors').origin}`);
console.log(`   File Upload Limits: ${envConfig.get('fileUpload').limits.fileSize / (1024*1024)}MB`);
console.log(`   Python Timeout: ${envConfig.get('python').timeout / 1000}s\n`);

// Test 2: Path Configuration
console.log('2. Path Configuration:');
console.log(`   Root Directory: ${pathConfig.rootDir}`);
console.log(`   Uploads Directory: ${pathConfig.getUploadsDir()}`);
console.log(`   Output Directory: ${pathConfig.getOutputDir()}`);
console.log(`   Temp Directory: ${pathConfig.baseTempDir}`);
console.log(`   Logs Directory: ${pathConfig.getLogsDir()}\n`);

// Test 3: Directory Structure
console.log('3. Directory Structure Test:');
const testLocation = 'test123';

try {
    // Test directory creation
    pathConfig.ensureLocationDirs(testLocation);
    
    const dirs = [
        pathConfig.getPhotosDir(testLocation),
        pathConfig.getManufacturerDir(testLocation),
        pathConfig.getJhaDir(testLocation),
        pathConfig.getJhaPdfsDir(testLocation),
        pathConfig.getJhaExcelDir(testLocation),
        pathConfig.getJhaOutputDir(testLocation)
    ];
    
    dirs.forEach(dir => {
        const exists = fs.existsSync(dir);
        console.log(`   ${pathConfig.getRelativePath(dir)}: ${exists ? '✅' : '❌'}`);
    });
    
    // Cleanup test directory
    fs.rmSync(pathConfig.getPhotosDir(testLocation), { recursive: true, force: true });
    fs.rmSync(pathConfig.getManufacturerDir(testLocation), { recursive: true, force: true });
    fs.rmSync(pathConfig.getJhaDir(testLocation), { recursive: true, force: true });
    fs.rmSync(pathConfig.getJhaOutputDir(testLocation), { recursive: true, force: true });
    
    console.log('\n   Test directories cleaned up ✅\n');
    
} catch (error) {
    console.log(`   ❌ Directory test failed: ${error.message}\n`);
}

// Test 4: Python Script Paths
console.log('4. Python Script Paths:');
const pythonScripts = [
    pathConfig.getEquipmentProcessorScript(),
    pathConfig.getJhaProcessorScript()
];

pythonScripts.forEach(script => {
    const exists = fs.existsSync(script);
    console.log(`   ${path.basename(script)}: ${exists ? '✅' : '❌'}`);
});

// Test 5: Environment Variables
console.log('\n5. Environment Variables:');
const envVars = [
    'NODE_ENV',
    'PORT',
    'UPLOADS_DIR',
    'OUTPUT_DIR',
    'TEMP_DIR',
    'LOGS_DIR',
    'CORS_ORIGIN',
    'OPENAI_API_KEY',
    'MONDAY_API_KEY',
    'MONDAY_BOARD_ID'
];

envVars.forEach(varName => {
    const value = process.env[varName];
    const displayValue = value ? (varName.includes('KEY') ? '***hidden***' : value) : 'not set';
    console.log(`   ${varName}: ${displayValue}`);
});

console.log('\n🎉 Configuration test completed!');
console.log('\n📋 Deployment Checklist:');
console.log('   □ Set NODE_ENV for your environment');
console.log('   □ Configure directory paths via environment variables');
console.log('   □ Set up API keys (OPENAI_API_KEY, etc.)');
console.log('   □ Configure CORS_ORIGIN for production');
console.log('   □ Ensure Python dependencies are installed');
console.log('   □ Test file upload and processing functionality');

console.log('\n📖 See DEPLOYMENT.md for detailed deployment instructions.');
