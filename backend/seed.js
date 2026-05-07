/**
 * seed.js — Populate MongoDB with initial incidents and agencies
 * Run once: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Incident = require('./models/Incident');
const Agency = require('./models/Agency');
const AlertLog = require('./models/AlertLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/uders';

const seedIncidents = [
  {
    type: 'fire',
    title: 'Structure fire — Nakawa Market',
    coords: { lat: 0.3421, lng: 32.6012 },
    location: 'Nakawa, Kampala',
    severity: 'critical',
    status: 'pending',
    reporter: 'Anonymous',
    description: 'Large fire spotted at Nakawa market stalls. Multiple structures involved.',
  },
  {
    type: 'medical',
    title: 'Road accident — Jinja Rd',
    coords: { lat: 0.3399, lng: 32.6187 },
    location: 'Jinja Road, Kampala',
    severity: 'critical',
    status: 'pending',
    reporter: 'Nassaka B.',
    description: 'Two-vehicle collision. At least 3 people injured. Ambulance needed urgently.',
  },
  {
    type: 'police',
    title: 'Break-in reported — Ntinda',
    coords: { lat: 0.3651, lng: 32.6223 },
    location: 'Ntinda, Kampala',
    severity: 'high',
    status: 'pending',
    reporter: 'Ssentumwa F.',
    description: 'Armed break-in at residential compound. Suspects still on premises.',
  },
  {
    type: 'disaster',
    title: 'Flooding — Bwaise',
    coords: { lat: 0.3722, lng: 32.556 },
    location: 'Bwaise, Kampala',
    severity: 'high',
    status: 'dispatched',
    reporter: 'Kaweesa D.',
    description: 'Flash flooding after heavy rain. Families stranded. Access roads blocked.',
    dispatchedAgency: 'fire',
    dispatchedAt: new Date(),
  },
  {
    type: 'medical',
    title: 'Cardiac emergency — Mulago',
    coords: { lat: 0.339, lng: 32.5748 },
    location: 'Mulago Hill, Kampala',
    severity: 'critical',
    status: 'dispatched',
    reporter: 'Oketcho N.',
    description: 'Elderly patient in cardiac arrest. Family requesting immediate medical unit.',
    dispatchedAgency: 'medical',
    dispatchedAt: new Date(),
  },
  {
    type: 'fire',
    title: 'Vehicle fire — Entebbe Rd',
    coords: { lat: 0.2934, lng: 32.5638 },
    location: 'Entebbe Road, Kampala',
    severity: 'medium',
    status: 'resolved',
    reporter: 'Anonymous',
    description: 'Fuel tanker on fire on the roadside. Traffic diverted.',
    resolvedAt: new Date(),
  },
];

const seedAgencies = [
  { key: 'police', name: 'Uganda Police',     totalUnits: 5, availableUnits: 5, status: 'online' },
  { key: 'fire',   name: 'Fire Brigade',       totalUnits: 4, availableUnits: 3, status: 'busy'   },
  { key: 'medical',name: 'Medical Services',   totalUnits: 3, availableUnits: 2, status: 'online' },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  await Promise.all([
    Incident.deleteMany({}),
    Agency.deleteMany({}),
    AlertLog.deleteMany({}),
  ]);
  console.log('Cleared existing data.');

  const agencies = await Agency.insertMany(seedAgencies);
  console.log(`Seeded ${agencies.length} agencies.`);

  const incidents = await Incident.insertMany(seedIncidents);
  console.log(`Seeded ${incidents.length} incidents.`);

  // Seed some alert log entries
  await AlertLog.insertMany([
    { msg: 'SMS fallback sent — Police Unit 3' },
    { msg: 'Medical Unit 1 dispatched — Jinja Rd' },
    { msg: 'New report: fire at Nakawa Market' },
    { msg: 'Incident resolved — Ntinda' },
  ]);
  console.log('Seeded alert log entries.');

  await mongoose.disconnect();
  console.log('Done. Run: node index.js to start the server.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
