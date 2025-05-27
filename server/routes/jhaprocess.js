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
            pythonScript: path.join(__dirname, '../python/process_jha.py'),
            outputDir: path.join(__dirname, '../../output/jha', location),  // Updated output path
            uploadsRoot: path.join(__dirname, '../../uploads'),
            locationDocs: path.join(__dirname, '../../uploads/jha', location)
        };

        // Validate paths
        for (const [label, dirPath] of Object.entries({
            uploadsRoot: paths.uploadsRoot,
            locationDocs: paths.locationDocs
        })) {
            if (!fs.existsSync(dirPath)) {
                const error = new Error(`${label} path does not exist: ${dirPath}`);
                error.status = 400;
                throw error;
            }
        }

        // Ensure output directory exists
        fs.mkdirSync(paths.outputDir, { recursive: true });

        // Check for valid files (PDFs)
        const pdfFiles = fs.readdirSync(path.join(paths.locationDocs, 'pdfs'))
            .filter(file => file.endsWith('.pdf'));

        if (pdfFiles.length === 0) {
            const error = new Error(`No PDFs found for location ${location}`);
            error.status = 400;
            throw error;
        }

        // Run Python script
        const command = `python "${paths.pythonScript}" --location "${location}" --uploads_root "${paths.uploadsRoot}"`;
        console.log(`[${requestId}] Running: ${command}`);

        const { stdout, stderr } = await execPromise(command, {
            timeout: 300000,
            maxBuffer: 1024 * 1024 * 10
        });

        console.log(`[${requestId}] Python stdout:\n${stdout}`);
        if (stderr) {
            console.error(`[${requestId}] Python stderr:\n${stderr}`);
        }

        // Check for the updated .xlsb file (now saved to output dir by Python)
        const resultFile = path.join(paths.outputDir, 'jha_processed.xlsb');
        if (!fs.existsSync(resultFile)) {
            throw new Error('Expected .xlsb file was not generated in output directory');
        }

        // Send the file (without deleting it afterward)
        res.download(resultFile, `jha_${location}_processed.xlsb`, (err) => {
            if (err) {
                logError(err, { requestId, location });
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Download failed', requestId });
                }
            }
        });

    } catch (error) {
        logError(error, { requestId, location });
        res.status(error.status || 500).json({
            error: error.message,
            requestId,
            details: error.details || null
        });
    }
});

module.exports = router;