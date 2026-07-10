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
