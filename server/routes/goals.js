const express = require('express');
const Goal = require('../models/Goal');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/goals
 * List all savings goals.
 * @returns {Array} Goals list
 */
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.findAll(req.userId, 'created_at DESC');
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/goals
 * Create a new savings goal.
 * @param {string} req.body.name - Goal name
 * @param {number} req.body.target_amount - Target amount
 * @param {string} [req.body.deadline] - Deadline date (YYYY-MM-DD)
 * @returns {Object} Created goal
 */
router.post('/', async (req, res) => {
  const { name, target_amount, deadline } = req.body;
  if (!name || !target_amount) {
    return res.status(400).json({ error: 'Name and target amount are required' });
  }
  try {
    const goal = await Goal.create({
      user_id: req.userId,
      name,
      target_amount,
      deadline: deadline || null
    });
    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/goals/:id/contribute
 * Contribute money toward a goal.
 * @param {number} req.params.id - Goal ID
 * @param {number} req.body.amount - Contribution amount (> 0)
 * @returns {Object} Updated goal with new current_amount
 */
router.post('/:id/contribute', async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
  try {
    const goal = await Goal.contribute(req.params.id, req.userId, amount);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/goals/:id
 * Delete a goal.
 * @param {number} req.params.id - Goal ID
 * @returns {Object} { message: 'Deleted' }
 */
router.delete('/:id', async (req, res) => {
  try {
    const goal = await Goal.delete(req.params.id, req.userId);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
