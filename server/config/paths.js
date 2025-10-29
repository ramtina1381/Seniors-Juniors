const path = require('path');
const fs = require('fs');

/**
 * Dynamic path configuration for deployment environments
 * Supports both local development and production deployments
 */
class PathConfig {
    constructor() {
        this.setupPaths();
    }

    setupPaths() {
        // Get the root directory (where package.json is located)
        this.rootDir = this.findRootDirectory();
        
        // Environment-based configuration
        this.environment = process.env.NODE_ENV || 'development';
        
        // Get environment-specific variables with fallbacks
        this.baseUploadsDir = this.getEnvVar('UPLOADS_DIR', path.join(this.rootDir, 'uploads'));
        this.baseOutputDir = this.getEnvVar('OUTPUT_DIR', path.join(this.rootDir, 'output'));
        this.baseTempDir = this.getEnvVar('TEMP_DIR', path.join(this.rootDir, 'temp'));
        
        // Ensure directories exist
        this.ensureDirectories();
        
        console.log('Path Configuration:');
        console.log(`  Environment: ${this.environment}`);
        console.log(`  Root Directory: ${this.rootDir}`);
        console.log(`  Uploads Directory: ${this.baseUploadsDir}`);
        console.log(`  Output Directory: ${this.baseOutputDir}`);
        console.log(`  Temp Directory: ${this.baseTempDir}`);
    }

    /**
     * Get environment-specific variable with fallback
     * @param {string} key - The base key name (e.g., 'UPLOADS_DIR', 'OUTPUT_DIR')
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

    findRootDirectory() {
        // Start from current file and work upwards to find package.json
        let currentDir = __dirname;
        while (currentDir !== path.dirname(currentDir)) {
            if (fs.existsSync(path.join(currentDir, 'package.json'))) {
                return currentDir;
            }
            currentDir = path.dirname(currentDir);
        }
        
        // Fallback to project root (two levels up from server/config)
        return path.join(__dirname, '../..');
    }

    ensureDirectories() {
        const dirs = [
            this.baseUploadsDir,
            this.baseOutputDir,
            this.baseTempDir,
            path.join(this.baseUploadsDir, 'photos'),
            path.join(this.baseUploadsDir, 'manufacturer'),
            path.join(this.baseUploadsDir, 'jha')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`Created directory: ${dir}`);
            }
        });
    }

    // Upload paths
    getUploadsDir() {
        return this.baseUploadsDir;
    }

    getPhotosDir(location) {
        return path.join(this.baseUploadsDir, 'photos', location);
    }

    getManufacturerDir(location) {
        return path.join(this.baseUploadsDir, 'manufacturer', location);
    }

    getJhaDir(location) {
        return path.join(this.baseUploadsDir, 'jha', location);
    }

    getJhaPdfsDir(location) {
        return path.join(this.baseUploadsDir, 'jha', location, 'pdfs');
    }

    getJhaExcelDir(location) {
        return path.join(this.baseUploadsDir, 'jha', location, 'excel');
    }

    // Output paths
    getOutputDir() {
        return this.baseOutputDir;
    }

    getOutputFile(location, filename) {
        return path.join(this.baseOutputDir, filename || `equipment_inventory_${location}.csv`);
    }

    getJhaOutputDir(location) {
        return path.join(this.baseOutputDir, 'jha', location);
    }

    getJhaOutputFile(location, filename) {
        return path.join(this.baseOutputDir, 'jha', location, filename || 'jha_processed.xlsb');
    }

    // Python script paths
    getPythonScriptsDir() {
        // Root directory for this config resolves to the server folder
        // so the python scripts live under '<server>/python'
        return path.join(this.rootDir, 'python');
    }

    getEquipmentProcessorScript() {
        return path.join(this.getPythonScriptsDir(), 'process_equipment.py');
    }

    getJhaProcessorScript() {
        return path.join(this.getPythonScriptsDir(), 'process_jha.py');
    }

    // Utility methods
    ensureLocationDirs(location) {
        const dirs = [
            this.getPhotosDir(location),
            this.getManufacturerDir(location),
            this.getJhaDir(location),
            this.getJhaPdfsDir(location),
            this.getJhaExcelDir(location),
            this.getJhaOutputDir(location)
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    getRelativePath(fullPath) {
        return path.relative(this.rootDir, fullPath);
    }

    // Environment-specific configurations
    isProduction() {
        return this.environment === 'production';
    }

    isDevelopment() {
        return this.environment === 'development';
    }

    // Logging configuration
    getLogsDir() {
        return process.env.LOGS_DIR || path.join(this.rootDir, 'logs');
    }

    getErrorLogFile() {
        return path.join(this.getLogsDir(), 'server_errors.log');
    }

    getEquipmentLogFile() {
        return path.join(this.getLogsDir(), 'equipment_processor.log');
    }
}

// Export singleton instance
module.exports = new PathConfig();
