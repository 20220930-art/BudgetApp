const express = require('express');
const BaseModel = require('../models/BaseModel');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/dashboard
 * Get dashboard summary data.
 * @returns {Object} Balance, income, expense, recent transactions, budget/goal counts, unread notifications
 */
router.get('/', async (req, res) => {
  try {
    const incomeResult = await BaseModel.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'income'`,
      [req.userId]
    );
    const expenseResult = await BaseModel.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'expense'`,
      [req.userId]
    );
    const recentTransactions = await BaseModel.query(
      `SELECT t.*, c.name as category_name FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 ORDER BY t.date DESC, t.created_at DESC LIMIT 5`,
      [req.userId]
    );
    const activeBudgets = await BaseModel.query(
      `SELECT COUNT(*) as count FROM budgets WHERE user_id = $1 AND status = 'active'`,
      [req.userId]
    );
    const activeGoals = await BaseModel.query(
      `SELECT COUNT(*) as count FROM goals WHERE user_id = $1 AND status = 'in_progress'`,
      [req.userId]
    );
    const unreadNotifications = await BaseModel.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [req.userId]
    );

    const totalIncome = parseFloat(incomeResult.rows[0].total);
    const totalExpense = parseFloat(expenseResult.rows[0].total);

    res.json({
      balance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
      recentTransactions: recentTransactions.rows,
      activeBudgets: parseInt(activeBudgets.rows[0].count),
      activeGoals: parseInt(activeGoals.rows[0].count),
      unreadNotifications: parseInt(unreadNotifications.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
