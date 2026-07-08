const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM habits WHERE user_id=$1 ORDER BY created_at', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  try {
    const result = await pool.query(
      'INSERT INTO habits (user_id, name, description, color) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, name, description, color || '#4ade80']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM habits WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get logs for a date range
router.get('/logs', async (req, res) => {
  const { start, end } = req.query;
  try {
    const result = await pool.query(
      `SELECT hl.*, h.name, h.color FROM habit_logs hl
       JOIN habits h ON hl.habit_id = h.id
       WHERE hl.user_id=$1 AND hl.completed_date BETWEEN $2 AND $3
       ORDER BY hl.completed_date DESC`,
      [req.user.id, start, end]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check in a habit for today
router.post('/:id/log', async (req, res) => {
  const { date } = req.body;
  const logDate = date || new Date().toISOString().split('T')[0];

  try {
    const result = await pool.query(
      'INSERT INTO habit_logs (habit_id, user_id, completed_date) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *',
      [req.params.id, req.user.id, logDate]
    );
    res.status(201).json(result.rows[0] || { already_logged: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Uncheck a habit for today
router.delete('/:id/log', async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    await pool.query(
      'DELETE FROM habit_logs WHERE habit_id=$1 AND user_id=$2 AND completed_date=$3',
      [req.params.id, req.user.id, date]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Streak for a single habit
router.get('/:id/streak', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT completed_date FROM habit_logs
       WHERE habit_id=$1 AND user_id=$2
       ORDER BY completed_date DESC`,
      [req.params.id, req.user.id]
    );

    const dates = result.rows.map(r => r.completed_date.toISOString().split('T')[0]);
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let check = today;

    for (const date of dates) {
      if (date === check) {
        streak++;
        const d = new Date(check);
        d.setDate(d.getDate() - 1);
        check = d.toISOString().split('T')[0];
      } else break;
    }

    res.json({ streak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
