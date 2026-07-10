const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await pool.query(`ALTER TABLE talos_sections ADD COLUMN IF NOT EXISTS workspace VARCHAR(50) DEFAULT 'talos'`);
  await pool.query(`UPDATE talos_sections SET workspace = 'talos' WHERE workspace IS NULL OR workspace = ''`);
  console.log('✓ Added workspace column to talos_sections');
  await pool.end();
}

run().catch(err => { console.error(err.message); pool.end(); });
