const BaseModel = require('./BaseModel');
const bcrypt = require('bcryptjs');
const db = require('./db');

class User extends BaseModel {
  static tableName = 'users';

  /**
   * Find a user by email address.
   * @param {string} email - Email to look up
   * @returns {Promise<Object|null>} User record or null
   */
  static async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  /**
   * Register a new user with hashed password.
   * @param {string} name - User's full name
   * @param {string} email - User's email
   * @param {string} password - Plain text password
   * @returns {Promise<Object>} Created user (id, name, email)
   */
  static async register(name, email, password) {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hash]
    );
    return result.rows[0];
  }

  /**
   * Verify a password against a stored hash.
   * @param {string} plainPassword - Plain text password
   * @param {string} hash - Stored bcrypt hash
   * @returns {Promise<boolean>} Whether password matches
   */
  static async verifyPassword(plainPassword, hash) {
    return bcrypt.compare(plainPassword, hash);
  }

  /**
   * Get user profile by ID (without password hash).
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} User profile or null
   */
  static async getProfile(userId) {
    const result = await db.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = User;
