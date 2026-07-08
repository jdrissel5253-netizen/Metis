const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { title, description, category, target_date, progress, parent_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    const result = await pool.query(
      'INSERT INTO goals (user_id, title, description, category, target_date, progress, parent_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.id, title, description, category, target_date || null, progress || 0, parent_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { title, description, category, target_date, progress, status, parent_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE goals SET title=COALESCE($1,title), description=COALESCE($2,description),
       category=COALESCE($3,category), target_date=COALESCE($4,target_date),
       progress=COALESCE($5,progress), status=COALESCE($6,status),
       parent_id=COALESCE($7,parent_id)
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [title, description, category, target_date, progress, status, parent_id, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Goal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM goals WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/updates', async (req, res) => {
  const { note, progress_value } = req.body;
  try {
    await pool.query('UPDATE goals SET progress=$1 WHERE id=$2 AND user_id=$3', [progress_value, req.params.id, req.user.id]);
    const result = await pool.query(
      'INSERT INTO goal_updates (goal_id, note, progress_value) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, note, progress_value]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/updates', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM goal_updates WHERE goal_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tasks
router.get('/:id/tasks', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM goal_tasks WHERE goal_id=$1 AND user_id=$2 ORDER BY created_at ASC',
      [req.params.id, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/tasks', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  try {
    const result = await pool.query(
      'INSERT INTO goal_tasks (goal_id, user_id, title) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, req.user.id, title]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/tasks/:taskId', async (req, res) => {
  const { completed, title } = req.body;
  try {
    const result = await pool.query(
      `UPDATE goal_tasks SET
        completed=COALESCE($1,completed),
        title=COALESCE($2,title)
       WHERE id=$3 AND user_id=$4 RETURNING *`,
      [completed, title, req.params.taskId, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tasks/:taskId', async (req, res) => {
  try {
    await pool.query('DELETE FROM goal_tasks WHERE id=$1 AND user_id=$2', [req.params.taskId, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
