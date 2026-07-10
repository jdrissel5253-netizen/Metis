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
  await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`);
  console.log('✓ Added sort_order column to goals');
  // Seed initial order from id so existing goals have a stable default
  await pool.query(`UPDATE goals SET sort_order = id WHERE sort_order = 0`);
  console.log('✓ Seeded sort_order from id');
  await pool.end();
}

run().catch(err => { console.error(err.message); pool.end(); });
