/**
 * Vercel-specific environment configuration
 * Handles Vercel's serverless environment constraints
 */

const path = require('path');

class VercelEnvironmentConfig {
    constructor() {
        this.environment = 'production'; // Vercel always runs in production
        this.setupVercelPaths();
    }

    setupVercelPaths() {
        // Vercel-specific path configuration
        this.baseUploadsDir = '/tmp/uploads';
        this.baseOutputDir = '/tmp/output';
        this.baseTempDir = '/tmp';
        this.baseLogsDir = '/tmp/logs';
        
        // Ensure directories exist
        this.ensureDirectories();
        
        console.log('Vercel Environment Configuration:');
        console.log(`  Environment: ${this.environment}`);
        console.log(`  Uploads Directory: ${this.baseUploadsDir}`);
        console.log(`  Output Directory: ${this.baseOutputDir}`);
        console.log(`  Temp Directory: ${this.baseTempDir}`);
        console.log(`  Logs Directory: ${this.baseLogsDir}`);
    }

    ensureDirectories() {
        const fs = require('fs');
        const dirs = [
            this.baseUploadsDir,
            this.baseOutputDir,
            this.baseTempDir,
            this.baseLogsDir,
            path.join(this.baseUploadsDir, 'photos'),
            path.join(this.baseUploadsDir, 'manufacturer'),
            path.join(this.baseUploadsDir, 'jha')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
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
        return path.join(__dirname, 'python');
    }

    getEquipmentProcessorScript() {
        return path.join(this.getPythonScriptsDir(), 'process_equipment.py');
    }

    getJhaProcessorScript() {
        return path.join(this.getPythonScriptsDir(), 'process_jha.py');
    }

    // Utility methods
    ensureLocationDirs(location) {
        const fs = require('fs');
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
        return path.relative(process.cwd(), fullPath);
    }

    // Environment-specific configurations
    isProduction() {
        return true; // Vercel always runs in production
    }

    isDevelopment() {
        return false;
    }

    // Logging configuration
    getLogsDir() {
        return this.baseLogsDir;
    }

    getErrorLogFile() {
        return path.join(this.baseLogsDir, 'server_errors.log');
    }

    getEquipmentLogFile() {
        return path.join(this.baseLogsDir, 'equipment_processor.log');
    }
}

module.exports = new VercelEnvironmentConfig();
