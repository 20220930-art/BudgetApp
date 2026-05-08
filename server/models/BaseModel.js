const db = require('./db');

class BaseModel {
  /** @type {string} */
  static tableName = '';

  /**
   * Find all records belonging to a user.
   * @param {number} userId - User ID
   * @param {string} [orderBy='created_at DESC'] - ORDER BY clause
   * @returns {Promise<Array>} List of records
   */
  static async findAll(userId, orderBy = 'created_at DESC') {
    const result = await db.query(
      `SELECT * FROM ${this.tableName} WHERE user_id = $1 ORDER BY ${orderBy}`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Find a single record by ID and user.
   * @param {number} id - Record ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Found record or null
   */
  static async findById(id, userId) {
    const result = await db.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new record.
   * @param {Object} fields - Column-value pairs to insert
   * @returns {Promise<Object>} Created record
   */
  static async create(fields) {
    const keys = Object.keys(fields);
    const vals = Object.values(fields);
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');
    const result = await db.query(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`,
      vals
    );
    return result.rows[0];
  }

  /**
   * Update a record by ID and user.
   * @param {number} id - Record ID
   * @param {number} userId - User ID
   * @param {Object} fields - Column-value pairs to update
   * @returns {Promise<Object|null>} Updated record or null
   */
  static async update(id, userId, fields) {
    const keys = Object.keys(fields);
    const vals = Object.values(fields);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    vals.push(id, userId);
    const result = await db.query(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${vals.length - 1} AND user_id = $${vals.length} RETURNING *`,
      vals
    );
    return result.rows[0] || null;
  }

  /**
   * Delete a record by ID and user.
   * @param {number} id - Record ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Deleted record or null
   */
  static async delete(id, userId) {
    const result = await db.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Execute a raw SQL query.
   * @param {string} text - SQL query text
   * @param {Array} [params] - Query parameters
   * @returns {Promise<Object>} Query result
   */
  static async query(text, params) {
    return db.query(text, params);
  }
}

module.exports = BaseModel;
