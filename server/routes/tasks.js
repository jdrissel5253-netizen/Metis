const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*,
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'title', s.title, 'completed', s.completed)
            ORDER BY s.created_at
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) AS subtasks,
        EXISTS(
          SELECT 1 FROM task_completions tc
          WHERE tc.task_id = t.id AND tc.completed_date = CURRENT_DATE AND tc.user_id = $1
        ) AS completed_today
      FROM tasks t
      LEFT JOIN subtasks s ON s.task_id = t.id
      WHERE t.user_id = $1
      GROUP BY t.id
      ORDER BY
        CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
        t.due_date NULLS LAST,
        t.due_time NULLS LAST,
        t.created_at`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { title, description, priority, due_date, due_time, recurrence, recurrence_days } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  try {
    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, priority, due_date, due_time, recurrence, recurrence_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, title, description || null, priority || 'medium',
       due_date || null, due_time || null,
       recurrence || 'none', recurrence_days?.length ? recurrence_days : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { title, description, priority, due_date, due_time, status, recurrence, recurrence_days } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tasks SET
        title = $1,
        description = $2,
        priority = $3,
        due_date = $4,
        due_time = $5,
        status = $6,
        recurrence = $7,
        recurrence_days = $8
      WHERE id=$9 AND user_id=$10 RETURNING *`,
      [title, description || null, priority, due_date || null, due_time || null,
       status, recurrence, recurrence_days?.length ? recurrence_days : null,
       req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/subtasks', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  try {
    const result = await pool.query(
      'INSERT INTO subtasks (task_id, title) VALUES ($1,$2) RETURNING *',
      [req.params.id, title]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/subtasks/:subId', async (req, res) => {
  const { completed } = req.body;
  try {
    const result = await pool.query(
      'UPDATE subtasks SET completed=$1 WHERE id=$2 AND task_id=$3 RETURNING *',
      [completed, req.params.subId, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/subtasks/:subId', async (req, res) => {
  try {
    await pool.query('DELETE FROM subtasks WHERE id=$1 AND task_id=$2', [req.params.subId, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO task_completions (task_id, user_id, completed_date) VALUES ($1,$2,CURRENT_DATE) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/complete', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM task_completions WHERE task_id=$1 AND user_id=$2 AND completed_date=CURRENT_DATE',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
