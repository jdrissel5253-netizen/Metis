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
  await pool.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`);
  console.log('✓ Added sort_order column to goals');
  // Seed initial order from id so existing goals have a stable default
  await pool.query(`UPDATE goals SET sort_order = id WHERE sort_order = 0`);
  console.log('✓ Seeded sort_order from id');
  await pool.end();
}

run().catch(err => { console.error(err.message); pool.end(); });
