/* ============================================================
   CONFIG — change BASE_URL if backend runs on a different host
   ============================================================ */
const API = {
  BASE: window.location.origin, // same origin as the Express server
  incidents: () => `${API.BASE}/api/incidents`,
  incident:  (id) => `${API.BASE}/api/incidents/${id}`,
  dispatch:  (id) => `${API.BASE}/api/incidents/${id}/dispatch`,
  resolve:   (id) => `${API.BASE}/api/incidents/${id}/resolve`,
  agencies:  () => `${API.BASE}/api/agencies`,
  alerts:    () => `${API.BASE}/api/alerts?limit=12`,
  stats:     () => `${API.BASE}/api/incidents/stats`,
};

/* ============================================================
   LOCAL UI STATE  (no more in-memory incidents / agencies)
   ============================================================ */
const UIState = {
  selectedIncidentType: 'fire',
  gpsCoords: null,
  gpsAccuracy: null,
  attachedMedia: [],          // { file, type } objects for citizen form
  activeFilter: 'all',
  selectedIncidentId: null,
  selectedAgencyKey: null,
};

/* ============================================================
   PAGE DETECTION
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.classList.contains('citizen-page')) {
    initCitizenPage();
  } else if (document.body.classList.contains('dispatch-page')) {
    initDispatchPage();
  }
});


/* ============================================================
   CITIZEN PAGE
   ============================================================ */
function initCitizenPage() {
  startGPS();
}

