const express = require('express');
const db = require('../models/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { from, to } = req.query;
  try {
    const dateFilter = from && to
      ? `AND date BETWEEN '${from}' AND '${to}'`
      : '';

    const incomeResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'income' ${dateFilter}`,
      [req.userId]
    );
    const expenseResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'expense' ${dateFilter}`,
      [req.userId]
    );

    const byCategory = await db.query(
      `SELECT c.name as category_name, c.type, COALESCE(SUM(t.amount), 0) as total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 ${dateFilter}
       GROUP BY c.name, c.type
       ORDER BY total DESC`,
      [req.userId]
    );

    const byMonth = await db.query(
      `SELECT TO_CHAR(date, 'YYYY-MM') as month, type, COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE user_id = $1 ${dateFilter}
       GROUP BY month, type
       ORDER BY month`,
      [req.userId]
    );

    const totalIncome = parseFloat(incomeResult.rows[0].total);
    const totalExpense = parseFloat(expenseResult.rows[0].total);
    const balance = totalIncome - totalExpense;

    let topExpenseCategory = null;
    const expenseCategories = byCategory.rows.filter(r => r.type === 'expense');
    if (expenseCategories.length > 0) {
      topExpenseCategory = expenseCategories[0].category_name;
    }

    res.json({
      totalIncome,
      totalExpense,
      balance,
      byCategory: byCategory.rows,
      byMonth: byMonth.rows,
      insights: {
        topExpenseCategory,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0,
        totalTransactions: byCategory.rows.reduce((sum, r) => sum + parseFloat(r.total), 0)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
