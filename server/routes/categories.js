const express = require('express');
const Category = require('../models/Category');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/categories
 * List all categories for the authenticated user.
 * @returns {Array} Category list sorted by type and name
 */
router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAllByUser(req.userId);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/categories
 * Create a new category.
 * @param {string} req.body.name - Category name
 * @param {string} req.body.type - income or expense
 * @returns {Object} Created category
 */
router.post('/', async (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
  try {
    const category = await Category.create({ user_id: req.userId, name, type });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
