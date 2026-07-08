require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT tasks_priority_check CHECK (priority IN ('high', 'medium', 'low')),
      CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'done')),
      CONSTRAINT tasks_recurrence_check CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly'))
    )
  `);
  console.log("created tasks");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("created subtasks");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_completions (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
      UNIQUE(task_id, completed_date)
    )
  `);
  console.log("created task_completions");
  await pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
