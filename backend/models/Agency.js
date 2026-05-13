const mongoose = require('mongoose');

const agencySchema = new mongoose.Schema({
  key: { type: String, required: true }, // 'police', 'fire', 'medical'

  name: { type: String, required: true },
  totalUnits: { type: Number, required: true },
  availableUnits: { type: Number, required: true },
  status: {
    type: String,
    enum: ['online', 'busy', 'offline'],
    default: 'online',
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
}, { timestamps: true });

module.exports = mongoose.model('Agency', agencySchema);
