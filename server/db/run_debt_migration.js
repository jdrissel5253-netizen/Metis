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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS debts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      debt_type VARCHAR(50) DEFAULT 'other',
      original_amount NUMERIC(12,2) NOT NULL,
      current_balance NUMERIC(12,2) NOT NULL,
      interest_rate NUMERIC(5,2) DEFAULT 0,
      minimum_payment NUMERIC(10,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ Created debts table');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS debt_history (
      id SERIAL PRIMARY KEY,
      debt_id INTEGER REFERENCES debts(id) ON DELETE CASCADE,
      balance NUMERIC(12,2) NOT NULL,
      note VARCHAR(255),
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ Created debt_history table');

  await pool.end();
}

run().catch(err => { console.error(err.message); pool.end(); });
