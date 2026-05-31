const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

// Multer stores in memory so sharp can process before saving
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter(req, file, cb) {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Seules les images sont acceptées'));
        }
        cb(null, true);
    }
});

async function saveCompressed(buffer, incidentId, index) {
    const dir = path.join(uploadsDir, String(incidentId));
    fs.mkdirSync(dir, { recursive: true });
    const filename = `photo_${index}_${Date.now()}.jpg`;
    const filepath = path.join(dir, filename);

    await sharp(buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(filepath);

    return `/uploads/${incidentId}/${filename}`;
}

module.exports = { upload, saveCompressed };
