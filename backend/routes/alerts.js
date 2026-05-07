const express = require('express');
const router = express.Router();
const AlertLog = require('../models/AlertLog');

// GET /api/alerts?limit=12
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 12;
    const logs = await AlertLog.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
