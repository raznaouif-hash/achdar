const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/artisans
router.get('/', async (req, res, next) => {
    try {
        const { rows } = await db.query('SELECT * FROM artisans ORDER BY name');
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// POST /api/artisans
router.post('/', async (req, res, next) => {
    try {
        const { name, specialty, phone } = req.body;
        if (!name || !specialty || !phone) {
            return res.status(400).json({ error: 'Champs obligatoires manquants' });
        }
        const { rows } = await db.query(
            'INSERT INTO artisans (name, specialty, phone) VALUES ($1, $2, $3) RETURNING *',
            [name, specialty, phone]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/artisans/:id
router.delete('/:id', async (req, res, next) => {
    try {
        // Unassign from incidents first
        await db.query(`
            UPDATE incidents
            SET artisan_id = NULL,
                status = CASE WHEN status = 'assigned' THEN 'pending' ELSE status END,
                updated_at = NOW()
            WHERE artisan_id = $1
        `, [req.params.id]);

        const { rowCount } = await db.query('DELETE FROM artisans WHERE id = $1', [req.params.id]);
        if (!rowCount) return res.status(404).json({ error: 'Artisan introuvable' });
        res.json({ message: 'Supprimé' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
