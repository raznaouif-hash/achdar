const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/users
router.get('/users', async (req, res, next) => {
    try {
        const { rows } = await db.query('SELECT id, name, role, property_ids FROM users ORDER BY id');
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// GET /api/properties
router.get('/properties', async (req, res, next) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM properties WHERE id = ANY($1) ORDER BY id',
            [req.user.property_ids]
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
