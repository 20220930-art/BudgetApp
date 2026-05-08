const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Category = require('../models/Category');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user account.
 * @param {string} req.body.name - User's full name
 * @param {string} req.body.email - User's email
 * @param {string} req.body.password - User's password
 * @returns {Object} { user, token }
 */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  try {
    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const user = await User.register(name, email, password);
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const defaults = [
      { name: 'Salary', type: 'income' },
      { name: 'Freelance', type: 'income' },
      { name: 'Food', type: 'expense' },
      { name: 'Transport', type: 'expense' },
      { name: 'Shopping', type: 'expense' },
      { name: 'Bills', type: 'expense' },
      { name: 'Entertainment', type: 'expense' },
      { name: 'Health', type: 'expense' },
      { name: 'Other', type: 'expense' }
    ];
    for (const cat of defaults) {
      await Category.create({ user_id: user.id, name: cat.name, type: cat.type });
    }

    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/login
 * Authenticate and return a JWT token.
 * @param {string} req.body.email - User's email
 * @param {string} req.body.password - User's password
 * @returns {Object} { user, token }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const match = await User.verifyPassword(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/me
 * Get the currently authenticated user's profile.
 * @auth Bearer token required
 * @returns {Object} { id, name, email }
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.getProfile(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
