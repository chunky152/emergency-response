/**
 * clear-db.js — Wipe all incidents and logs to start fresh
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Incident = require('./models/Incident');
const AlertLog = require('./models/AlertLog');
const Agency = require('./models/Agency');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/emergency';

async function clear() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  await Promise.all([
    Incident.deleteMany({}),
    AlertLog.deleteMany({}),
    // We keep agencies as they are infrastructure, not "seed data" incidents
  ]);
  
  console.log('✅ Incidents and Alert Logs cleared.');
  await mongoose.disconnect();
}

clear().catch(err => {
  console.error('Clear failed:', err);
  process.exit(1);
});
