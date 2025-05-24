const express = require('express');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { exec } = require('child_process');

const router = express.Router();
const execPromise = util.promisify(exec);

// Logging utility
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
    fs.appendFileSync('server_errors.log', JSON.stringify(logEntry) + '\n');
};

router.post('/:location', async (req, res) => {
    const { location } = req.params;
    const requestId = Date.now();

    try {
        if (!location) {
            const error = new Error('Location is required in URL');
            error.status = 400;
            throw error;
        }

        console.log(`[${requestId}] Starting processing for location: ${location}`);

        const paths = {
            pythonScript: path.join(__dirname, '../python/process_jha.py'),  // update to reflect actual purpose if needed
            output: path.join(__dirname, '../../output'),
            uploads: path.join(__dirname, '../../uploads'),
            locationDocs: path.join(__dirname, '../../uploads/jha', location)
        };

        // Validate paths
        for (const [label, dirPath] of Object.entries(paths)) {
            if (!fs.existsSync(dirPath)) {
                const error = new Error(`${label} path does not exist: ${dirPath}`);
                error.status = 400;
                throw error;
            }
        }

        const validExtensions = ['.pdf', '.docx', '.xlsx', 'xlsb'];
        const readFilesRecursively = dir => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        return entries.flatMap(entry => {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
            return readFilesRecursively(fullPath);
            } else {
            return fullPath;
            }
        });
        };

        const allFiles = readFilesRecursively(paths.locationDocs);
        const files = allFiles.filter(file =>
        validExtensions.some(ext => file.toLowerCase().endsWith(ext))
        );


        if (files.length === 0) {
            const error = new Error(`No valid documents found for location ${location}`);
            error.status = 400;
            error.details = {
                path: paths.locationDocs,
                files: fs.readdirSync(paths.locationDocs)
            };
            throw error;
        }

        fs.mkdirSync(paths.output, { recursive: true });

        const command = `python "${paths.pythonScript}" --location "${location}" --uploads_root "${paths.uploads}"`;
        console.log(`[${requestId}] Running: ${command}`);

        const { stdout, stderr } = await execPromise(command, {
            timeout: 300000,
            maxBuffer: 1024 * 1024 * 10
        });

        console.log(`[${requestId}] Python stdout:\n${stdout}`);
        if (stderr) {
            console.error(`[${requestId}] Python stderr:\n${stderr}`);
        }

        const resultFile = path.join(paths.output, 'jha_processed.xlsb');
        if (!fs.existsSync(resultFile)) {
            const error = new Error('Expected result file was not generated');
            error.status = 500;
            throw error;
        }

        res.download(resultFile, 'jha_processed.xlsx', err => {
            if (err) {
                logError(err, { requestId, location });
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Download failed', requestId });
                }
            }

            try {
                fs.unlinkSync(resultFile);
            } catch (cleanupError) {
                logError(cleanupError, { requestId, location });
            }
        });

    } catch (error) {
        logError(error, { requestId, location });
        res.status(error.status || 500).json({
            error: error.message,
            requestId,
            details: error.details
        });
    }
});

module.exports = router;
