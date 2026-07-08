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
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(10) DEFAULT 'medium',
      due_date DATE,
      due_time TIME,
      status VARCHAR(20) DEFAULT 'todo',
      recurrence VARCHAR(20) DEFAULT 'none',
      recurrence_days INTEGER[],
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ Created tasks table');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ Created subtasks table');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_completions (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
      UNIQUE(task_id, completed_date)
    )
  `);
  console.log('✓ Created task_completions table');

  await pool.end();
}

run().catch(err => { console.error(err.message); pool.end(); });
