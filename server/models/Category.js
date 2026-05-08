const BaseModel = require('./BaseModel');

class Category extends BaseModel {
  static tableName = 'categories';

  /**
   * Find all categories for a user, sorted by type then name.
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Category list
   */
  static async findAllByUser(userId) {
    return this.findAll(userId, 'type, name');
  }
}

module.exports = Category;
