const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Incident = require('../models/Incident');
const Agency = require('../models/Agency');
const AlertLog = require('../models/AlertLog');

// Multer config for media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

/**
 * Reverse Geocoding helper using Nominatim (OpenStreetMap)
 */
async function getAddressFromCoords(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'UDERS-Emergency-Response-App' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address;
    
    // Build a readable string: "Neighborhood/Road, City"
    const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || addr.road || '';
    const city = addr.city || addr.town || addr.municipality || addr.county || 'Kampala';
    
    if (!neighborhood) return city;
    return `${neighborhood}, ${city}`;
  } catch (err) {
    console.error('Geocoding error:', err.message);
    return null;
  }
}

// GET /api/incidents — list all, optional ?type= filter
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.type && req.query.type !== 'all') {
      filter.type = req.query.type;
    }
    const incidents = await Incident.find(filter).sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/incidents/stats — counts for the stat cards
router.get('/stats', async (req, res) => {
  try {
    const [active, pending, resolved, agencies] = await Promise.all([
      Incident.countDocuments({ status: { $in: ['pending', 'dispatched'] } }),
      Incident.countDocuments({ status: 'pending' }),
      Incident.countDocuments({ status: 'resolved' }),
      Agency.find(),
    ]);
    const unitsDeployed = agencies.reduce(
      (sum, a) => sum + (a.totalUnits - a.availableUnits),
      0
    );
    res.json({ active, pending, resolved, unitsDeployed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/incidents/:id — single incident
router.get('/:id', async (req, res) => {
  try {
    const inc = await Incident.findById(req.params.id);
    if (!inc) return res.status(404).json({ error: 'Incident not found' });
    res.json(inc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/incidents — create (supports multipart for media uploads)
router.post(
  '/',
  upload.fields([
    { name: 'photo', maxCount: 3 },
    { name: 'video', maxCount: 3 },
    { name: 'audio', maxCount: 3 },
  ]),
  async (req, res) => {
    try {
      const { type, description, reporter, reporterPhone, lat, lng, severity } = req.body;

      if (!lat || !lng) {
        return res.status(400).json({ error: 'GPS coordinates are required.' });
      }

      // Collect any uploaded file names
      const mediaFiles = [];
      if (req.files) {
        Object.values(req.files).forEach((group) =>
          group.forEach((f) => mediaFiles.push(f.filename))
        );
      }

      const name = reporter || 'Anonymous';
      const incidentType = type || 'fire';
      
      // Attempt to get human-readable address, fallback to GPS string
      let location = await getAddressFromCoords(lat, lng);
      if (!location) {
        location = `GPS: ${parseFloat(lat).toFixed(4)}°N, ${parseFloat(lng).toFixed(4)}°E`;
      }

      const incident = await Incident.create({
        type: incidentType,
        title: `${capitalise(incidentType)} incident — ${name}`,
        coords: { lat: parseFloat(lat), lng: parseFloat(lng) },
        location,
        severity: severity || 'critical',
        status: 'pending',
        reporter: name,
        reporterPhone: reporterPhone || '',
        description: description || 'No description provided.',
        mediaFiles,
      });

      // Log alert for each agency (broadcast)
      const agencies = ['Uganda Police', 'Fire Brigade', 'Medical Services'];
      await Promise.all(
        agencies.map((agency) =>
          AlertLog.create({
            msg: `Alert broadcast to ${agency}: ${incident.title}`,
            incidentId: incident._id,
          })
        )
      );

      // SMS fallback log
      await AlertLog.create({
        msg: `SMS fallback sent for incident ${incident._id}`,
        incidentId: incident._id,
      });
      if (reporterPhone) {
        await AlertLog.create({
          msg: `SMS confirmation sent to reporter: ${reporterPhone}`,
          incidentId: incident._id,
        });
      }

      res.status(201).json(incident);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PATCH /api/incidents/:id/dispatch — assign agency, update status
router.patch('/:id/dispatch', async (req, res) => {
  try {
    const { agencyKey } = req.body;
    if (!agencyKey) return res.status(400).json({ error: 'agencyKey is required' });

    const [incident, agency] = await Promise.all([
      Incident.findById(req.params.id),
      Agency.findOne({ key: agencyKey }),
    ]);

    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    if (!agency) return res.status(404).json({ error: 'Agency not found' });
    if (agency.availableUnits <= 0)
      return res.status(409).json({ error: `${agency.name} has no available units.` });

    // Update incident
    incident.status = 'dispatched';
    incident.dispatchedAgency = agencyKey;
    incident.dispatchedAt = new Date();
    await incident.save();

    // Decrement agency unit
    agency.availableUnits -= 1;
    if (agency.availableUnits === 0) agency.status = 'busy';
    await agency.save();

    // Log alerts
    await AlertLog.create({
      msg: `${agency.name} dispatched to ${incident.title}`,
      incidentId: incident._id,
    });
    await AlertLog.create({
      msg: `SMS fallback sent to ${agency.name} unit`,
      incidentId: incident._id,
    });

    res.json({ incident, agency });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/incidents/:id/resolve — mark resolved, return unit
router.patch('/:id/resolve', async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    await incident.save();

    // Return the unit to the agency if one was dispatched
    if (incident.dispatchedAgency) {
      const agency = await Agency.findOne({ key: incident.dispatchedAgency });
      if (agency) {
        agency.availableUnits = Math.min(agency.availableUnits + 1, agency.totalUnits);
        if (agency.availableUnits > 0) agency.status = 'online';
        await agency.save();
      }
    }

    await AlertLog.create({
      msg: `Incident ${incident._id} resolved — ${incident.title}`,
      incidentId: incident._id,
    });

    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = router;
