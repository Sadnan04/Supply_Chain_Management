const http = require("http");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { query, withTx } = require("./db");

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, "..");
const FRONTEND = path.join(ROOT, "frontend");
const DEFAULT_ADMIN_EMAIL = String(process.env.DEFAULT_ADMIN_EMAIL || "admin@inventoryguy.com").toLowerCase();
const DEFAULT_ADMIN_PASSWORD = String(process.env.DEFAULT_ADMIN_PASSWORD || "password123");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

// NOTE: Legacy JSON DB has been replaced by MySQL. Use `backend/schema.sql` to initialize.

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), mime[".json"]);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 2_000_000) reject(new Error("Payload too large"));
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function ensureDefaultAdminUser() {
  const existing = await query(
    `SELECT user_id FROM users WHERE email = :email LIMIT 1`,
    { email: DEFAULT_ADMIN_EMAIL },
  );
  if (existing.length) return;
  const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
  await query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ('System Admin', :email, :hash, 'admin', 1)`,
    { email: DEFAULT_ADMIN_EMAIL, hash },
  );
  console.log(`[auth] seeded default admin user: ${DEFAULT_ADMIN_EMAIL}`);
}

function csvSplitLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => String(s).trim());
}

function parseDemandCsv(csvText) {
  const text = String(csvText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = csvSplitLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const idxDate = headers.indexOf("date");
  const idxProduct = headers.indexOf("product_id");
  const idxDemand = headers.indexOf("demand");
  if (idxDate === -1 || idxProduct === -1 || idxDemand === -1) throw new Error("CSV must include: date, product_id, demand");
  return lines
    .slice(1)
    .map((line) => {
      const cols = csvSplitLine(line);
      return {
        product_id: String(cols[idxProduct] || "").trim(),
        occurred_at: String(cols[idxDate] || "").trim(),
        quantity: Number(cols[idxDemand] || 0),
      };
    })
    .filter((r) => r.product_id && r.occurred_at && Number.isFinite(r.quantity));
}

async function recalcReorderPointsForSkus(conn, productIds) {
  // Reorder point (simple, explainable formula):
  // avg_daily_demand * lead_time_days + safety_stock
  // safety_stock = z * stddev_daily_demand * sqrt(lead_time_days)
  if (!productIds.length) return;
  const placeholders = productIds.map((_, i) => `:p${i}`).join(",");
  const params = Object.fromEntries(productIds.map((p, i) => [`p${i}`, p]));
  const products = await conn.execute(
    `SELECT product_id, lead_time_days, service_level_z
     FROM products
     WHERE product_id IN (${placeholders})`,
    params,
  ).then(([rows]) => rows);

  for (const p of products) {
    const stats = await conn.execute(
      `SELECT
          AVG(daily_qty) AS avg_daily,
          STDDEV_POP(daily_qty) AS std_daily
       FROM (
          SELECT DATE(occurred_at) AS d, SUM(quantity) AS daily_qty
          FROM demand_history
          WHERE product_id = :pid AND occurred_at >= (UTC_TIMESTAMP() - INTERVAL 90 DAY)
          GROUP BY DATE(occurred_at)
       ) t`,
      { pid: p.product_id },
    ).then(([rows]) => rows[0] || { avg_daily: 0, std_daily: 0 });

    const avgDaily = Number(stats.avg_daily || 0);
    const stdDaily = Number(stats.std_daily || 0);
    const lead = Math.max(1, Number(p.lead_time_days || 7));
    const z = Number(p.service_level_z || 1.645);

    const safety = Math.max(0, Math.round(z * stdDaily * Math.sqrt(lead)));
    const rop = Math.max(0, Math.round(avgDaily * lead + safety));

    await conn.execute(
      `UPDATE products
       SET safety_stock = :safety, reorder_point = :rop
       WHERE product_id = :pid`,
      { safety, rop, pid: p.product_id },
    );
  }
}

async function anomalyCheckAndAlert(conn, productId, occurredAt, qty) {
  // Compare actual sale to forecast (if exists) for that SKU/day.
  // If deviation exceeds max(3*sqrt(yhat), 10) -> create warning/critical alert.
  const day = String(occurredAt).slice(0, 10);
  const f = await conn.execute(
    `SELECT yhat, yhat_lower, yhat_upper
     FROM forecasts
     WHERE product_id = :pid AND forecast_date = :d
     ORDER BY created_at DESC
     LIMIT 1`,
    { pid: productId, d: day },
  ).then(([rows]) => rows[0]);
  if (!f) return;

  const yhat = Number(f.yhat || 0);
  const actual = Number(qty || 0);
  const deviation = Math.abs(actual - yhat);
  const threshold = Math.max(10, Math.round(3 * Math.sqrt(Math.max(1, yhat))));
  if (deviation < threshold) return;

  const severity = deviation >= threshold * 2 ? "critical" : "warning";
  await conn.execute(
    `INSERT INTO alerts (product_id, severity, title, message, payload_json)
     VALUES (:pid, :sev, :title, :msg, JSON_OBJECT('date', :d, 'actual', :a, 'yhat', :y, 'deviation', :dev, 'threshold', :thr))`,
    {
      pid: productId,
      sev: severity,
      title: `Anomaly detected for ${productId}`,
      msg: `Sale quantity ${actual} deviates from forecast ${yhat} (threshold ${threshold}) on ${day}.`,
      d: day,
      a: actual,
      y: yhat,
      dev: deviation,
      thr: threshold,
    },
  );
}

async function updateSalesVelocityAndDos(conn, productIds) {
  if (!productIds.length) return;
  for (const pid of productIds) {
    const stats = await conn.execute(
      `SELECT AVG(daily_qty) AS avg_daily
       FROM (
          SELECT DATE(occurred_at) AS d, SUM(quantity) AS daily_qty
          FROM demand_history
          WHERE product_id = :pid AND occurred_at >= (UTC_TIMESTAMP() - INTERVAL 30 DAY)
          GROUP BY DATE(occurred_at)
       ) t`,
      { pid },
    ).then(([rows]) => rows[0] || { avg_daily: 0 });
    const avgDaily = Number(stats.avg_daily || 0);
    await conn.execute(
      `UPDATE products
       SET sales_velocity = :v,
           days_of_supply = CASE WHEN :v > 0 THEN (current_stock / :v) ELSE 0 END
       WHERE product_id = :pid`,
      { pid, v: avgDaily, },
    );
  }
}

async function resolveOutOfStockAlertsIfRecovered(conn, productIds) {
  if (!productIds.length) return;
  for (const pid of productIds) {
    const p = await conn.execute(
      `SELECT current_stock, safety_stock
       FROM products
       WHERE product_id = :pid`,
      { pid },
    ).then(([rows]) => rows[0]);
    if (!p) continue;
    if (Number(p.current_stock) > Math.max(0, Number(p.safety_stock))) {
      await conn.execute(
        `UPDATE alerts
         SET status='resolved'
         WHERE status='open'
           AND product_id=:pid
           AND title IN ('Low stock','Out of stock')`,
        { pid },
      );
    }
  }
}

async function checkSocialTrendingAndAlert(conn, productId) {
  // Compare last 48h window to previous 48h window: if +30% => Trending alert.
  const latest = await conn.execute(
    `SELECT SUM(mentions) AS m
     FROM social_mentions
     WHERE product_id = :pid
       AND window_end >= (UTC_TIMESTAMP() - INTERVAL 48 HOUR)`,
    { pid: productId },
  ).then(([rows]) => rows[0]);
  const prev = await conn.execute(
    `SELECT SUM(mentions) AS m
     FROM social_mentions
     WHERE product_id = :pid
       AND window_end < (UTC_TIMESTAMP() - INTERVAL 48 HOUR)
       AND window_end >= (UTC_TIMESTAMP() - INTERVAL 96 HOUR)`,
    { pid: productId },
  ).then(([rows]) => rows[0]);

  const m1 = Number(latest?.m || 0);
  const m0 = Number(prev?.m || 0);
  if (m0 <= 0) return;
  const pct = ((m1 - m0) / m0) * 100;
  if (pct < 30) return;

  // de-dupe within 24h
  const existing = await conn.execute(
    `SELECT alert_id FROM alerts
     WHERE status='open'
       AND product_id=:pid
       AND title='Trending Alert'
       AND created_at >= (UTC_TIMESTAMP() - INTERVAL 24 HOUR)
     LIMIT 1`,
    { pid: productId },
  ).then(([rows]) => rows[0]);
  if (existing) return;

  await conn.execute(
    `INSERT INTO alerts (product_id, severity, title, message, payload_json)
     VALUES (:pid, 'info', 'Trending Alert',
       :msg,
       JSON_OBJECT('mentions_last_48h', :m1, 'mentions_prev_48h', :m0, 'pct_change', :pct)
     )`,
    {
      pid: productId,
      msg: `Social mentions increased ${pct.toFixed(1)}% in 48 hours. Consider pre-emptive restocking.`,
      m1,
      m0,
      pct,
    },
  );

  // Optional: add a forecast adjustment boost (small, conservative)
  const today = new Date().toISOString().slice(0, 10);
  await conn.execute(
    `INSERT INTO forecast_adjustments (product_id, factor, reason, starts_on, ends_on, meta_json)
     VALUES (:pid, 1.1000, 'social_trend', :s, DATE_ADD(:s, INTERVAL 14 DAY), JSON_OBJECT('pct_change', :pct))`,
    { pid: productId, s: today, pct },
  );
}

async function applyCompetitorPriceSensitivity(conn, productId, competitorPrice, userPrice) {
  // If competitor < user price => forecast factor 0.85 for next 14 days + alert.
  if (!(Number.isFinite(competitorPrice) && Number.isFinite(userPrice))) return;
  if (competitorPrice >= userPrice) return;

  const existing = await conn.execute(
    `SELECT alert_id FROM alerts
     WHERE status='open'
       AND product_id=:pid
       AND title='Competitor Price Drop'
       AND created_at >= (UTC_TIMESTAMP() - INTERVAL 24 HOUR)
     LIMIT 1`,
    { pid: productId },
  ).then(([rows]) => rows[0]);

  if (!existing) {
    await conn.execute(
      `INSERT INTO alerts (product_id, severity, title, message, payload_json)
       VALUES (:pid, 'warning', 'Competitor Price Drop', :msg,
         JSON_OBJECT('competitor_price', :cp, 'user_price', :up, 'forecast_factor', 0.85)
       )`,
      {
        pid: productId,
        msg: `Competitor price (${competitorPrice}) is below your price (${userPrice}). Forecast will be adjusted down by 15%.`,
        cp: competitorPrice,
        up: userPrice,
      },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  await conn.execute(
    `INSERT INTO forecast_adjustments (product_id, factor, reason, starts_on, ends_on, meta_json)
     VALUES (:pid, 0.8500, 'competitor_price_drop', :s, DATE_ADD(:s, INTERVAL 14 DAY),
       JSON_OBJECT('competitor_price', :cp, 'user_price', :up)
     )`,
    { pid: productId, s: today, cp: competitorPrice, up: userPrice },
  );
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return send(res, 400, "Bad request");
  const urlPath = req.url.split("?")[0];

  if (urlPath === "/api/health") return sendJson(res, 200, { ok: true });

  // Backend-validated login (credentials stored as password hash in DB)
  if (req.method === "POST" && urlPath === "/api/auth/login") {
    try {
      const body = await readJsonBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!email || !password) {
        return sendJson(res, 400, { ok: false, error: "Email and password are required" });
      }

      const users = await query(
        `SELECT user_id, full_name, email, password_hash, role, is_active
         FROM users
         WHERE email = :email
         LIMIT 1`,
        { email },
      );
      const user = users[0];
      if (!user || Number(user.is_active) !== 1) {
        return sendJson(res, 401, { ok: false, error: "Invalid email or password" });
      }

      const passOk = await bcrypt.compare(password, String(user.password_hash || ""));
      if (!passOk) {
        return sendJson(res, 401, { ok: false, error: "Invalid email or password" });
      }

      await query(
        `UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE user_id = :id`,
        { id: user.user_id },
      );

      return sendJson(res, 200, {
        ok: true,
        user: {
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e.message });
    }
  }

  // Products (read)
  if (req.method === "GET" && urlPath === "/api/products") {
    const rows = await query(
      `SELECT product_id, name, category, unit_price, current_stock, lead_time_days, safety_stock, reorder_point
       FROM products
       ORDER BY updated_at DESC`,
    );
    return sendJson(res, 200, { rows });
  }

  // Add new product (Interconnection map: creates row + sets default safety stock)
  if (req.method === "POST" && urlPath === "/api/products") {
    try {
      const body = await readJsonBody(req);
      const product_id = String(body.product_id || "").trim();
      const name = String(body.name || "").trim();
      if (!product_id || !name) return sendJson(res, 400, { error: "product_id and name are required" });
      const category = body.category ? String(body.category) : null;
      const unit_price = Number(body.unit_price || 0);
      const current_stock = Number(body.current_stock || 0);
      const lead_time_days = Math.max(1, Number(body.lead_time_days || 7));

      await withTx(async (conn) => {
        await conn.execute(
          `INSERT INTO products (product_id, name, category, unit_price, current_stock, lead_time_days, safety_stock, reorder_point)
           VALUES (:pid, :name, :cat, :price, :stock, :lead, 0, 0)
           ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), unit_price=VALUES(unit_price), current_stock=VALUES(current_stock), lead_time_days=VALUES(lead_time_days)`,
          { pid: product_id, name, cat: category, price: unit_price, stock: current_stock, lead: lead_time_days },
        );
        await recalcReorderPointsForSkus(conn, [product_id]);
      });

      return sendJson(res, 201, { success: true });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // Bulk upsert products from CSV upload (inventory updates) + recalc reorder point for affected SKUs
  if (req.method === "POST" && urlPath === "/api/products/bulk-upsert") {
    try {
      const body = await readJsonBody(req);
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) return sendJson(res, 400, { error: "rows[] is required" });

      const affected = new Set();
      await withTx(async (conn) => {
        for (const r of rows) {
          const pid = String(r.product_id || r.sku || "").trim();
          const name = String(r.name || "").trim();
          if (!pid || !name) continue;
          const category = r.category ? String(r.category) : null;
          const unit_price = Number(r.unit_price || r.price || 0);
          const stock = Number(r.current_stock ?? r.stock ?? 0);
          const lead = Math.max(1, Number(r.lead_time_days || 7));

          await conn.execute(
            `INSERT INTO products (product_id, name, category, unit_price, current_stock, lead_time_days)
             VALUES (:pid, :name, :cat, :price, :stock, :lead)
             ON DUPLICATE KEY UPDATE
               name=VALUES(name),
               category=VALUES(category),
               unit_price=VALUES(unit_price),
               current_stock=VALUES(current_stock),
               lead_time_days=VALUES(lead_time_days)`,
            { pid, name, cat: category, price: unit_price, stock: stock, lead },
          );
          affected.add(pid);
        }
        await recalcReorderPointsForSkus(conn, [...affected]);
      });

      return sendJson(res, 200, { success: true, affected: [...affected] });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // Manual Sale entry (Ripple effect)
  // - subtract from current_stock
  // - insert into demand_history
  // - anomaly check vs forecast -> alerts
  if (req.method === "POST" && urlPath === "/api/sales/manual") {
    try {
      const body = await readJsonBody(req);
      const product_id = String(body.product_id || "").trim();
      const quantity = Number(body.quantity || 0);
      const occurred_at = String(body.occurred_at || new Date().toISOString()).slice(0, 19).replace("T", " ");
      if (!product_id || !Number.isFinite(quantity) || quantity <= 0) return sendJson(res, 400, { error: "product_id and quantity>0 are required" });

      await withTx(async (conn) => {
        // subtract stock (prevent negative via clamp)
        await conn.execute(
          `UPDATE products
           SET current_stock = GREATEST(0, current_stock - :qty)
           WHERE product_id = :pid`,
          { pid: product_id, qty: quantity },
        );

        await conn.execute(
          `INSERT INTO demand_history (product_id, occurred_at, quantity, source, meta_json)
           VALUES (:pid, :ts, :qty, 'manual_sale', JSON_OBJECT('note', :note))`,
          { pid: product_id, ts: occurred_at, qty: quantity, note: String(body.note || "") },
        );

        await anomalyCheckAndAlert(conn, product_id, occurred_at, quantity);
        await recalcReorderPointsForSkus(conn, [product_id]);
      });

      return sendJson(res, 201, { success: true });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // CSV upload (Demand/Sales history): bulk insert into demand_history + recalc reorder points for touched SKUs
  if (req.method === "POST" && urlPath === "/api/demand/upload-csv") {
    try {
      const body = await readJsonBody(req);
      if (!body.csvText || typeof body.csvText !== "string") return sendJson(res, 400, { error: "csvText is required" });
      const parsed = parseDemandCsv(body.csvText);
      if (!parsed.length) return sendJson(res, 400, { error: "No valid rows parsed" });

      const affected = new Set();
      await withTx(async (conn) => {
        for (const r of parsed) {
          affected.add(r.product_id);
          await conn.execute(
            `INSERT INTO demand_history (product_id, occurred_at, quantity, source)
             VALUES (:pid, :ts, :qty, 'csv_upload')`,
            { pid: r.product_id, ts: r.occurred_at, qty: Number(r.quantity) },
          );
        }
        await recalcReorderPointsForSkus(conn, [...affected]);
      });

      return sendJson(res, 201, { success: true, inserted: parsed.length, affected: [...affected] });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // Forecasts (Restocking reads from this)
  if (req.method === "GET" && urlPath === "/api/forecasts/latest") {
    const product_id = new URL(req.url, "http://localhost").searchParams.get("product_id");
    if (!product_id) return sendJson(res, 400, { error: "product_id is required" });
    const rows = await query(
      `SELECT forecast_date, yhat, yhat_lower, yhat_upper, model_name, run_id, created_at
       FROM forecasts
       WHERE product_id = :pid
       ORDER BY forecast_date ASC`,
      { pid: String(product_id) },
    );
    // Apply latest active adjustment factors (multiplicative)
    const adjustments = await query(
      `SELECT factor, starts_on, ends_on, reason
       FROM forecast_adjustments
       WHERE product_id = :pid
         AND starts_on <= CURDATE()
         AND ends_on >= CURDATE()
       ORDER BY created_at DESC
       LIMIT 5`,
      { pid: String(product_id) },
    );
    const factor = adjustments.length ? Number(adjustments[0].factor || 1) : 1;
    const adjusted = rows.map((r) => ({
      ...r,
      yhat_adjusted: Number(r.yhat) * factor,
      adjustment_factor: factor,
      adjustment_reason: adjustments.length ? adjustments[0].reason : null,
    }));
    return sendJson(res, 200, { rows: adjusted });
  }

  // Alerts segment reads from DB
  if (req.method === "GET" && urlPath === "/api/alerts") {
    const rows = await query(
      `SELECT alert_id, product_id, severity, title, message, status, created_at, payload_json
       FROM alerts
       WHERE status = 'open'
       ORDER BY created_at DESC
       LIMIT 100`,
    );
    return sendJson(res, 200, { rows });
  }

  // Social mentions ingest (FB/IG bridge)
  if (req.method === "POST" && urlPath === "/api/social/mentions") {
    try {
      const body = await readJsonBody(req);
      const product_id = String(body.product_id || "").trim();
      const platform = String(body.platform || "other").toLowerCase();
      const mentions = Number(body.mentions || 0);
      const window_start = String(body.window_start || "").replace("T", " ").slice(0, 19);
      const window_end = String(body.window_end || "").replace("T", " ").slice(0, 19);
      if (!product_id || !Number.isFinite(mentions) || !window_start || !window_end) {
        return sendJson(res, 400, { error: "product_id, mentions, window_start, window_end are required" });
      }
      await withTx(async (conn) => {
        await conn.execute(
          `INSERT INTO social_mentions (product_id, platform, mentions, window_start, window_end, meta_json)
           VALUES (:pid, :plat, :m, :ws, :we, JSON_OBJECT())`,
          { pid: product_id, plat: platform, m: mentions, ws: window_start, we: window_end },
        );
        await checkSocialTrendingAndAlert(conn, product_id);
      });
      return sendJson(res, 201, { success: true });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // Competitor price ingest (scraper bridge)
  if (req.method === "POST" && urlPath === "/api/market/competitor-price") {
    try {
      const body = await readJsonBody(req);
      const product_id = String(body.product_id || "").trim();
      const competitor = String(body.competitor || "competitor").trim();
      const competitor_price = Number(body.competitor_price);
      const user_price = Number(body.user_price);
      const observed_at = String(body.observed_at || new Date().toISOString()).replace("T", " ").slice(0, 19);
      if (!product_id || !Number.isFinite(competitor_price) || !Number.isFinite(user_price)) {
        return sendJson(res, 400, { error: "product_id, competitor_price, user_price are required" });
      }
      await withTx(async (conn) => {
        await conn.execute(
          `INSERT INTO competitor_prices (product_id, competitor, competitor_price, user_price, observed_at, url, meta_json)
           VALUES (:pid, :c, :cp, :up, :ts, :url, JSON_OBJECT())`,
          { pid: product_id, c: competitor, cp: competitor_price, up: user_price, ts: observed_at, url: body.url ? String(body.url) : null },
        );
        await applyCompetitorPriceSensitivity(conn, product_id, competitor_price, user_price);
      });
      return sendJson(res, 201, { success: true });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // Warehouse CSV/rows update loop (Inventory update + DOS + clear OOS alerts)
  if (req.method === "POST" && urlPath === "/api/warehouse/update-stock") {
    try {
      const body = await readJsonBody(req);
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) return sendJson(res, 400, { error: "rows[] is required" });
      const affected = new Set();
      await withTx(async (conn) => {
        for (const r of rows) {
          const pid = String(r.product_id || "").trim();
          const stock = Number(r.current_stock ?? r.stock ?? 0);
          if (!pid || !Number.isFinite(stock)) continue;
          affected.add(pid);
          await conn.execute(
            `UPDATE products SET current_stock=:s WHERE product_id=:pid`,
            { pid, s: Math.max(0, Math.floor(stock)) },
          );
        }
        await updateSalesVelocityAndDos(conn, [...affected]);
        await resolveOutOfStockAlertsIfRecovered(conn, [...affected]);
        await recalcReorderPointsForSkus(conn, [...affected]);
      });
      return sendJson(res, 200, { success: true, affected: [...affected] });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  let reqPath = urlPath;
  if (reqPath === "/") reqPath = "/pages/login.html";
  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(FRONTEND, safePath);
  if (!filePath.startsWith(FRONTEND)) return send(res, 403, "Forbidden");

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, "Not found");
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, mime[ext] || "application/octet-stream");
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  ensureDefaultAdminUser().catch((e) => {
    console.error("[auth] failed to seed default admin user", e.message);
  });
});
