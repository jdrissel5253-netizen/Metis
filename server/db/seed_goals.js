const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.cczkapthvgejyokzjjmk',
  password: 'pf/DwLL7aM$v5dG',
  ssl: { rejectUnauthorized: false },
});

const GOALS = [
  // Long-term / destination goals
  {
    title: 'Buy my mother a beach house',
    description: 'Give her the life she deserves. A place she can call hers, on the water.',
    category: 'Family',
    status: 'active',
    progress: 0,
  },
  {
    title: 'Own a house in the Mediterranean',
    description: 'A home base somewhere warm, beautiful, and far from ordinary.',
    category: 'Personal',
    status: 'active',
    progress: 0,
  },
  {
    title: 'Travel the world',
    description: 'Every continent, every type of place. Experience as much of the world as possible.',
    category: 'Personal',
    status: 'active',
    progress: 0,
  },
  {
    title: 'Publish my first book',
    description: 'Write something worth reading and put it into the world. The first of many.',
    category: 'Career',
    status: 'active',
    progress: 0,
  },
  {
    title: 'Achieve financial freedom through Talos',
    description: 'Build Talos into something that makes real money and buys back my time. Get rich and free.',
    category: 'Finance',
    status: 'active',
    progress: 5,
  },
  {
    title: 'Find the love of my life',
    description: 'The person who makes everything else feel bigger.',
    category: 'Relationships',
    status: 'active',
    progress: 0,
  },

  // Identity / personal development goals
  {
    title: 'Become the hardest working version of myself',
    description: 'Outwork everyone around me. Build the discipline that turns ambition into reality.',
    category: 'Personal',
    status: 'active',
    progress: 20,
  },
  {
    title: 'Become the most confident version of myself',
    description: 'Walk into any room and own it. No second-guessing, no shrinking.',
    category: 'Personal',
    status: 'active',
    progress: 15,
  },
  {
    title: 'Become the best looking version of myself',
    description: 'Health, fitness, grooming, style — all dialed in. Look as good as I feel.',
    category: 'Health',
    status: 'active',
    progress: 20,
  },
  {
    title: 'Silence every fiber of self-doubt',
    description: 'Stop letting the inner critic win. Build an unshakeable belief in what I\'m capable of.',
    category: 'Personal',
    status: 'active',
    progress: 10,
  },
  {
    title: 'Become the most focused version of myself',
    description: 'Deep work, no distractions, ruthless prioritization. Do less, do it completely.',
    category: 'Personal',
    status: 'active',
    progress: 15,
  },
  {
    title: 'Become the best writer I can be',
    description: 'Study the craft relentlessly. Write every day. Find my voice and sharpen it.',
    category: 'Career',
    status: 'active',
    progress: 10,
  },
  {
    title: 'Cut out bad drinking habits',
    description: 'No more wasted days. If I drink, I drink intentionally — never to the point of regret.',
    category: 'Health',
    status: 'active',
    progress: 10,
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
  console.log(`Seeding goals for user ID ${userId}...`);

  for (const goal of GOALS) {
    await pool.query(
      `INSERT INTO goals (user_id, title, description, category, status, progress)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, goal.title, goal.description, goal.category, goal.status, goal.progress]
    );
    console.log(`  ✓ ${goal.title}`);
  }

  console.log(`\nDone — ${GOALS.length} goals added.`);
  await pool.end();
}

seed().catch(err => { console.error(err.message); pool.end(); });
