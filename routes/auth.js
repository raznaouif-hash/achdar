const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
// Body: { userId: number }
router.post('/login', async (req, res, next) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId requis' });

        const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (!rows.length) return res.status(404).json({ error: 'Utilisateur introuvable' });

        const user = rows[0];
        const token = jwt.sign(
            { id: user.id, name: user.name, role: user.role, property_ids: user.property_ids },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, user: { id: user.id, name: user.name, role: user.role, property_ids: user.property_ids } });
    } catch (err) {
        next(err);
    }
});

// POST /api/auth/logout (stateless JWT — client just drops the token)
router.post('/logout', requireAuth, (req, res) => {
    res.json({ message: 'Déconnecté' });
});

module.exports = router;
