const BaseModel = require('./BaseModel');
const db = require('./db');

class Budget extends BaseModel {
  static tableName = 'budgets';

  /**
   * Find all budgets for a user with current spending per category.
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Budgets with spent amounts
   */
  static async findAllWithSpent(userId) {
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
      [userId]
    );
    return result.rows;
  }

  /**
   * Find an existing budget for a category in a given month/year.
   * @param {number} userId - User ID
   * @param {number} categoryId - Category ID
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Object|null>} Existing budget or null
   */
  static async findExisting(userId, categoryId, month, year) {
    const result = await db.query(
      'SELECT id FROM budgets WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4',
      [userId, categoryId, month, year]
    );
    return result.rows[0] || null;
  }
}

module.exports = Budget;
