const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: 'db.cczkapthvgejyokzjjmk.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

pool.query(schema)
  .then(() => { console.log('✓ Metis schema created successfully'); pool.end(); })
  .catch(err => { console.error('Schema error:', err.message); pool.end(); process.exit(1); });
