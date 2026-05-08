const BaseModel = require('./BaseModel');
const db = require('./db');

class Notification extends BaseModel {
  static tableName = 'notifications';

  /**
   * Find the most recent notifications for a user.
   * @param {number} userId - User ID
   * @param {number} [limit=20] - Max results
   * @returns {Promise<Array>} Recent notifications
   */
  static async findRecent(userId, limit = 20) {
    const result = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Mark a single notification as read.
   * @param {number} id - Notification ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Updated notification or null
   */
  static async markAsRead(id, userId) {
    const result = await db.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Mark all notifications as read for a user.
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async markAllAsRead(userId) {
    await db.query(
      'UPDATE notifications SET read = true WHERE user_id = $1',
      [userId]
    );
  }
}

module.exports = Notification;
