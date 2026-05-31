-- ACHDAR Database Schema
-- Run this once to set up the database

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
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO properties (name, address) VALUES
    ('Villa Talia', 'Adresse Villa Talia'),
    ('Appart Saphir', 'Adresse Appart Saphir')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, name, role, property_ids) VALUES
    (1, 'Propriétaire', 'Propriétaire', '{1,2}'),
    (2, 'Gestionnaire', 'Conciergerie', '{1,2}'),
    (3, 'Gouvernante', 'Femme de ménage', '{1,2}'),
    (4, 'Agent d''accueil', 'Agent d''accueil', '{1,2}'),
    (5, 'Artisan', 'Artisan', '{1,2}')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence after manual inserts
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
