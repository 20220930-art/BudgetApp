const express = require('express');
const db = require('../models/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, c.name as category_name,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions
         WHERE user_id = b.user_id AND category_id = b.category_id
         AND type = 'expense'
         AND EXTRACT(MONTH FROM date) = b.month
         AND EXTRACT(YEAR FROM date) = b.year) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = $1
      ORDER BY b.year DESC, b.month DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { category_id, amount, month, year, alert_threshold } = req.body;
  if (!category_id || !amount || !month || !year) {
    return res.status(400).json({ error: 'Category, amount, month, and year are required' });
  }
  try {
    const existing = await db.query(
      'SELECT id FROM budgets WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4',
      [req.userId, category_id, month, year]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Budget already exists for this category and month' });
    }
    const result = await db.query(
      'INSERT INTO budgets (user_id, category_id, amount, month, year, alert_threshold) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.userId, category_id, amount, month, year, alert_threshold || 80]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { amount, alert_threshold } = req.body;
  try {
    const result = await db.query(
      'UPDATE budgets SET amount = $1, alert_threshold = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [amount, alert_threshold || 80, req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Budget not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Budget not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
