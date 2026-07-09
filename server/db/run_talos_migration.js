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
    CREATE TABLE IF NOT EXISTS talos_sections (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      color VARCHAR(20) DEFAULT '#FBBF24',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ Created talos_sections table');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS talos_tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      section_id INTEGER REFERENCES talos_sections(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ Created talos_tasks table');

  await pool.end();
}

run().catch(err => { console.error(err.message); pool.end(); });
