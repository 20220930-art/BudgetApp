/**
 * Database connection module.
 * @module db
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

module.exports = {
  /**
   * Execute a parameterized SQL query.
   * @param {string} text - SQL query text
   * @param {Array} [params] - Query parameters
   * @returns {Promise<Object>} Query result with rows property
   */
  query: (text, params) => pool.query(text, params),
  pool
};
