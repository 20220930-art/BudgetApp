const BaseModel = require('./BaseModel');
const db = require('./db');

class Goal extends BaseModel {
  static tableName = 'goals';

  /**
   * Contribute an amount to a savings goal.
   * @param {number} goalId - Goal ID
   * @param {number} userId - User ID
   * @param {number} amount - Amount to contribute
   * @returns {Promise<Object|null>} Updated goal or null if not found
   */
  static async contribute(goalId, userId, amount) {
    const goalResult = await db.query(
      'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
      [goalId, userId]
    );
    if (goalResult.rows.length === 0) return null;

    const goal = goalResult.rows[0];
    const newAmount = parseFloat(goal.current_amount) + parseFloat(amount);
    const newStatus = newAmount >= parseFloat(goal.target_amount) ? 'completed' : 'in_progress';

    const result = await db.query(
      'UPDATE goals SET current_amount = $1, status = $2 WHERE id = $3 RETURNING *',
      [newAmount, newStatus, goalId]
    );
    return result.rows[0];
  }
}

module.exports = Goal;