/* GPS capture */
function startGPS() {
  const statusEl  = document.getElementById('gpsStatusText');
  const coordsEl  = document.getElementById('gpsCoords');
  const accuracyEl= document.getElementById('gpsAccuracy');

  if (!navigator.geolocation) {
    statusEl.textContent  = 'GPS unavailable';
    coordsEl.textContent  = 'Using default: 0.3476°N, 32.5825°E';
    accuracyEl.textContent= 'Accuracy: estimate only';
    UIState.gpsCoords = { lat: 0.3476, lng: 32.5825 };
    return;
  }

  statusEl.textContent = 'Acquiring GPS…';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      UIState.gpsCoords   = { lat: latitude, lng: longitude };
      UIState.gpsAccuracy = Math.round(accuracy);

      statusEl.textContent  = 'GPS locked';
      coordsEl.textContent  = `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`;
      /* Display GPS accuracy indicator */
      accuracyEl.textContent= `Accuracy: ±${UIState.gpsAccuracy} m`;
    },
    () => {
      /* Fallback to Kampala centre if GPS denied */
      UIState.gpsCoords   = { lat: 0.3476, lng: 32.5825 };
      UIState.gpsAccuracy = null;
      statusEl.textContent  = 'GPS denied — using estimate';
      coordsEl.textContent  = '0.3476°N, 32.5825°E (Kampala)';
      accuracyEl.textContent= 'Accuracy: estimate only';
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function refreshGPS() {
  document.getElementById('gpsStatusText').textContent = 'Refreshing…';
  document.getElementById('gpsCoords').textContent     = '—';
  document.getElementById('gpsAccuracy').textContent   = '';
  startGPS();
}

/* Incident type selection */
function selectIncident(el) {
  document.querySelectorAll('.incident-type').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  UIState.selectedIncidentType = el.dataset.type;
}

/* Media upload handling */
function handleMedia(input, type) {
  if (!input.files.length) return;
  const file = input.files[0];
  UIState.attachedMedia.push({ file, type });

  const preview = document.getElementById('mediaPreview');
  if (type === 'photo') {
    const img = document.createElement('img');
    img.className = 'media-thumb';
    img.src = URL.createObjectURL(file);
    img.alt = 'Uploaded photo';
    preview.appendChild(img);
  } else {
    const tag = document.createElement('span');
    tag.className = 'media-file-tag';
    tag.textContent = `${type}: ${file.name.slice(0, 20)}`;
    preview.appendChild(tag);
  }
}

/* SOS quick trigger — posts a minimal incident immediately */
async function triggerSOS() {
  const btn = document.getElementById('sosBtn');
  btn.disabled = true;
  btn.querySelector('.sos-label').textContent = '📡 Connecting to responders…';
  btn.style.background = '#92400E';

  try {
    const coords = UIState.gpsCoords || { lat: 0.3476, lng: 32.5825 };
    const body = new FormData();
    body.append('type', UIState.selectedIncidentType || 'fire');
    body.append('lat', coords.lat);
    body.append('lng', coords.lng);
    body.append('severity', 'critical');
    body.append('description', 'SOS — immediate assistance required.');

    await fetch(API.incidents(), { method: 'POST', body });

    btn.querySelector('.sos-label').textContent = '✓ SOS Signal Sent — Help is coming';
    btn.style.background = '#0F6E56';
    showToast('SOS received! Units are being dispatched to your location.');
  } catch (err) {
    btn.disabled = false;
    btn.querySelector('.sos-label').textContent = 'SOS — EMERGENCY';
    btn.style.background = '';
    showToast('Failed to send SOS. Check your connection.');
  }
}

/* Submit full report */
async function submitReport() {
  const desc  = document.getElementById('incidentDesc').value.trim();
  const name  = document.getElementById('reporterName').value.trim();
  const phone = document.getElementById('reporterPhone').value.trim();

  if (!UIState.gpsCoords) {
    alert('Please wait for GPS to lock before submitting.');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled    = true;
  btn.textContent = 'Sending…';

  try {
    /* Build multipart form so media files are sent alongside data */
    const body = new FormData();
    body.append('type',          UIState.selectedIncidentType);
    body.append('lat',           UIState.gpsCoords.lat);
    body.append('lng',           UIState.gpsCoords.lng);
    body.append('severity',      'critical');
    body.append('reporter',      name || 'Anonymous');
    body.append('reporterPhone', phone);
    body.append('description',   desc || 'No description provided.');

    /* Attach media files */
    UIState.attachedMedia.forEach(({ file, type }) => body.append(type, file));

    const res = await fetch(API.incidents(), { method: 'POST', body });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Server error');
    }

    showToast('Police, Fire & Medical units alerted.', 'Report received!');

    /* Reset form — no data persists after submission */
    document.getElementById('incidentDesc').value  = '';
    document.getElementById('reporterName').value  = '';
    document.getElementById('reporterPhone').value = '';
    document.getElementById('mediaPreview').innerHTML = '';
    ['photoUpload', 'videoUpload', 'audioUpload'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    UIState.attachedMedia = [];

    /* Reset incident type selection back to default */
    document.querySelectorAll('.incident-type').forEach((b) => b.classList.remove('active'));
    const defaultType = document.querySelector('.incident-type[data-type="fire"]');
    if (defaultType) defaultType.classList.add('active');
    UIState.selectedIncidentType = 'fire';

    /* Reset submit button */
    setTimeout(() => {
      btn.disabled    = false;
      btn.innerHTML   = 'Submit Report <span class="submit-arrow">&#8594;</span>';
      btn.style.background = '';
    }, 3000);
  } catch (err) {
    btn.disabled    = false;
    btn.textContent = 'Submit Report';
    showToast(`Error: ${err.message}`);
  }
}

function showToast(message, title = 'Success!') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  const content = toast.querySelector('div');
  if (content) {
    content.innerHTML = `<strong>${title}</strong><br />${message}`;
  }

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 5000);
}


/* ============================================================
   DISPATCH PAGE
   ============================================================ */
async function initDispatchPage() {
  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  await Promise.all([
    loadAndRenderIncidents(),
    loadAndRenderStats(),
    loadAndRenderAgencies(),
    loadAndRenderAlertLog(),
  ]);

  // Poll for live updates every 10 seconds
  setInterval(async () => {
    await Promise.all([
      loadAndRenderIncidents(),
      loadAndRenderStats(),
      loadAndRenderAgencies(),
      loadAndRenderAlertLog(),
    ]);
  }, 10000);
}

