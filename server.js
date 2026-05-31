require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const db = require('./db');

async function initDB() {
    // CREATE IF NOT EXISTS — never drops existing data on restart
    await db.query(`
        CREATE TABLE IF NOT EXISTS properties (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            address TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            role VARCHAR(50) NOT NULL,
            property_ids INTEGER[] NOT NULL DEFAULT '{1,2}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS artisans (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            specialty VARCHAR(50) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS incidents (
            id SERIAL PRIMARY KEY,
            property_id INTEGER NOT NULL REFERENCES properties(id),
            category VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            artisan_id INTEGER REFERENCES artisans(id) ON DELETE SET NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            notes TEXT DEFAULT '',
            created_by INTEGER NOT NULL REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS incident_photos (
            id SERIAL PRIMARY KEY,
            incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            filename TEXT,
            photo_type VARCHAR(10) DEFAULT 'before',
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Insert default data only if tables are empty
    const { rows: propRows } = await db.query('SELECT COUNT(*) FROM properties');
    if (parseInt(propRows[0].count) === 0) {
        await db.query(`
            INSERT INTO properties (name, address) VALUES
                ('Villa Talia', 'Adresse Villa Talia'),
                ('Appart Saphir', 'Adresse Appart Saphir');
        `);
    }

    const { rows: userRows } = await db.query('SELECT COUNT(*) FROM users');
    if (parseInt(userRows[0].count) === 0) {
        await db.query(`
            INSERT INTO users (id, name, role, property_ids) VALUES
                (1, 'Propriétaire', 'Propriétaire', '{1,2}'),
                (2, 'Gestionnaire', 'Conciergerie', '{1,2}'),
                (3, 'Gouvernante', 'Femme de ménage', '{1,2}'),
                (4, 'Agent d''accueil', 'Agent d''accueil', '{1,2}'),
                (5, 'Artisan', 'Artisan', '{1,2}');
            SELECT setval('users_id_seq', 5);
        `);
    }

    console.log('Database initialized successfully');
}

const app = express();

// Security & perf middleware
app.use(helmet({ contentSecurityPolicy: false })); // CSP off — inline scripts in HTML
app.use(compression());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : '*'
}));
app.use(express.json());

// Static files (HTML, CSS, JS, uploads)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/artisans', require('./routes/artisans'));
app.use('/api', require('./routes/data'));
app.use('/api', require('./routes/photos'));

// Catch-all → SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 3000;
initDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`ACHDAR running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('DB init failed:', err);
        process.exit(1);
    });
