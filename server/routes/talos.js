const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Sections (with tasks nested)
router.get('/sections', async (req, res) => {
  const workspace = req.query.workspace || 'talos';
  try {
    const sections = await pool.query(
      'SELECT * FROM talos_sections WHERE user_id=$1 AND workspace=$2 ORDER BY sort_order ASC, created_at ASC',
      [req.user.id, workspace]
    );
    const sectionIds = sections.rows.map(s => s.id);
    const tasks = sectionIds.length
      ? await pool.query(
          `SELECT * FROM talos_tasks WHERE user_id=$1 AND section_id = ANY($2) ORDER BY sort_order ASC, created_at ASC`,
          [req.user.id, sectionIds]
        )
      : { rows: [] };
    const result = sections.rows.map(s => ({
      ...s,
      tasks: tasks.rows.filter(t => t.section_id === s.id),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sections', async (req, res) => {
  const { title, color, workspace = 'talos' } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  try {
    const result = await pool.query(
      'INSERT INTO talos_sections (user_id, title, color, workspace) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, title, color || '#FBBF24', workspace]
    );
    res.status(201).json({ ...result.rows[0], tasks: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/sections/:id', async (req, res) => {
  const { title, color, sort_order } = req.body;
  try {
    const result = await pool.query(
      `UPDATE talos_sections SET
        title=COALESCE($1,title), color=COALESCE($2,color), sort_order=COALESCE($3,sort_order)
       WHERE id=$4 AND user_id=$5 RETURNING *`,
      [title, color, sort_order, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/sections/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM talos_sections WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tasks
router.post('/sections/:id/tasks', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  try {
    const result = await pool.query(
      'INSERT INTO talos_tasks (user_id, section_id, title) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, req.params.id, title]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/tasks/:id', async (req, res) => {
  const { title, completed } = req.body;
  try {
    const result = await pool.query(
      `UPDATE talos_tasks SET
        title=COALESCE($1,title),
        completed=COALESCE($2,completed)
       WHERE id=$3 AND user_id=$4 RETURNING *`,
      [title, completed, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM talos_tasks WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear completed tasks in a section
router.delete('/sections/:id/completed', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM talos_tasks WHERE section_id=$1 AND user_id=$2 AND completed=TRUE',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
