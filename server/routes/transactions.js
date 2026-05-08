const express = require('express');
const Transaction = require('../models/Transaction');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/transactions
 * List transactions with optional filters.
 * @query {string} [type] - Filter by type (income/expense)
 * @query {string} [from] - Start date (YYYY-MM-DD)
 * @query {string} [to] - End date (YYYY-MM-DD)
 * @query {number} [limit] - Max results
 * @returns {Array} Transaction list
 */
router.get('/', async (req, res) => {
  try {
    const { type, from, to, limit } = req.query;
    const transactions = await Transaction.findAllFiltered(req.userId, { type, from, to, limit });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/transactions
 * Create a new transaction.
 * @param {string} req.body.type - income or expense
 * @param {number} req.body.amount - Transaction amount
 * @param {string} [req.body.description] - Description
 * @param {string} req.body.date - Date (YYYY-MM-DD)
 * @param {number} [req.body.category_id] - Category ID
 * @returns {Object} Created transaction with optional budget status
 */
router.post('/', async (req, res) => {
  const { type, amount, description, date, category_id } = req.body;
  if (!type || !amount || !date) {
    return res.status(400).json({ error: 'Type, amount, and date are required' });
  }
  try {
    const transaction = await Transaction.create({
      user_id: req.userId,
      category_id: category_id || null,
      type,
      amount,
      description: description || '',
      date
    });

    let budgetStatus = null;
    if (type === 'expense' && category_id) {
      budgetStatus = await Transaction.getBudgetAlert(req.userId, category_id, date);
    }

    res.status(201).json({ transaction, budgetStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/transactions/:id
 * Update a transaction.
 * @param {number} req.params.id - Transaction ID
 * @returns {Object} Updated transaction
 */
router.put('/:id', async (req, res) => {
  const { type, amount, description, date, category_id } = req.body;
  try {
    const transaction = await Transaction.update(req.params.id, req.userId, {
      type, amount, description, date, category_id
    });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete a transaction.
 * @param {number} req.params.id - Transaction ID
 * @returns {Object} { message: 'Deleted' }
 */
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.delete(req.params.id, req.userId);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