function updateLiveClock() {
  const el = document.getElementById('liveTime');
  if (!el) return;
  el.textContent = new Date().toLocaleString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/* ── Data loaders ── */
async function loadAndRenderIncidents() {
  try {
    const url = UIState.activeFilter === 'all'
      ? API.incidents()
      : `${API.incidents()}?type=${UIState.activeFilter}`;
    const res = await fetch(url);
    const incidents = await res.json();
    renderIncidents(incidents);
    renderMapPins(incidents);
  } catch (err) {
    console.error('Failed to load incidents:', err);
  }
}

async function loadAndRenderStats() {
  try {
    const res   = await fetch(API.stats());
    const stats = await res.json();
    setEl('statActive',   stats.active);
    setEl('statPending',  stats.pending);
    setEl('statResolved', stats.resolved);
    setEl('statUnits',    stats.unitsDeployed);
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadAndRenderAgencies() {
  try {
    const res      = await fetch(API.agencies());
    const agencies = await res.json();
    agencies.forEach((ag) => {
      const keyMap = { police: 'police', fire: 'fire', medical: 'med' };
      const prefix = keyMap[ag.key];
      if (!prefix) return;
      setEl(`${prefix}Units`,  `${ag.availableUnits} units available`);
      updateAgencyStatus(`${prefix}Status`, ag.status);
    });
  } catch (err) {
    console.error('Failed to load agencies:', err);
  }
}

async function loadAndRenderAlertLog() {
  try {
    const res  = await fetch(API.alerts());
    const logs = await res.json();
    const log  = document.getElementById('alertLog');
    if (!log) return;

    log.innerHTML = logs
      .map((e) => {
        const time = new Date(e.createdAt).toLocaleTimeString('en-GB', {
          hour: '2-digit', minute: '2-digit',
        });
        return `
          <li class="log-entry">
            <span class="log-time">${time}</span>
            <span class="log-msg">${e.msg}</span>
          </li>
        `;
      })
      .join('');
  } catch (err) {
    console.error('Failed to load alert log:', err);
  }
}

/* ── Render helpers ── */
function renderIncidents(incidents) {
  const list = document.getElementById('incidentsList');
  if (!list) return;

  list.innerHTML = '';

  if (!incidents.length) {
    list.innerHTML =
      '<p style="padding:1rem; color:#94A3B8; font-size:13px;">No incidents found.</p>';
    return;
  }

  incidents.forEach((inc) => {
    const card = document.createElement('div');
    card.className = `incident-card severity-${inc.severity}`;
    card.dataset.id = inc._id;

    const iconMap  = { fire: '🔥', medical: '🚑', police: '🛡️', disaster: '⛈️' };
    const iconClass = `icon-${inc.type}`;
    const tagClass  = `tag-${inc.severity}`;
    const isDispatched = inc.status === 'dispatched';
    const isResolved   = inc.status === 'resolved';

    // Friendly relative time from createdAt
    const timeAgo = formatTimeAgo(inc.createdAt);

    card.innerHTML = `
      <div class="inc-card-icon ${iconClass}">${iconMap[inc.type] || '⚠️'}</div>
      <div class="inc-card-body">
        <div class="inc-card-title">${inc.title}</div>
        <div class="inc-card-meta">
          <span>📍 ${inc.location}</span>
          <span>🕐 ${timeAgo}</span>
          <span class="severity-tag ${tagClass}">${capitalise(inc.severity)}</span>
          ${isDispatched ? '<span class="dispatched-tag">✓ Dispatched</span>' : ''}
          ${isResolved   ? '<span class="dispatched-tag">✓ Resolved</span>'   : ''}
        </div>
        <div class="inc-card-actions">
          ${!isResolved && !isDispatched
            ? `<button class="btn-dispatch-sm" onclick="openDispatchModal('${inc._id}')">Dispatch</button>`
            : ''}
          <button class="btn-view-sm" onclick="viewIncident('${inc._id}')">View details</button>
          ${isDispatched
            ? `<button class="btn-view-sm" onclick="resolveIncident('${inc._id}')">Mark resolved</button>`
            : ''}
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

/* Filter incidents */
function filterIncidents(type, btn) {
  UIState.activeFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadAndRenderIncidents();
}

/* View incident details */
async function viewIncident(id) {
  try {
    const res = await fetch(API.incident(id));
    const inc = await res.json();
    alert(
      `Incident: ${inc.title}\n` +
      `Location: ${inc.location}\n` +
      `GPS: ${inc.coords.lat.toFixed(4)}°N, ${inc.coords.lng.toFixed(4)}°E\n` +
      `Severity: ${capitalise(inc.severity)}\n` +
      `Reporter: ${inc.reporter}\n\n` +
      `Description:\n${inc.description}`
    );
  } catch (err) {
    alert('Could not load incident details.');
  }
}

/* ── Dispatch modal ── */
async function openDispatchModal(incidentId) {
  UIState.selectedIncidentId = incidentId;
  UIState.selectedAgencyKey  = null;

  try {
    const [incRes, agRes] = await Promise.all([
      fetch(API.incident(incidentId)),
      fetch(API.agencies()),
    ]);
    const inc      = await incRes.json();
    const agencies = await agRes.json();

    document.getElementById('modalBody').textContent =
      `Dispatch a unit to: "${inc.title}" at ${inc.location}`;

    const agencyList = document.getElementById('modalAgencyList');
    agencyList.innerHTML = '';

    agencies.forEach((ag) => {
      const isAvailable = ag.availableUnits > 0;
      const opt = document.createElement('label');
      opt.className = `modal-agency-option ${!isAvailable ? 'disabled' : ''}`;
      opt.innerHTML = `
        <input type="radio" name="agency" value="${ag.key}" 
          ${!isAvailable ? 'disabled' : ''}
          onchange="selectAgency('${ag.key}', this.parentElement)" />
        <span>${ag.name} — ${ag.availableUnits} unit${ag.availableUnits !== 1 ? 's' : ''} available</span>
      `;
      agencyList.appendChild(opt);
    });

    document.getElementById('modalOverlay').classList.add('open');
  } catch (err) {
    alert('Could not open dispatch modal. Check your connection.');
  }
}

function selectAgency(key, el) {
  if (el.classList.contains('disabled')) return;
  
  UIState.selectedAgencyKey = key;
  document.querySelectorAll('.modal-agency-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');

  // Trigger dispatch immediately on selection
  confirmDispatch();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  UIState.selectedIncidentId = null;
  UIState.selectedAgencyKey  = null;
}

/* Confirm dispatch */
async function confirmDispatch() {
  if (!UIState.selectedAgencyKey) {
    alert('Please select an agency to dispatch.');
    return;
  }

  try {
    const res = await fetch(API.dispatch(UIState.selectedIncidentId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agencyKey: UIState.selectedAgencyKey }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(`Dispatch failed: ${err.error}`);
      return;
    }

    closeModal();
    showToast(`Dispatch signal sent successfully!`, 'Unit Dispatched');

    await Promise.all([
      loadAndRenderIncidents(),
      loadAndRenderStats(),
      loadAndRenderAgencies(),
      loadAndRenderAlertLog(),
    ]);
  } catch (err) {
    alert('Dispatch request failed. Check your connection.');
  }
}

/* Resolve incident */
async function resolveIncident(id) {
  try {
    const res = await fetch(API.resolve(id), { method: 'PATCH' });
    if (!res.ok) {
      const err = await res.json();
      alert(`Resolve failed: ${err.error}`);
      return;
    }
    await Promise.all([
      loadAndRenderIncidents(),
      loadAndRenderStats(),
      loadAndRenderAgencies(),
      loadAndRenderAlertLog(),
    ]);
  } catch (err) {
    alert('Resolve request failed. Check your connection.');
  }
}

/* Render map pins */
function renderMapPins(incidents) {
  const pinsGroup = document.getElementById('mapPins');
  if (!pinsGroup) return;

  const bounds = { latMin: 0.27, latMax: 0.42, lngMin: 32.54, lngMax: 32.66 };
  const svgW = 480, svgH = 280;

  const colorMap = {
    fire: '#DC2626', medical: '#DC2626', police: '#2563EB', disaster: '#D97706',
  };
  const statusOpacity = { pending: '1', dispatched: '0.7', resolved: '0.35' };

  pinsGroup.innerHTML = incidents.map((inc) => {
    const x = ((inc.coords.lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * svgW;
    const y = svgH - ((inc.coords.lat - bounds.latMin) / (bounds.latMax - bounds.latMin)) * svgH;
    const color   = colorMap[inc.type]  || '#475569';
    const opacity = statusOpacity[inc.status] || '1';
    const label   = inc._id.slice(-4).toUpperCase(); // short ID label on map

    return `
      <g opacity="${opacity}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8"
          fill="${color}" stroke="white" stroke-width="2" />
        <text x="${(x + 12).toFixed(1)}" y="${(y + 4).toFixed(1)}"
          font-size="9" fill="#334155" font-family="DM Mono">${label}</text>
      </g>
    `;
  }).join('');
}

/* ── Utilities ── */
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updateAgencyStatus(elId, status) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className   = `agency-status ${status}`;
  el.textContent = capitalise(status);
}

function capitalise(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTimeAgo(isoString) {
  if (!isoString) return '—';
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
