# UDERS — Uganda Emergency Response System
**Version 2.0 | Express.js + MongoDB backend**

---

## Project Structure

```
emergency-response/
├── backend/                ← Express.js API server
│   ├── index.js            ← Server entry point
│   ├── seed.js             ← Seed agencies (essential for dispatch)
│   ├── clear-db.js         ← Wipe incidents/logs for a clean state
│   ├── .env                ← Environment config
│   ├── models/             ← Mongoose schemas
│   ├── routes/             ← API route handlers
│   └── uploads/            ← Media file storage (auto-created)
│
└── frontend/               ← Static assets (served by Express)
    ├── citizen.html        ← Public reporting app
    ├── dispatch.html       ← Dispatch dashboard
    ├── styles.css          ← Shared stylesheet
    └── app.js              ← Frontend logic
```

---

## Recent Updates & Improvements

- **Reverse Geocoding**: Integrated OpenStreetMap Nominatim API. All new reports now automatically include human-readable addresses (e.g., "Nakawa, Kampala") based on GPS coordinates.
- **Nodemon Integration**: Added `npm run dev` script for an improved developer experience with auto-restarting on file changes.
- **Streamlined Dispatch**: Operators can now dispatch units with a single click in the modal. Selection triggers the action immediately.
- **Portal Decoupling**: 
    - The Citizen page is now strictly for reporting (link to Dispatch removed).
    - The Dispatch portal is strictly for management (citizen reporting link removed).
- **Clean Interface**: Stripped all development requirement tags (`REQ-X`) from the UI and backend logs for a professional look.
- **Improved Feedback**: Added a toast notification system to provide clear confirmation for submissions and dispatch actions.
- **Bug Fixes**: Corrected MongoDB connection string issues and refined form reset logic after successful submissions.

---

## Prerequisites

- **Node.js** v18+
- **MongoDB** running locally on port 27017 (e.g., via Docker: `docker run -d -p 27017:27017 --name mongo mongo`)

---

## How to Run

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
# Check or create .env
cp .env.example .env
```

### 3. Start Developer Server
```bash
npm run dev
```

---

## API Endpoints

| Method | Endpoint                          | Description                       |
|--------|-----------------------------------|-----------------------------------|
| GET    | `/api/incidents`                  | List all incidents                |
| GET    | `/api/incidents/stats`            | Stat card summary                 |
| GET    | `/api/incidents/:id`              | Single incident details           |
| POST   | `/api/incidents`                  | Create incident (with media)      |
| PATCH  | `/api/incidents/:id/dispatch`     | Dispatch agency immediately       |
| PATCH  | `/api/incidents/:id/resolve`      | Mark incident resolved            |
| GET    | `/api/agencies`                   | List available agencies           |
| GET    | `/api/alerts`                     | Live alert log                    |

---

## Architecture

```
citizen.html / dispatch.html
        │
        │  fetch() — RESTful JSON API
        ▼
  Express.js (backend/index.js)
        │
    ────┼───────────────────────────
   Routes (incidents, agencies, alerts)
        │
        ▼
  MongoDB (emergency database)
```
