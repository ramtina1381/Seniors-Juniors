#!/usr/bin/env node

/**
 * Demonstration script showing how environment variable selection works
 * This shows exactly how the application chooses which variables to use
 */

// Simulate different NODE_ENV values
const environments = ['development', 'staging', 'production'];

console.log('🔧 Environment Variable Selection Demo\n');

environments.forEach(env => {
    console.log(`📋 Environment: ${env.toUpperCase()}`);
    console.log('=' * 50);
    
    // Simulate the getEnvVar function logic
    const getEnvVar = (key, defaultValue = null) => {
        const envPrefix = env.toUpperCase();
        const envKey = `${envPrefix}_${key}`;
        
        // Try environment-specific variable first
        if (process.env[envKey]) {
            return process.env[envKey];
        }
        
        // Fall back to generic variable
        if (process.env[key]) {
            return process.env[key];
        }
        
        // Return default value
        return defaultValue;
    };
    
    // Show which variables would be used
    const variables = [
        'PORT',
        'CORS_ORIGIN', 
        'UPLOADS_DIR',
        'OUTPUT_DIR',
        'OPENAI_API_KEY'
    ];
    
    variables.forEach(varName => {
        const envSpecificKey = `${env.toUpperCase()}_${varName}`;
        const genericKey = varName;
        
        console.log(`  ${varName}:`);
        console.log(`    Tries: ${envSpecificKey} (${process.env[envSpecificKey] ? '✅ Found' : '❌ Not found'})`);
        console.log(`    Falls back to: ${genericKey} (${process.env[genericKey] ? '✅ Found' : '❌ Not found'})`);
        console.log(`    Final value: ${getEnvVar(varName, 'default')}`);
        console.log('');
    });
    
    console.log('─' * 50);
    console.log('');
});

console.log('🎯 How to Use This System:\n');

console.log('1. Set up your .env file with environment-specific variables:');
console.log('   DEV_PORT=5002');
console.log('   DEV_UPLOADS_DIR=uploads');
console.log('   PROD_PORT=5002');
console.log('   PROD_UPLOADS_DIR=/var/app/uploads\n');

console.log('2. Set NODE_ENV to choose which environment to use:');
console.log('   NODE_ENV=development  # Uses DEV_* variables');
console.log('   NODE_ENV=production   # Uses PROD_* variables\n');

console.log('3. The application automatically selects the right variables:');
console.log('   - When NODE_ENV=development: Uses DEV_PORT, DEV_UPLOADS_DIR, etc.');
console.log('   - When NODE_ENV=production: Uses PROD_PORT, PROD_UPLOADS_DIR, etc.\n');

console.log('4. Fallback system:');
console.log('   - If DEV_PORT is not found, tries PORT');
console.log('   - If PORT is not found, uses default value\n');

console.log('✅ This allows you to have all environments in one .env file!');
