const express = require('express');
const router = express.Router();
const Agency = require('../models/Agency');

// GET /api/agencies
// Haversine formula for distance in km
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/agencies?lat=...&lng=...
router.get('/', async (req, res) => {
  try {
    let agencies = await Agency.find();
    const { lat, lng } = req.query;
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      agencies = agencies
        .map((ag) => ({
          ...ag.toObject(),
          distance: getDistanceKm(latNum, lngNum, ag.location.lat, ag.location.lng),
        }))
        .sort((a, b) => a.distance - b.distance);
    }
    res.json(agencies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
