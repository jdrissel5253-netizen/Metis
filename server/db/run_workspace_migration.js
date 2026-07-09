const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.cczkapthvgejyokzjjmk',
  password: 'pf/DwLL7aM$v5dG',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await pool.query(`ALTER TABLE talos_sections ADD COLUMN IF NOT EXISTS workspace VARCHAR(50) DEFAULT 'talos'`);
  await pool.query(`UPDATE talos_sections SET workspace = 'talos' WHERE workspace IS NULL OR workspace = ''`);
  console.log('✓ Added workspace column to talos_sections');
  await pool.end();
}

run().catch(err => { console.error(err.message); pool.end(); });
