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
  await pool.query('ALTER TABLE goals ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES goals(id)');
  console.log('✓ Added parent_id to goals');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS goal_tasks (
      id SERIAL PRIMARY KEY,
      goal_id INTEGER REFERENCES goals(id),
      user_id INTEGER REFERENCES users(id),
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ Created goal_tasks table');

  await pool.end();
}

run().catch(err => { console.error(err.message); pool.end(); });
