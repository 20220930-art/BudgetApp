const BaseModel = require('./BaseModel');
const db = require('./db');

class Transaction extends BaseModel {
  static tableName = 'transactions';

  /**
   * Find transactions with optional filters.
   * @param {number} userId - User ID
   * @param {Object} [filters] - Filter options
   * @param {string} [filters.type] - Filter by type (income/expense)
   * @param {string} [filters.from] - Start date (YYYY-MM-DD)
   * @param {string} [filters.to] - End date (YYYY-MM-DD)
   * @param {number} [filters.limit=50] - Max results
   * @returns {Promise<Array>} Filtered transactions
   */
  static async findAllFiltered(userId, filters = {}) {
    const { type, from, to, limit = 50 } = filters;
    let query = `
      SELECT t.*, c.name as category_name, c.type as category_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const params = [userId];
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
    return result.rows;
  }

  /**
   * Check budget alert after adding an expense transaction.
   * @param {number} userId - User ID
   * @param {number} categoryId - Category ID
   * @param {string} date - Transaction date (YYYY-MM-DD)
   * @returns {Promise<Object|null>} Budget alert status or null
   */
  static async getBudgetAlert(userId, categoryId, date) {
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
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND category_id = $2 AND type = 'expense' AND EXTRACT(MONTH FROM date) = $3 AND EXTRACT(YEAR FROM date) = $4`,
      [userId, categoryId, month, year]
    );
    const totalSpent = parseFloat(spentResult.rows[0].total);
    const budgetAmount = parseFloat(budget.amount);
    const percentage = (totalSpent / budgetAmount) * 100;

    if (totalSpent >= budgetAmount) {
      await db.query(
        `INSERT INTO notifications (user_id, type, message) VALUES ($1, 'budget_exceeded', $2)`,
        [userId, `You have exceeded your budget for this category! Spent ${totalSpent.toFixed(2)} out of ${budgetAmount.toFixed(2)}`]
      );
      await db.query(`UPDATE budgets SET status = 'exceeded' WHERE id = $1`, [budget.id]);
      return { status: 'exceeded', spent: totalSpent, budget: budgetAmount, percentage: Math.min(percentage, 100) };
    } else if (percentage >= budget.alert_threshold) {
      await db.query(
        `INSERT INTO notifications (user_id, type, message) VALUES ($1, 'budget_warning', $2)`,
        [userId, `You are nearing your budget limit. Spent ${totalSpent.toFixed(2)} out of ${budgetAmount.toFixed(2)} (${percentage.toFixed(0)}%)`]
      );
      await db.query(`UPDATE budgets SET status = 'near_limit' WHERE id = $1`, [budget.id]);
      return { status: 'near_limit', spent: totalSpent, budget: budgetAmount, percentage };
    }

    await db.query(`UPDATE budgets SET status = 'active' WHERE id = $1`, [budget.id]);
    return { status: 'active', spent: totalSpent, budget: budgetAmount, percentage };
  }
}

module.exports = Transaction;
