## Backend Structure

This folder contains a lightweight Node.js backend for the frontend files.

### Files
- `server.js` - static file server for `frontend/` and simple API endpoints:
  - `GET /api/health`
  - `GET /api/bootstrap`

### Run
```bash
node backend/server.js
```

Then open: `http://localhost:3000`

### Frontend Locations
- HTML pages: `frontend/pages/`
- JavaScript: `frontend/assets/js/`
- CSS: `frontend/assets/css/`
