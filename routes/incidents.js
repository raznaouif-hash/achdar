const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/incidents
router.get('/', async (req, res, next) => {
    try {
        const propertyIds = req.user.property_ids;
        const { rows } = await db.query(`
            SELECT i.*,
                   COALESCE(json_agg(json_build_object('id', p.id, 'url', p.url, 'filename', p.filename))
                       FILTER (WHERE p.id IS NOT NULL), '[]') AS photos
            FROM incidents i
            LEFT JOIN incident_photos p ON p.incident_id = i.id
            WHERE i.property_id = ANY($1)
            GROUP BY i.id
            ORDER BY i.created_at DESC
        `, [propertyIds]);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// GET /api/incidents/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await db.query(`
            SELECT i.*,
                   COALESCE(json_agg(json_build_object('id', p.id, 'url', p.url))
                       FILTER (WHERE p.id IS NOT NULL), '[]') AS photos
            FROM incidents i
            LEFT JOIN incident_photos p ON p.incident_id = i.id
            WHERE i.id = $1 AND i.property_id = ANY($2)
            GROUP BY i.id
        `, [req.params.id, req.user.property_ids]);

        if (!rows.length) return res.status(404).json({ error: 'Incident introuvable' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

// POST /api/incidents
router.post('/', async (req, res, next) => {
    try {
        const { property_id, category, description, artisan_id } = req.body;
        if (!property_id || !category || !description) {
            return res.status(400).json({ error: 'Champs obligatoires manquants' });
        }
        if (!req.user.property_ids.includes(Number(property_id))) {
            return res.status(403).json({ error: 'Accès refusé à cette propriété' });
        }

        const status = artisan_id ? 'assigned' : 'pending';
        const { rows } = await db.query(`
            INSERT INTO incidents (property_id, category, description, artisan_id, status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [property_id, category, description, artisan_id || null, status, req.user.id]);

        res.status(201).json({ ...rows[0], photos: [] });
    } catch (err) {
        next(err);
    }
});

// PATCH /api/incidents/:id
router.patch('/:id', async (req, res, next) => {
    try {
        const { category, description, artisan_id, status, notes } = req.body;

        const existing = await db.query(
            'SELECT * FROM incidents WHERE id = $1 AND property_id = ANY($2)',
            [req.params.id, req.user.property_ids]
        );
        if (!existing.rows.length) return res.status(404).json({ error: 'Incident introuvable' });

        const cur = existing.rows[0];
        const { rows } = await db.query(`
            UPDATE incidents SET
                category   = $1,
                description = $2,
                artisan_id  = $3,
                status      = $4,
                notes       = $5,
                updated_at  = NOW()
            WHERE id = $6
            RETURNING *
        `, [
            category   ?? cur.category,
            description ?? cur.description,
            artisan_id !== undefined ? (artisan_id || null) : cur.artisan_id,
            status     ?? cur.status,
            notes      ?? cur.notes,
            req.params.id
        ]);

        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/incidents/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { rowCount } = await db.query(
            'DELETE FROM incidents WHERE id = $1 AND property_id = ANY($2)',
            [req.params.id, req.user.property_ids]
        );
        if (!rowCount) return res.status(404).json({ error: 'Incident introuvable' });
        res.json({ message: 'Supprimé' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
