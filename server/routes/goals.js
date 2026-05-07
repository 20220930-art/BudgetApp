const express = require('express');
const db = require('../models/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, target_amount, deadline } = req.body;
  if (!name || !target_amount) {
    return res.status(400).json({ error: 'Name and target amount are required' });
  }
  try {
    const result = await db.query(
      'INSERT INTO goals (user_id, name, target_amount, deadline) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, name, target_amount, deadline || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/contribute', async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
  try {
    const goalResult = await db.query(
      'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (goalResult.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });

    const goal = goalResult.rows[0];
    const newAmount = parseFloat(goal.current_amount) + parseFloat(amount);

    let newStatus = 'in_progress';
    if (newAmount >= parseFloat(goal.target_amount)) {
      newStatus = 'completed';
    }

    const result = await db.query(
      'UPDATE goals SET current_amount = $1, status = $2 WHERE id = $3 RETURNING *',
      [newAmount, newStatus, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
