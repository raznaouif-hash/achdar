const express = require('express');
const https = require('https');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const APP_URL = 'https://achdar.onrender.com';
const AGENT_WHATSAPP = '212666798755'; // Agent d'accueil fixe

async function sendWA(to, text) {
    const sender = process.env.INFOBIP_SENDER;
    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_BASE_URL;

    if (!sender || !apiKey || !baseUrl) {
        throw new Error('Variables Infobip manquantes (INFOBIP_SENDER, INFOBIP_API_KEY, INFOBIP_BASE_URL)');
    }

    const toClean = to.replace(/[^0-9]/g, '');
    const body = JSON.stringify({
        from: sender,
        to: toClean,
        content: { text }
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: baseUrl,
            path: '/whatsapp/1/message/text',
            method: 'POST',
            headers: {
                'Authorization': 'App ' + apiKey,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`WhatsApp → ${toClean} : HTTP ${res.statusCode}`);
                resolve({ to: toClean, status: res.statusCode });
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// POST /api/notify/:incidentId
router.post('/notify/:incidentId', async (req, res, next) => {
    try {
        const { rows } = await db.query(`
            SELECT i.*, p.name as property_name,
                   a.name as artisan_name, a.phone as artisan_phone
            FROM incidents i
            LEFT JOIN properties p ON p.id = i.property_id
            LEFT JOIN artisans a ON a.id = i.artisan_id
            WHERE i.id = $1 AND i.property_id = ANY($2)
        `, [req.params.incidentId, req.user.property_ids]);

        if (!rows.length) return res.status(404).json({ error: 'Incident introuvable' });

        const inc = rows[0];

        // Compter les photos
        const { rows: photoRows } = await db.query(
            'SELECT COUNT(*) as total FROM incident_photos WHERE incident_id = $1',
            [inc.id]
        );
        const totalPhotos = parseInt(photoRows[0].total);
        const photosLine = totalPhotos > 0
            ? '\n📸 ' + totalPhotos + ' photo(s) — consultez : ' + APP_URL
            : '';

        const sent = [];

        // Message → Agent d'accueil
        const msgAgent =
            'Salam 🔔 Nouvel incident — ACHDAR\n\n' +
            '📍 Propriété : ' + inc.property_name + '\n' +
            '🔧 Catégorie : ' + inc.category + '\n' +
            (inc.artisan_name ? '👷 Artisan : ' + inc.artisan_name + ' (' + inc.artisan_phone + ')\n' : '⚠️ Aucun artisan assigné\n') +
            '\nDescription : ' + inc.description +
            photosLine +
            (inc.notes ? '\n\nNotes : ' + inc.notes : '');

        sent.push(await sendWA(AGENT_WHATSAPP, msgAgent));

        // Message → Artisan si assigné
        if (inc.artisan_phone) {
            const msgArtisan =
                'Salam 🔔 Incident assigné — ACHDAR\n\n' +
                'Bonjour ' + inc.artisan_name + ',\n\n' +
                '📍 Propriété : ' + inc.property_name + '\n' +
                '🔧 Catégorie : ' + inc.category + '\n' +
                '\nDescription : ' + inc.description +
                photosLine +
                (inc.notes ? '\n\nNotes : ' + inc.notes : '') +
                '\n\n📞 Pour toute question, contactez notre agent d\'accueil : +212666798755';

            sent.push(await sendWA(inc.artisan_phone, msgArtisan));
        }

        res.json({ success: true, sent: sent.length });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
