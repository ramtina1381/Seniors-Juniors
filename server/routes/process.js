const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');

// Convert exec to promise-based for better error handling
const execPromise = util.promisify(require('child_process').exec);

// Enhanced logging function
const logError = (error, context = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        context
    };
    console.error(JSON.stringify(logEntry, null, 2));
    
    // Write to error log file
    fs.appendFileSync('server_errors.log', JSON.stringify(logEntry) + '\n');
};

router.post('/', async (req, res) => {
    const { locationNumber } = req.body;
    const requestId = Date.now(); // Unique ID for this request
    
    try {
        // Validate input
        if (!locationNumber) {
            const error = new Error('Location number is required');
            error.status = 400;
            throw error;
        }

        console.log(`[${requestId}] Processing request for location: ${locationNumber}`);

        // Path configuration with validation
        const paths = {
            pythonScript: path.join(__dirname, '../python/process_equipment.py'),
            output: path.join(__dirname, '../../output'),
            uploads: path.join(__dirname, '../../uploads'),
            photos: path.join(__dirname, '../../uploads/photos', locationNumber),
            manufacturer: path.join(__dirname, '../../uploads/manufacturer', locationNumber)
        };

        // Verify all paths exist
        for (const [name, path] of Object.entries(paths)) {
            if (!fs.existsSync(path)) {
                const error = new Error(`${name} path does not exist: ${path}`);
                error.status = 400;
                throw error;
            }
        }

        // Check for photos
        const photoFiles = fs.readdirSync(paths.photos).filter(f => 
            ['.jpg', '.jpeg', '.png'].some(ext => f.toLowerCase().endsWith(ext))
        );
        
        if (photoFiles.length === 0) {
            const error = new Error(`No valid photos found for location ${locationNumber}`);
            error.status = 400;
            error.details = {
                path: paths.photos,
                files: fs.readdirSync(paths.photos)
            };
            throw error;
        }

        // Check for manufacturer file
        const manufacturerFiles = fs.readdirSync(paths.manufacturer).filter(f => 
            ['.xlsx', '.xls'].some(ext => f.toLowerCase().endsWith(ext))
        );
        
        if (manufacturerFiles.length === 0) {
            const error = new Error(`No manufacturer file found for location ${locationNumber}`);
            error.status = 400;
            error.details = {
                path: paths.manufacturer,
                files: fs.readdirSync(paths.manufacturer)
            };
            throw error;
        }

        // Ensure output directory exists
        fs.mkdirSync(paths.output, { recursive: true });

        console.log(`[${requestId}] Paths verified successfully`);
        console.log(`[${requestId}] Found ${photoFiles.length} photos and ${manufacturerFiles.length} manufacturer files`);

        // Build command with error handling
        const command = `python "${paths.pythonScript}" --location "${locationNumber}" --output "${paths.output}" --uploads_root "${paths.uploads}"`;
        console.log(`[${requestId}] Executing command: ${command}`);

        // Execute Python script with timeout
        const { stdout, stderr } = await execPromise(command, { 
            timeout: 300000, // 5 minute timeout
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });

        // Log Python script output
        console.log(`[${requestId}] Python script stdout:`, stdout);
        if (stderr) {
            console.error(`[${requestId}] Python script stderr:`, stderr);
        }

        // Check for known error patterns in output
        if (stdout.includes('No image files found') || stdout.includes('No manufacturer file found')) {
            const error = new Error('Python script reported missing files');
            error.status = 400;
            error.details = stdout;
            throw error;
        }

        // Verify result file
        const resultFile = path.join(paths.output, 'equipment_inventory.csv');
        if (!fs.existsSync(resultFile)) {
            const error = new Error('Processing completed but no result file was generated');
            error.status = 500;
            error.details = {
                expectedFile: resultFile,
                stdout,
                stderr
            };
            throw error;
        }

        // Stream the file with proper cleanup
        const downloadName = `equipment_report_${locationNumber}.csv`;
        res.download(resultFile, downloadName, (err) => {
            if (err) {
                logError(err, { requestId, locationNumber });
                if (!res.headersSent) {
                    res.status(500).json({ 
                        error: 'File download failed',
                        requestId
                    });
                }
            }
            
            // Cleanup
            try {
                fs.unlinkSync(resultFile);
            } catch (cleanupError) {
                logError(cleanupError, { requestId, locationNumber });
            }
        });

    } catch (error) {
        logError(error, { 
            requestId, 
            locationNumber,
            timestamp: new Date().toISOString()
        });

        const status = error.status || 500;
        const response = {
            error: error.message,
            requestId,
            details: error.details || undefined
        };

        console.error(`[${requestId}] Error processing request:`, response);
        res.status(status).json(response);
    }
});

module.exports = router;