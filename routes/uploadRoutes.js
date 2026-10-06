import express from 'express';
import { uploadLocal } from '../config/upload.js';
import { getPublicBaseUrl } from '../utils/publicUrl.js';
import { optimizeImageUpload, shouldOptimize } from '../utils/optimizeImageUpload.js';
import path from 'path';

const router = express.Router();

router.post(
    '/',
    uploadLocal.single('image'),
    async (req, res) => {
        if (!req.file) {
            return res.status(400).send({ message: 'No file uploaded' });
        }

        let filename = req.file.filename;

        if (shouldOptimize(req.file)) {
            try {
                const optimizedPath = await optimizeImageUpload(req.file.path);
                filename = path.basename(optimizedPath);
            } catch (e) {
                // If optimization fails, fall back to the original file.
            }
        }

        const relativePath = `/uploads/${filename}`;
        const baseUrl = getPublicBaseUrl(req);
        res.send(`${baseUrl}${relativePath}`);
    },
);

router.use((err, req, res, next) => {
    if (err) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({ message: err.message || 'Upload failed' });
    }
    next();
});

export default router;
