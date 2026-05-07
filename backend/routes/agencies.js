const express = require('express');
const router = express.Router();
const Agency = require('../models/Agency');

// GET /api/agencies
router.get('/', async (req, res) => {
  try {
    const agencies = await Agency.find();
    res.json(agencies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
