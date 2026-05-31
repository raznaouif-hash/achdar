const multer = require('multer');
const sharp = require('sharp');

// Multer stores in memory so sharp can process
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

// Compress and return as base64 data URL (stored in DB — survives server restarts)
async function saveCompressed(buffer) {
    const compressed = await sharp(buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

    return 'data:image/jpeg;base64,' + compressed.toString('base64');
}

module.exports = { upload, saveCompressed };
