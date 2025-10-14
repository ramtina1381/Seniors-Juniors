/**
 * Environment configuration for deployment
 * Handles different environments (development, staging, production)
 * Supports environment-specific variables in the same .env file
 */
const path = require('path');

class EnvironmentConfig {
    constructor() {
        this.environment = process.env.NODE_ENV || 'development';
        this.setupEnvironment();
    }

    /**
     * Get environment-specific variable with fallback
     * @param {string} key - The base key name (e.g., 'PORT', 'CORS_ORIGIN')
     * @param {string} defaultValue - Default value if not found
     * @returns {string} - The environment-specific value
     */
    getEnvVar(key, defaultValue = null) {
        const envPrefix = this.environment.toUpperCase();
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
    }

    setupEnvironment() {
        // Load environment-specific settings
        switch (this.environment) {
            case 'production':
                this.setupProduction();
                break;
            case 'staging':
                this.setupStaging();
                break;
            case 'development':
            default:
                this.setupDevelopment();
                break;
        }
    }

    setupDevelopment() {
        this.config = {
            port: parseInt(this.getEnvVar('PORT', '5002')),
            cors: {
                origin: this.getEnvVar('CORS_ORIGIN', '*'), // Allow all origins in development
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                credentials: true
            },
            fileUpload: {
                limits: {
                    fileSize: parseInt(this.getEnvVar('MAX_FILE_SIZE', '52428800')), // 50MB
                    files: parseInt(this.getEnvVar('MAX_FILES', '10'))
                },
                useTempFiles: false,
                tempFileDir: undefined
            },
            python: {
                timeout: parseInt(this.getEnvVar('PYTHON_TIMEOUT', '300000')), // 5 minutes
                maxBuffer: parseInt(this.getEnvVar('PYTHON_MAX_BUFFER', '10485760')) // 10MB
            },
            logging: {
                level: this.getEnvVar('LOG_LEVEL', 'debug'),
                console: true,
                file: true
            },
            apiKeys: {
                openai: this.getEnvVar('OPENAI_API_KEY'),
                monday: this.getEnvVar('MONDAY_API_KEY'),
                mondayBoardId: this.getEnvVar('MONDAY_BOARD_ID')
            }
        };
    }

    setupStaging() {
        this.config = {
            port: parseInt(this.getEnvVar('PORT', '5002')),
            cors: {
                origin: this.getEnvVar('CORS_ORIGIN', '*'),
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                credentials: true
            },
            fileUpload: {
                limits: {
                    fileSize: parseInt(this.getEnvVar('MAX_FILE_SIZE', '52428800')), // 50MB
                    files: parseInt(this.getEnvVar('MAX_FILES', '10'))
                },
                useTempFiles: true,
                tempFileDir: this.getEnvVar('TEMP_DIR', '/tmp')
            },
            python: {
                timeout: parseInt(this.getEnvVar('PYTHON_TIMEOUT', '300000')), // 5 minutes
                maxBuffer: parseInt(this.getEnvVar('PYTHON_MAX_BUFFER', '10485760')) // 10MB
            },
            logging: {
                level: this.getEnvVar('LOG_LEVEL', 'info'),
                console: true,
                file: true
            },
            apiKeys: {
                openai: this.getEnvVar('OPENAI_API_KEY'),
                monday: this.getEnvVar('MONDAY_API_KEY'),
                mondayBoardId: this.getEnvVar('MONDAY_BOARD_ID')
            }
        };
    }

    setupProduction() {
        this.config = {
            port: parseInt(this.getEnvVar('PORT', '5002')),
            cors: {
                origin: this.getEnvVar('CORS_ORIGIN', 'https://yourdomain.com'),
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                credentials: true
            },
            fileUpload: {
                limits: {
                    fileSize: parseInt(this.getEnvVar('MAX_FILE_SIZE', '52428800')), // 50MB
                    files: parseInt(this.getEnvVar('MAX_FILES', '10'))
                },
                useTempFiles: true,
                tempFileDir: this.getEnvVar('TEMP_DIR', '/tmp')
            },
            python: {
                timeout: parseInt(this.getEnvVar('PYTHON_TIMEOUT', '300000')), // 5 minutes
                maxBuffer: parseInt(this.getEnvVar('PYTHON_MAX_BUFFER', '10485760')) // 10MB
            },
            logging: {
                level: this.getEnvVar('LOG_LEVEL', 'warn'),
                console: false,
                file: true
            },
            apiKeys: {
                openai: this.getEnvVar('OPENAI_API_KEY'),
                monday: this.getEnvVar('MONDAY_API_KEY'),
                mondayBoardId: this.getEnvVar('MONDAY_BOARD_ID')
            }
        };
    }

    get(key) {
        return this.config[key];
    }

    getAll() {
        return this.config;
    }

    isProduction() {
        return this.environment === 'production';
    }

    isStaging() {
        return this.environment === 'staging';
    }

    isDevelopment() {
        return this.environment === 'development';
    }

    getEnvironment() {
        return this.environment;
    }
}

module.exports = new EnvironmentConfig();
