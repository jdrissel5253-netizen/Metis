const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM money_categories WHERE user_id=$1 ORDER BY name', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', async (req, res) => {
  const { name, type, budget_limit, color } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type required' });

  try {
    const result = await pool.query(
      'INSERT INTO money_categories (user_id, name, type, budget_limit, color) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, name, type, budget_limit || null, color || '#4ade80']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM money_categories WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Transactions
router.get('/transactions', async (req, res) => {
  const { month, year } = req.query;
  try {
    let query = `SELECT t.*, mc.name as category_name, mc.color as category_color
                 FROM transactions t
                 LEFT JOIN money_categories mc ON t.category_id = mc.id
                 WHERE t.user_id=$1`;
    const params = [req.user.id];

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM t.date)=$2 AND EXTRACT(YEAR FROM t.date)=$3`;
      params.push(month, year);
    }
    query += ' ORDER BY t.date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transactions', async (req, res) => {
  const { category_id, amount, description, date, type } = req.body;
  if (!amount || !type) return res.status(400).json({ error: 'Amount and type required' });

  try {
    const result = await pool.query(
      'INSERT INTO transactions (user_id, category_id, amount, description, date, type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.user.id, category_id || null, amount, description, date || new Date().toISOString().split('T')[0], type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/transactions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly summary
router.get('/summary', async (req, res) => {
  const { month, year } = req.query;
  try {
    const result = await pool.query(
      `SELECT type, SUM(amount) as total FROM transactions
       WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
       GROUP BY type`,
      [req.user.id, month, year]
    );
    const summary = { income: 0, expense: 0 };
    result.rows.forEach(r => { summary[r.type] = parseFloat(r.total); });
    summary.net = summary.income - summary.expense;
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
