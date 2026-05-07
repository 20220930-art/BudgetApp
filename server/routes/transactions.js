const express = require('express');
const db = require('../models/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { type, from, to, limit = 50 } = req.query;
    let query = `
      SELECT t.*, c.name as category_name, c.type as category_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const params = [req.userId];
    let idx = 2;

    if (type) {
      query += ` AND t.type = $${idx++}`;
      params.push(type);
    }
    if (from) {
      query += ` AND t.date >= $${idx++}`;
      params.push(from);
    }
    if (to) {
      query += ` AND t.date <= $${idx++}`;
      params.push(to);
    }
    query += ` ORDER BY t.date DESC, t.created_at DESC LIMIT $${idx}`;
    params.push(limit);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { type, amount, description, date, category_id } = req.body;
  if (!type || !amount || !date) {
    return res.status(400).json({ error: 'Type, amount, and date are required' });
  }
  try {
    const result = await db.query(
      'INSERT INTO transactions (user_id, category_id, type, amount, description, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.userId, category_id || null, type, amount, description || '', date]
    );
    const transaction = result.rows[0];

    let budgetStatus = null;
    if (type === 'expense' && category_id) {
      budgetStatus = await checkBudgetAlert(req.userId, category_id, date);
    }

    res.status(201).json({ transaction, budgetStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { type, amount, description, date, category_id } = req.body;
  try {
    const result = await db.query(
      'UPDATE transactions SET type=$1, amount=$2, description=$3, date=$4, category_id=$5 WHERE id=$6 AND user_id=$7 RETURNING *',
      [type, amount, description, date, category_id, req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function checkBudgetAlert(userId, categoryId, date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const budgetResult = await db.query(
    'SELECT * FROM budgets WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4',
    [userId, categoryId, month, year]
  );
  if (budgetResult.rows.length === 0) return null;

  const budget = budgetResult.rows[0];
  const spentResult = await db.query(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND category_id = $2 AND type = 'expense' AND EXTRACT(MONTH FROM date) = $3 AND EXTRACT(YEAR FROM date) = $4",
    [userId, categoryId, month, year]
  );
  const totalSpent = parseFloat(spentResult.rows[0].total);
  const budgetAmount = parseFloat(budget.amount);
  const percentage = (totalSpent / budgetAmount) * 100;

  if (totalSpent >= budgetAmount) {
    await db.query(
      "INSERT INTO notifications (user_id, type, message) VALUES ($1, 'budget_exceeded', $2)",
      [userId, `You have exceeded your budget for this category! Spent ${totalSpent.toFixed(2)} out of ${budgetAmount.toFixed(2)}`]
    );
    await db.query("UPDATE budgets SET status = 'exceeded' WHERE id = $1", [budget.id]);
    return { status: 'exceeded', spent: totalSpent, budget: budgetAmount, percentage: Math.min(percentage, 100) };
  } else if (percentage >= budget.alert_threshold) {
    await db.query(
      "INSERT INTO notifications (user_id, type, message) VALUES ($1, 'budget_warning', $2)",
      [userId, `You are nearing your budget limit. Spent ${totalSpent.toFixed(2)} out of ${budgetAmount.toFixed(2)} (${percentage.toFixed(0)}%)`]
    );
    await db.query("UPDATE budgets SET status = 'near_limit' WHERE id = $1", [budget.id]);
    return { status: 'near_limit', spent: totalSpent, budget: budgetAmount, percentage };
  }

  await db.query("UPDATE budgets SET status = 'active' WHERE id = $1", [budget.id]);
  return { status: 'active', spent: totalSpent, budget: budgetAmount, percentage };
}

module.exports = router;
