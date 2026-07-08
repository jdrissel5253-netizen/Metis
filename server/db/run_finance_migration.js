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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS financial_goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      target_amount NUMERIC(12,2) NOT NULL,
      current_amount NUMERIC(12,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ Created financial_goals table');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS financial_goal_history (
      id SERIAL PRIMARY KEY,
      goal_id INTEGER REFERENCES financial_goals(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL,
      note VARCHAR(255),
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ Created financial_goal_history table');

  // Seed the HYSA goal
  const user = await pool.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
  const userId = user.rows[0].id;
  await pool.query(`
    INSERT INTO financial_goals (user_id, title, description, target_amount, current_amount)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT DO NOTHING
  `, [
    userId,
    'High Yield Savings — $25,000',
    'Build a $25k emergency fund / savings base in a high yield savings account.',
    25000,
    0
  ]);
  console.log('✓ Seeded HYSA goal');

  await pool.end();
}

run().catch(err => { console.error(err.message); pool.end(); });
