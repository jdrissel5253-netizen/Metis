const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.cczkapthvgejyokzjjmk',
  password: 'pf/DwLL7aM$v5dG',
  ssl: { rejectUnauthorized: false },
});

const GOAL_TASKS = {
  "Buy my mother a beach house": [
    "Research beach house prices in your top 3 target areas",
    "Open a dedicated savings account for this goal",
    "Calculate the down payment needed and set a timeline",
    "Research mortgage options for investment/gift properties",
    "Visit at least one candidate location with her",
  ],
  "Own a house in the Mediterranean": [
    "Research which countries have the best property laws for foreigners (Portugal, Spain, Italy, Greece)",
    "Visit at least one Mediterranean country and scout areas",
    "Talk to a real estate agent or expat community online",
    "Research visa and residency requirements",
    "Calculate total cost: purchase + taxes + maintenance",
  ],
  "Travel the world": [
    "Build a ranked bucket list of 20+ countries",
    "Set up a dedicated travel savings fund",
    "Get a credit card with travel rewards and learn to use points",
    "Book your next international trip",
    "Visit a country you've never considered before",
  ],
  "Publish my first book": [
    "Decide on the core idea or story you want to tell",
    "Outline the full structure — chapters, arc, key points",
    "Write 500 words every single day until the first draft is done",
    "Find 3 beta readers you trust to give honest feedback",
    "Research traditional vs self-publishing and choose your path",
  ],
  "Achieve financial freedom through Talos": [
    "Get 10 paying customers",
    "Reach $5,000 MRR",
    "Build a repeatable outbound sales process",
    "Launch one major marketing push (SEO, ads, or partnerships)",
    "Hire your first person so it stops depending only on you",
  ],
  "Find the love of my life": [
    "Become someone you'd want to be with first",
    "Put yourself in more social situations — events, trips, new circles",
    "Be honest about what you actually want instead of settling",
    "Stop swiping mindlessly — meet people in real life",
    "Travel and expose yourself to people from different walks of life",
  ],
  "Become the hardest working version of myself": [
    "Build a daily schedule and protect it for 30 consecutive days",
    "Identify and eliminate your 3 biggest time wasters",
    "Complete at least one 2-hour deep work block every day",
    "Read one book on discipline or productivity per month",
    "Track your weekly output — review every Sunday",
  ],
  "Become the most confident version of myself": [
    "Do one thing that scares you every single week",
    "Cut out people who consistently drain your energy",
    "Speak up in every room you're in — stop holding back",
    "Work on posture and eye contact every day",
    "Keep a nightly wins journal — write down 3 things you did well",
  ],
  "Become the best looking version of myself": [
    "Hit the gym at least 4 times per week consistently",
    "Clean up your diet — cut processed food and excess alcohol",
    "Build a skincare routine and stick to it morning and night",
    "Do a full wardrobe audit — get rid of anything that doesn't fit well",
    "Lock in a consistent haircut schedule",
  ],
  "Silence every fiber of self-doubt": [
    "Write down your 3 biggest recurring doubts and dismantle each one in writing",
    "Read one book on mindset or self-belief per month",
    "Cut time on social media — stop measuring yourself against others",
    "Celebrate every win out loud, no matter how small it seems",
    "Find a mentor or role model who came from where you are",
  ],
  "Become the most focused version of myself": [
    "Delete or remove the apps that steal the most time",
    "Implement phone-free work blocks — at least 2 hours per day",
    "Build a morning routine that starts the day with intention",
    "Try 10 minutes of meditation daily for 30 days",
    "Write down 3 priorities the night before every day",
  ],
  "Become the best writer I can be": [
    "Write every day — minimum 30 minutes, no excuses",
    "Read at least one book per month, across genres",
    "Study one writer you deeply admire every month — break down their style",
    "Start a blog, newsletter, or journal to build the habit publicly",
    "Ask someone whose opinion you respect to critique your work honestly",
  ],
  "Cut out bad drinking habits": [
    "Set a firm rule: no drinking alone",
    "Limit drinking to weekends only for the next 30 days",
    "Replace the habit with something physical when the urge hits",
    "Track how many drinks per week honestly",
    "Do one fully alcohol-free month — Dry January or any month you choose",
  ],
};

async function seed() {
  const userResult = await pool.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
  if (!userResult.rows.length) {
    console.error('No user found');
    await pool.end();
    return;
  }
  const userId = userResult.rows[0].id;

  const goalsResult = await pool.query('SELECT id, title FROM goals WHERE user_id = $1', [userId]);
  const goalMap = {};
  goalsResult.rows.forEach(g => { goalMap[g.title] = g.id; });

  let total = 0;
  for (const [goalTitle, taskList] of Object.entries(GOAL_TASKS)) {
    const goalId = goalMap[goalTitle];
    if (!goalId) {
      console.warn(`  ! Goal not found: "${goalTitle}"`);
      continue;
    }
    for (const title of taskList) {
      await pool.query(
        'INSERT INTO goal_tasks (goal_id, user_id, title) VALUES ($1, $2, $3)',
        [goalId, userId, title]
      );
      total++;
    }
    console.log(`  ✓ ${goalTitle} (${taskList.length} tasks)`);
  }

  console.log(`\nDone — ${total} tasks added across ${Object.keys(GOAL_TASKS).length} goals.`);
  await pool.end();
}

seed().catch(err => { console.error(err.message); pool.end(); });
