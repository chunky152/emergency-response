const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['fire', 'medical', 'police', 'disaster'],
    required: true,
  },
  title: { type: String, required: true },
  coords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  location: { type: String, required: true },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'critical',
  },
  status: {
    type: String,
    enum: ['pending', 'dispatched', 'resolved'],
    default: 'pending',
  },
  reporter: { type: String, default: 'Anonymous' },
  reporterPhone: { type: String, default: '' },
  description: { type: String, default: 'No description provided.' },
  mediaFiles: [{ type: String }], // stored filenames
  dispatchedAgency: { type: String, default: null },
  dispatchedAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
