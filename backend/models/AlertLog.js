const mongoose = require('mongoose');

const alertLogSchema = new mongoose.Schema({
  msg: { type: String, required: true },
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null },
}, { timestamps: true });

module.exports = mongoose.model('AlertLog', alertLogSchema);
