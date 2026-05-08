const express = require('express');
const authMiddleware = require('../middleware/auth');
const BaseModel = require('../models/BaseModel');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/reports
 * Generate income/expense report with category and monthly breakdowns.
 * @query {string} [from] - Start date (YYYY-MM-DD)
 * @query {string} [to] - End date (YYYY-MM-DD)
 * @returns {Object} Report with totals, category breakdown, monthly data, and insights
 */
router.get('/', async (req, res) => {
  const { from, to } = req.query;
  try {
    const dateFilter = from && to
      ? `AND date BETWEEN '${from}' AND '${to}'`
      : '';

    const incomeResult = await BaseModel.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'income' ${dateFilter}`,
      [req.userId]
    );
    const expenseResult = await BaseModel.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'expense' ${dateFilter}`,
      [req.userId]
    );

    const byCategory = await BaseModel.query(
      `SELECT c.name as category_name, c.type, COALESCE(SUM(t.amount), 0) as total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 ${dateFilter}
       GROUP BY c.name, c.type
       ORDER BY total DESC`,
      [req.userId]
    );

    const byMonth = await BaseModel.query(
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
