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

const SECTIONS = [
  {
    title: 'Week 1 — Observation (3.5h)',
    color: '#FBBF24',
    tasks: [
      '45m — Descriptor Drill: one setting, one character, five senses, one emotional subtext',
      "30m — Reverse Engineer: take one page from an author you admire — why this verb, this sentence length, this order of details?",
      '60m — Novel writing, no editing',
      '15m — Reflection: what felt weak? what repeated? what surprised me?',
      '60m — Descriptor Progressive Overload: describe the SAME setting from an exhausted traveler, a child, a soldier, someone terrified',
    ],
  },
  {
    title: 'Week 2 — Precision (3.5h)',
    color: '#E8A840',
    tasks: [
      '45m — Describe one scene using almost no adjectives, stronger nouns, stronger verbs',
      '30m — Read one excellent action scene; break down pacing, sentence length, transitions',
      '60m — Novel writing, focus only on verbs',
      "30m — Rewrite yesterday's descriptors",
      '45m — Dialogue exercise: reveal emotion without ever naming it',
    ],
  },
  {
    title: 'Week 3 — Layering (3.5h)',
    color: '#F09060',
    tasks: [
      'One paragraph, three jobs: 45m — write a description that simultaneously advances plot, reveals character, creates atmosphere',
      '30m — Reverse engineer another author: what information is omitted?',
      '75m — Novel writing: every paragraph should accomplish TWO things',
      '30m — Reflection: what paragraphs felt alive? why?',
    ],
  },
  {
    title: 'Week 4 — Integration (3.5h)',
    color: '#6BCB8B',
    tasks: [
      '60m — Write one scene where every paragraph includes at least TWO of: description, action, dialogue, internal thought, tension — no isolated description',
      '30m — Pick your weakest paragraph and rewrite it',
      '75m — Novel writing: no stopping, no editing, just flow',
      "45m — Monthly review: biggest improvement? biggest weakness? next month's focus?",
    ],
  },
  {
    title: 'Daily Rules (never change)',
    color: '#60A5FA',
    tasks: [
      'Rule 1 — Every exercise must be harder than the previous one (progressive overload)',
      'Rule 2 — Never repeat the exact same drill; always add a new constraint',
      "Rule 3 — Don't chase beautiful writing, chase better decisions",
    ],
  },
  {
    title: 'Writing Journal (daily habit)',
    color: '#C084FC',
    tasks: [
      'Every session, write exactly 3 lines: Hours / Lesson / Tomorrow\'s overload',
      '30 days of entries = a personalized textbook on how you write',
    ],
  },
];

async function seed() {
  const userResult = await pool.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
  if (!userResult.rows.length) {
    console.error('No user found — register an account first at localhost:5173');
    await pool.end();
    return;
  }
  const userId = userResult.rows[0].id;
  console.log(`Seeding TPOVAL workspace for user ID ${userId}...`);

  for (const section of SECTIONS) {
    const sectionResult = await pool.query(
      `INSERT INTO talos_sections (user_id, title, color, workspace) VALUES ($1,$2,$3,'tpoval') RETURNING id`,
      [userId, section.title, section.color]
    );
    const sectionId = sectionResult.rows[0].id;
    console.log(`  + ${section.title}`);
    for (const taskTitle of section.tasks) {
      await pool.query(
        `INSERT INTO talos_tasks (user_id, section_id, title) VALUES ($1,$2,$3)`,
        [userId, sectionId, taskTitle]
      );
    }
  }

  console.log(`\nDone — ${SECTIONS.length} sections added to TPOVAL.`);
  await pool.end();
}

seed().catch(err => { console.error(err.message); pool.end(); });
