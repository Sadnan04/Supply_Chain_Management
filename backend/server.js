const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, "..");
const FRONTEND = path.join(ROOT, "frontend");
const DB_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DB_DIR, "demand-data.json");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function ensureDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ DemandData: [], nextId: 1 }, null, 2));
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

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

function movingAverageForecast(history, horizon = 7, window = 3) {
  const values = history.map((row) => Number(row.demand));
  const predictions = [];
  const series = [...values];
  for (let i = 0; i < horizon; i += 1) {
    const start = Math.max(0, series.length - window);
    const slice = series.slice(start);
    const avg = slice.reduce((a, b) => a + b, 0) / (slice.length || 1);
    const predicted = Number(avg.toFixed(2));
    series.push(predicted);
    predictions.push(predicted);
  }
  return predictions;
}

function parseCsvText(csvText) {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idxDate = headers.indexOf("date");
  const idxProduct = headers.indexOf("product_id");
  const idxDemand = headers.indexOf("demand");
  const idxCategory = headers.indexOf("category");
  if (idxDate === -1 || idxProduct === -1 || idxDemand === -1) throw new Error("CSV must include: date, product_id, demand");

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    return {
      product_id: cols[idxProduct],
      date: cols[idxDate],
      demand: Number(cols[idxDemand]),
      category: idxCategory !== -1 ? cols[idxCategory] : "",
    };
  }).filter((row) => row.product_id && row.date && Number.isFinite(row.demand));
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return send(res, 400, "Bad request");
  const urlPath = req.url.split("?")[0];

  if (urlPath === "/api/health") return sendJson(res, 200, { ok: true });

  if (req.method === "GET" && urlPath === "/demand-data") {
    const db = readDb();
    const rows = [...db.DemandData].sort((a, b) => a.date.localeCompare(b.date));
    return sendJson(res, 200, { rows });
  }

  if (req.method === "POST" && urlPath === "/add-demand") {
    try {
      const body = await readJsonBody(req);
      if (!body.product_id || !body.date || !Number.isFinite(Number(body.demand))) {
        return sendJson(res, 400, { error: "product_id, date, demand are required" });
      }
      const db = readDb();
      const row = {
        id: db.nextId,
        product_id: String(body.product_id),
        date: String(body.date),
        demand: Number(body.demand),
        category: body.category ? String(body.category) : "",
        created_at: new Date().toISOString(),
      };
      db.nextId += 1;
      db.DemandData.push(row);
      writeDb(db);
      return sendJson(res, 201, { success: true, row });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.method === "POST" && urlPath === "/upload-csv") {
    try {
      const body = await readJsonBody(req);
      if (!body.csvText || typeof body.csvText !== "string") return sendJson(res, 400, { error: "csvText is required" });
      const parsedRows = parseCsvText(body.csvText);
      const db = readDb();
      const created = parsedRows.map((row) => {
        const inserted = { id: db.nextId, product_id: row.product_id, date: row.date, demand: Number(row.demand), category: row.category || "", created_at: new Date().toISOString() };
        db.nextId += 1;
        db.DemandData.push(inserted);
        return inserted;
      });
      writeDb(db);
      return sendJson(res, 201, { success: true, inserted: created.length });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.method === "POST" && urlPath === "/forecast") {
    try {
      const body = await readJsonBody(req);
      const productId = String(body.product_id || "");
      const startDate = String(body.start_date || "");
      const endDate = String(body.end_date || "");
      if (!productId) return sendJson(res, 400, { error: "product_id is required" });

      const db = readDb();
      const historical = db.DemandData
        .filter((row) => row.product_id === productId)
        .filter((row) => (!startDate || row.date >= startDate) && (!endDate || row.date <= endDate))
        .sort((a, b) => a.date.localeCompare(b.date));

      if (historical.length === 0) return sendJson(res, 200, { historical: [], predictions: [] });

      const horizon = Number(body.horizon || 7);
      const predictedValues = movingAverageForecast(historical, horizon, 3);
      const lastDate = new Date(historical[historical.length - 1].date);
      const predictions = predictedValues.map((value, idx) => {
        const d = new Date(lastDate);
        d.setDate(d.getDate() + idx + 1);
        return { date: d.toISOString().slice(0, 10), demand: value };
      });

      return sendJson(res, 200, { historical, predictions });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
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
  ensureDb();
  console.log(`Server running at http://localhost:${PORT}`);
});
