require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const db = require('./db');

async function initDB() {
    const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    await db.query(schema);
    console.log('Database initialized');
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
