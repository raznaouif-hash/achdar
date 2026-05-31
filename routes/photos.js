const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { upload, saveCompressed } = require('../utils/photoUpload');

const router = express.Router();
router.use(requireAuth);

// POST /api/incidents/:id/photos  (multipart/form-data, field name "files")
router.post('/incidents/:id/photos', upload.array('files', 10), async (req, res, next) => {
    try {
        const incidentId = req.params.id;

        // Verify user has access
        const check = await db.query(
            'SELECT id FROM incidents WHERE id = $1 AND property_id = ANY($2)',
            [incidentId, req.user.property_ids]
        );
        if (!check.rows.length) return res.status(404).json({ error: 'Incident introuvable' });

        const savedPhotos = [];
        for (let i = 0; i < req.files.length; i++) {
            const url = await saveCompressed(req.files[i].buffer, incidentId, i);
            const filename = url.split('/').pop();
            const { rows } = await db.query(
                'INSERT INTO incident_photos (incident_id, url, filename) VALUES ($1, $2, $3) RETURNING *',
                [incidentId, url, filename]
            );
            savedPhotos.push(rows[0]);
        }

        res.status(201).json(savedPhotos);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/incident-photos/:id
router.delete('/incident-photos/:id', async (req, res, next) => {
    try {
        const { rows } = await db.query(
            `SELECT ip.*, i.property_id FROM incident_photos ip
             JOIN incidents i ON i.id = ip.incident_id
             WHERE ip.id = $1`,
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Photo introuvable' });

        const photo = rows[0];
        if (!req.user.property_ids.includes(photo.property_id)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        // Delete file from disk
        const filepath = path.join(__dirname, '..', 'public', photo.url);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

        await db.query('DELETE FROM incident_photos WHERE id = $1', [req.params.id]);
        res.json({ message: 'Photo supprimée' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
