## Backend (Enterprise AI Supply Chain Logic)

This backend targets a **relational MySQL database** (XAMPP-friendly) to support an interconnected AI Supply Chain system.

### 1) Database setup (MySQL)

- **Schema**: `backend/schema.sql`
- **Database**: `supply_chain_ai`

Run the schema in phpMyAdmin or MySQL CLI.

#### Connection env vars

- `DB_HOST` (default `127.0.0.1`)
- `DB_PORT` (default `3306`)
- `DB_USER` (default `root`)
- `DB_PASSWORD` (default empty)
- `DB_NAME` (default `supply_chain_ai`)

### 2) Node backend

Install dependencies (from `backend/`):

```bash
npm install
```

Start API + static frontend server:

```bash
npm run start
```

### 3) System logic (Ripple Effects)

#### Manual Sale → stock decrement + anomaly detection

Endpoint:
- `POST /api/sales/manual`

Behavior:
- subtracts `quantity` from `products.current_stock`
- inserts a row into `demand_history`
- compares against the latest `forecasts` for that SKU/day
- writes an `alerts` row if deviation exceeds threshold
- recomputes `reorder_point` for that SKU

#### CSV upload → bulk upsert + reorder recompute

Products:
- `POST /api/products/bulk-upsert` with `rows[]` (upsert by `product_id`)

Demand history CSV:
- `POST /api/demand/upload-csv` with `{ csvText }`

After import, the backend recalculates `reorder_point` for affected SKUs (last 90 days).

### 4) Forecasting integration (Python Prophet)

Script:
- `backend/forecast_job.py`

Install Python deps:

```bash
pip install -r backend/requirements.txt
```

Run:

```bash
set PRODUCT_ID=WH-001
python backend/forecast_job.py
```

This pulls last 90 days of `demand_history`, forecasts forward, and writes to `forecasts`.

### 5) Automated alerting engine (hourly worker)

Worker:
- `backend/worker.js`

Run:

```bash
npm run worker
```

Every hour it compares `products.current_stock` vs `products.safety_stock` and inserts de-duped alerts into `alerts`.

### 6) UI reads

- Alerts: `GET /api/alerts`
- Forecasts: `GET /api/forecasts/latest?product_id=WH-001`

### Frontend Locations
- HTML pages: `frontend/pages/`
- JavaScript: `frontend/assets/js/`
- CSS: `frontend/assets/css/`
