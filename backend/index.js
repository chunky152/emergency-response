require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const incidentsRouter = require('./routes/incidents');
const agenciesRouter  = require('./routes/agencies');
const alertsRouter    = require('./routes/alerts');

const app  = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/uders';

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

/* ─── Middleware ─────────────────────────────────────────── */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded media files
app.use('/uploads', express.static(uploadsDir));

// Serve frontend files from ../frontend
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

/* ─── API Routes ─────────────────────────────────────────── */
app.use('/api/incidents', incidentsRouter);
app.use('/api/agencies',  agenciesRouter);
app.use('/api/alerts',    alertsRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

/* ─── Database + Start ───────────────────────────────────── */
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected:', MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀  UDERS server running → http://localhost:${PORT}`);
      console.log(`    Citizen page:  http://localhost:${PORT}/citizen.html`);
      console.log(`    Dispatch page: http://localhost:${PORT}/dispatch.html`);
    });
  })
  .catch((err) => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
