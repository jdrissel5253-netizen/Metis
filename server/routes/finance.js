const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/goals', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM financial_goals WHERE user_id=$1 ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/goals', async (req, res) => {
  const { title, description, target_amount, current_amount } = req.body;
  if (!title || !target_amount) return res.status(400).json({ error: 'Title and target required' });
  try {
    const result = await pool.query(
      'INSERT INTO financial_goals (user_id, title, description, target_amount, current_amount) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, title, description, target_amount, current_amount || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/goals/:id', async (req, res) => {
  const { title, description, target_amount, current_amount } = req.body;
  try {
    const result = await pool.query(
      `UPDATE financial_goals SET
        title=COALESCE($1,title),
        description=COALESCE($2,description),
        target_amount=COALESCE($3,target_amount),
        current_amount=COALESCE($4,current_amount)
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [title, description, target_amount, current_amount, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/goals/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM financial_goals WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Log a balance update
router.post('/goals/:id/history', async (req, res) => {
  const { amount, note } = req.body;
  if (amount == null) return res.status(400).json({ error: 'Amount required' });
  try {
    await pool.query(
      'UPDATE financial_goals SET current_amount=$1 WHERE id=$2 AND user_id=$3',
      [amount, req.params.id, req.user.id]
    );
    const result = await pool.query(
      'INSERT INTO financial_goal_history (goal_id, amount, note) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, amount, note || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/goals/:id/history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM financial_goal_history WHERE goal_id=$1 ORDER BY recorded_at ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Projection: avg monthly net from transactions over last 6 months
router.get('/projection', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        EXTRACT(YEAR FROM date) AS year,
        EXTRACT(MONTH FROM date) AS month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
       FROM transactions
       WHERE user_id=$1 AND date >= NOW() - INTERVAL '6 months'
       GROUP BY year, month
       ORDER BY year, month`,
      [req.user.id]
    );

    const months = result.rows;
    if (!months.length) return res.json({ avg_monthly_net: 0, months });

    const nets = months.map(m => parseFloat(m.income) - parseFloat(m.expense));
    const avg = nets.reduce((a, b) => a + b, 0) / nets.length;

    res.json({ avg_monthly_net: parseFloat(avg.toFixed(2)), months });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debts
router.get('/debts', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM debts WHERE user_id=$1 ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/debts', async (req, res) => {
  const { title, debt_type, original_amount, current_balance, interest_rate, minimum_payment } = req.body;
  if (!title || !original_amount || current_balance == null) return res.status(400).json({ error: 'Title, original amount, and current balance required' });
  try {
    const result = await pool.query(
      `INSERT INTO debts (user_id, title, debt_type, original_amount, current_balance, interest_rate, minimum_payment)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, title, debt_type || 'other', original_amount, current_balance, interest_rate || 0, minimum_payment || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/debts/:id', async (req, res) => {
  const { title, debt_type, original_amount, current_balance, interest_rate, minimum_payment } = req.body;
  try {
    const result = await pool.query(
      `UPDATE debts SET
        title=COALESCE($1,title), debt_type=COALESCE($2,debt_type),
        original_amount=COALESCE($3,original_amount), current_balance=COALESCE($4,current_balance),
        interest_rate=COALESCE($5,interest_rate), minimum_payment=COALESCE($6,minimum_payment)
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [title, debt_type, original_amount, current_balance, interest_rate, minimum_payment, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/debts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM debts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/debts/:id/history', async (req, res) => {
  const { balance, note } = req.body;
  if (balance == null) return res.status(400).json({ error: 'Balance required' });
  try {
    await pool.query('UPDATE debts SET current_balance=$1 WHERE id=$2 AND user_id=$3', [balance, req.params.id, req.user.id]);
    const result = await pool.query(
      'INSERT INTO debt_history (debt_id, balance, note) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, balance, note || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/debts/:id/history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM debt_history WHERE debt_id=$1 ORDER BY recorded_at ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upcoming Cash
router.get('/upcoming', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM upcoming_cash WHERE user_id=$1 ORDER BY expected_date ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upcoming', async (req, res) => {
  const { title, amount, expected_date } = req.body;
  if (!title || !amount || !expected_date) return res.status(400).json({ error: 'Title, amount, and date required' });
  try {
    const result = await pool.query(
      'INSERT INTO upcoming_cash (user_id, title, amount, expected_date) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, title, amount, expected_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/upcoming/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM upcoming_cash WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
