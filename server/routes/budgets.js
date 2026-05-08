const express = require('express');
const Budget = require('../models/Budget');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/budgets
 * List all budgets with current spending.
 * @returns {Array} Budgets with spent amounts
 */
router.get('/', async (req, res) => {
  try {
    const budgets = await Budget.findAllWithSpent(req.userId);
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/budgets
 * Create a new monthly budget for a category.
 * @param {number} req.body.category_id - Category ID
 * @param {number} req.body.amount - Budget amount
 * @param {number} req.body.month - Month (1-12)
 * @param {number} req.body.year - Year
 * @param {number} [req.body.alert_threshold] - Alert at % (default 80)
 * @returns {Object} Created budget
 */
router.post('/', async (req, res) => {
  const { category_id, amount, month, year, alert_threshold } = req.body;
  if (!category_id || !amount || !month || !year) {
    return res.status(400).json({ error: 'Category, amount, month, and year are required' });
  }
  try {
    const existing = await Budget.findExisting(req.userId, category_id, month, year);
    if (existing) {
      return res.status(409).json({ error: 'Budget already exists for this category and month' });
    }
    const budget = await Budget.create({
      user_id: req.userId,
      category_id,
      amount,
      month,
      year,
      alert_threshold: alert_threshold || 80
    });
    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/budgets/:id
 * Update a budget's amount or alert threshold.
 * @param {number} req.params.id - Budget ID
 * @returns {Object} Updated budget
 */
router.put('/:id', async (req, res) => {
  const { amount, alert_threshold } = req.body;
  try {
    const budget = await Budget.update(req.params.id, req.userId, {
      amount,
      alert_threshold: alert_threshold || 80
    });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json(budget);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/budgets/:id
 * Delete a budget.
 * @param {number} req.params.id - Budget ID
 * @returns {Object} { message: 'Deleted' }
 */
router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.delete(req.params.id, req.userId);
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
