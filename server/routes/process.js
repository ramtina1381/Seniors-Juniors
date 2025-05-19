const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { exec } = require('child_process');

router.post('/', (req, res) => {
    const { locationNumber } = req.body;
    
    if (!locationNumber) {
        return res.status(400).json({ error: 'Location number is required' });
    }

    const pythonScriptPath = path.join(__dirname, '../python/process_equipment.py');
    const outputPath = path.join(__dirname, '../../output');
    const uploadsPath = path.join(__dirname, '../../uploads');

    try {
        // Verify uploads directory structure
        const photosPath = path.join(uploadsPath, 'photos', locationNumber);
        const manufacturerPath = path.join(uploadsPath, 'manufacturer', locationNumber);
        
        // Check for photos
        if (!fs.existsSync(photosPath) || fs.readdirSync(photosPath).length === 0) {
            return res.status(400).json({ 
                error: `No photos found for location ${locationNumber}`,
                details: `Expected in: uploads/photos/${locationNumber}`
            });
        }

        // Check for manufacturer file
        const manufacturerFiles = fs.existsSync(manufacturerPath) ? 
            fs.readdirSync(manufacturerPath).filter(f => f.match(/\.(xlsx|xls)$/i)) : [];
        
        if (manufacturerFiles.length === 0) {
            return res.status(400).json({ 
                error: `No manufacturer file found for location ${locationNumber}`,
                details: `Expected in: uploads/manufacturer/${locationNumber}`
            });
        }

        // Ensure output directory exists
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        console.log(`Processing location ${locationNumber} with:`);
        console.log(`- Photos: ${fs.readdirSync(photosPath).length} files`);
        console.log(`- Manufacturer file: ${manufacturerFiles[0]}`);
        
        const command = `python "${pythonScriptPath}" --location "${locationNumber}" --output "${outputPath}" --uploads_root "${uploadsPath}"`;
        console.log('Full command:', command);
        console.log('Python script exists:', fs.existsSync(pythonScriptPath));
        console.log('Uploads path exists:', fs.existsSync(uploadsPath));
        console.log('Photos path exists:', fs.existsSync(photosPath));
        console.log('Manufacturer path exists:', fs.existsSync(manufacturerPath));
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Processing failed:', { error, stderr });
                return res.status(500).json({ 
                    error: 'Processing failed',
                    details: stderr.toString()
                });
            }

            // Check for specific processing messages
            if (stdout.includes('No image files found')) {
                return res.status(400).json({ 
                    error: 'No valid image files found',
                    details: stdout
                });
            }

            if (stdout.includes('No manufacturer file found')) {
                return res.status(400).json({ 
                    error: 'Manufacturer file processing failed',
                    details: stdout
                });
            }

            // Verify result file
            const resultFile = path.join(outputPath, 'equipment_inventory.csv');
            if (!fs.existsSync(resultFile)) {
                return res.status(500).json({ 
                    error: 'Processing completed but no result file was generated',
                    details: stdout
                });
            }

            // Send file with location-specific name
            const downloadName = `equipment_report_${locationNumber}.csv`;
            res.download(resultFile, downloadName, (err) => {
                if (err) {
                    console.error('Download failed:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Download failed' });
                    }
                }
                
                // Cleanup
                try {
                    if (fs.existsSync(resultFile)) {
                        fs.unlinkSync(resultFile);
                    }
                } catch (cleanupError) {
                    console.error('Cleanup failed:', cleanupError);
                }
            });
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

module.exports = router;