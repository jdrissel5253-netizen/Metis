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

const SECTION = {
  title: 'Exercises',
  color: '#F07050',
  tasks: [
    'Three-Layer Exercise (10-15 min) — choose one setting (marsh, tavern, battlefield, desert, marketplace, forest, palace) and one POV character; write 150-250 words',
    'Rule 1 — Every sentence must advance the scene; no sentence may exist solely to describe',
    'Rule 2 — Move the "camera" every paragraph: wide → medium → close → internal, then repeat',
    'Rule 3 — Five adjective limit, unlimited verbs; rely on actions instead of modifiers (e.g. "mud swallowed" not "thick mud")',
    'Rule 4 — Cannot state emotion until the final sentence; show environment, reactions, and behavior first',
    'Progressive Overload Week 1 — 150 words, five adjective limit',
    'Progressive Overload Week 2 — 200 words, four adjective limit',
    'Progressive Overload Week 3 — 250 words, three adjective limit',
    'Progressive Overload Week 4 — no adjective limit, but every adjective must be absolutely necessary',
    'Score the exercise out of 50 — Description /10, Function /10, Camera /10, Verbs /10, Emotion /10',
  ],
};

async function seed() {
  const userResult = await pool.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
  if (!userResult.rows.length) {
    console.error('No user found — register an account first at localhost:5173');
    await pool.end();
    return;
  }
  const userId = userResult.rows[0].id;
  console.log(`Adding "${SECTION.title}" section to TPOVAL workspace for user ID ${userId}...`);

  const sectionResult = await pool.query(
    `INSERT INTO talos_sections (user_id, title, color, workspace) VALUES ($1,$2,$3,'tpoval') RETURNING id`,
    [userId, SECTION.title, SECTION.color]
  );
  const sectionId = sectionResult.rows[0].id;
  console.log(`  + ${SECTION.title}`);
  for (const taskTitle of SECTION.tasks) {
    await pool.query(
      `INSERT INTO talos_tasks (user_id, section_id, title) VALUES ($1,$2,$3)`,
      [userId, sectionId, taskTitle]
    );
  }

  console.log(`\nDone — "${SECTION.title}" added to TPOVAL with ${SECTION.tasks.length} tasks.`);
  await pool.end();
}

seed().catch(err => { console.error(err.message); pool.end(); });
