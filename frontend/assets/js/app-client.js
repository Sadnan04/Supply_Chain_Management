const AUTH_KEY = "inventory_auth";
const PRODUCTS_KEY = "inventory_products";
const RESTOCK_KEY = "inventory_restock";
const ALERTS_KEY = "inventory_alerts";
const PROFILE_KEY = "inventory_profile";
const PREFERENCES_KEY = "inventory_preferences";
const DEMAND_KEY = "inventory_demand_rows";
const DEMAND_SEQ_KEY = "inventory_demand_seq";

const defaultProducts = [
  { name: "Wireless Headphones", sku: "WH-001", category: "Electronics", stock: 45, status: "healthy", price: 129.99 },
  { name: "Smart Watch", sku: "SW-002", category: "Electronics", stock: 12, status: "low", price: 199.99 },
  { name: "USB-C Cable", sku: "UC-003", category: "Accessories", stock: 150, status: "overstock", price: 19.99 },
  { name: "Laptop Stand", sku: "LS-004", category: "Accessories", stock: 8, status: "critical", price: 49.99 },
];
const defaultRestock = [
  { product: "Laptop Stand", currentMin: "8/10", predicted: 35, recommended: 50, cost: 2499 },
  { product: "Smart Watch", currentMin: "12/15", predicted: 45, recommended: 60, cost: 11999 },
];
const defaultAlerts = [
  { title: "Laptop Stand", message: "Critical stock level - 8 units remaining", severity: "critical" },
  { title: "Smart Watch", message: "Low stock alert - 12 units in inventory", severity: "warning" },
  { title: "USB-C Cable", message: "Overstock situation - 150 units available", severity: "info" },
];
const defaultProfile = {
  fullName: "Dewmi",
  email: "inventoryguy@gmail.com",
  businessName: "Dewmi's Retail Store",
  phone: "+88 017*******5",
};
const defaultPreferences = {
  industry: "Retail",
  timezone: "GMT+6",
  currency: "USD ($)",
  dateFormat: "MM/DD/YYYY",
};
const defaultDemandRows = [
  { id: 1, product_id: "WH-001", date: "2026-04-01", demand: 28, category: "Electronics", created_at: "2026-04-01T10:00:00.000Z" },
  { id: 2, product_id: "WH-001", date: "2026-04-08", demand: 31, category: "Electronics", created_at: "2026-04-08T10:00:00.000Z" },
  { id: 3, product_id: "WH-001", date: "2026-04-15", demand: 35, category: "Electronics", created_at: "2026-04-15T10:00:00.000Z" },
  { id: 4, product_id: "SW-002", date: "2026-04-01", demand: 18, category: "Electronics", created_at: "2026-04-01T10:00:00.000Z" },
  { id: 5, product_id: "SW-002", date: "2026-04-08", demand: 22, category: "Electronics", created_at: "2026-04-08T10:00:00.000Z" },
  { id: 6, product_id: "UC-003", date: "2026-04-01", demand: 60, category: "Accessories", created_at: "2026-04-01T10:00:00.000Z" },
  { id: 7, product_id: "UC-003", date: "2026-04-08", demand: 55, category: "Accessories", created_at: "2026-04-08T10:00:00.000Z" },
  { id: 8, product_id: "LS-004", date: "2026-04-01", demand: 12, category: "Accessories", created_at: "2026-04-01T10:00:00.000Z" },
];

function getStore(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureStoreDefaults() {
  if (!localStorage.getItem(PRODUCTS_KEY)) setStore(PRODUCTS_KEY, defaultProducts);
  if (!localStorage.getItem(RESTOCK_KEY)) setStore(RESTOCK_KEY, defaultRestock);
  if (!localStorage.getItem(ALERTS_KEY)) setStore(ALERTS_KEY, defaultAlerts);
  if (!localStorage.getItem(PROFILE_KEY)) setStore(PROFILE_KEY, defaultProfile);
  if (!localStorage.getItem(PREFERENCES_KEY)) setStore(PREFERENCES_KEY, defaultPreferences);
  if (!localStorage.getItem(DEMAND_KEY)) setStore(DEMAND_KEY, defaultDemandRows);
  if (!localStorage.getItem(DEMAND_SEQ_KEY)) localStorage.setItem(DEMAND_SEQ_KEY, "9");
}

function getProducts() {
  return getStore(PRODUCTS_KEY, defaultProducts);
}

function getRestocks() {
  return getStore(RESTOCK_KEY, defaultRestock);
}

function getAlerts() {
  return getStore(ALERTS_KEY, defaultAlerts);
}

function getProfile() {
  return getStore(PROFILE_KEY, defaultProfile);
}

function getPreferences() {
  return getStore(PREFERENCES_KEY, defaultPreferences);
}

function getDemandRows() {
  return getStore(DEMAND_KEY, defaultDemandRows);
}

function setDemandRows(rows) {
  setStore(DEMAND_KEY, rows);
}

function nextDemandId() {
  const raw = localStorage.getItem(DEMAND_SEQ_KEY);
  const current = Number(raw || 1);
  const next = Number.isFinite(current) ? current : 1;
  localStorage.setItem(DEMAND_SEQ_KEY, String(next + 1));
  return next;
}

function normalizeDateString(value) {
  // expected input: YYYY-MM-DD from <input type="date"> or CSV
  const v = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const parsed = new Date(v);
  if (Number.isNaN(parsed.getTime())) return "";
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseCsvText(csvText) {
  const text = String(csvText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return [];
  const lines = text.split("\n").filter(Boolean);
  if (lines.length === 0) return [];

  const splitLine = (line) => {
    // minimal CSV splitter (handles quotes)
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
  };

  const header = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const startIndex = header.includes("date") && header.includes("product_id") && header.includes("demand") ? 1 : 0;

  const getIdx = (name, fallbackIdx) => {
    const idx = header.indexOf(name);
    return idx === -1 ? fallbackIdx : idx;
  };

  const dateIdx = getIdx("date", 0);
  const productIdx = getIdx("product_id", 1);
  const demandIdx = getIdx("demand", 2);
  const categoryIdx = header.indexOf("category");

  const rows = [];
  for (let i = startIndex; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const date = normalizeDateString(cols[dateIdx]);
    const product_id = String(cols[productIdx] || "").trim();
    const demand = Number(cols[demandIdx] || 0);
    if (!date || !product_id || !Number.isFinite(demand)) continue;
    rows.push({
      id: nextDemandId(),
      product_id,
      date,
      demand,
      category: categoryIdx === -1 ? "" : String(cols[categoryIdx] || "").trim(),
      created_at: new Date().toISOString(),
    });
  }
  return rows;
}

function calculateProductStatus(stock) {
  if (stock <= 10) return "critical";
  if (stock <= 20) return "low";
  if (stock >= 100) return "overstock";
  return "healthy";
}

function forceLogout() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  window.location.replace("./login.html");
}

function setupAuth() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  if (page !== "login.html" && localStorage.getItem(AUTH_KEY) !== "true") {
    window.location.replace("./login.html");
    return false;
  }
  if (page === "login.html") {
    const form = document.getElementById("login-form");
    if (!form) return false;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      localStorage.setItem(AUTH_KEY, "true");
      window.location.replace("./index.html");
    });
    return false;
  }
  document.querySelectorAll(".logout-btn").forEach((button) => button.addEventListener("click", forceLogout));
  return true;
}

function badge(status) {
  return `<span class="pill">${status}</span>`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function formatMoney(amount) {
  return `Tk ${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function renderSharedHeader() {
  const profile = getProfile();
  document.querySelectorAll(".user strong").forEach((el) => {
    el.textContent = profile.fullName;
  });
}

function renderDashboardCards() {
  const products = getProducts();
  const alerts = getAlerts();
  const totalProducts = products.length;
  const lowStock = products.filter((p) => ["low", "critical"].includes(p.status)).length;
  const inventoryValue = products.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.stock || 0), 0);
  const topProducts = [...products].sort((a, b) => Number(b.stock) - Number(a.stock)).slice(0, 5);

  setText("dashboard-total-products", totalProducts);
  setText("dashboard-inventory-value", formatMoney(inventoryValue));
  setText("dashboard-low-stock", lowStock);
  setText("dashboard-forecast-accuracy", `${Math.max(80, 100 - lowStock)}%`);

  const topList = document.getElementById("dashboard-top-products");
  if (topList) {
    topList.innerHTML = topProducts
      .map(
        (p) =>
          `<div class="row"><span>${p.name}</span><span class="pill">${p.status}</span></div>`,
      )
      .join("");
  }

  const recentAlerts = document.getElementById("dashboard-recent-alerts");
  if (recentAlerts) {
    recentAlerts.innerHTML = alerts
      .slice(0, 3)
      .map(
        (a) =>
          `<div class="status-panel bg-blue"><div class="row"><strong>${a.title} - ${a.message}</strong><span class="pill">${a.severity}</span></div></div>`,
      )
      .join("");
  }
}

function renderInventoryMetrics(products) {
  const healthy = products.filter((p) => p.status === "healthy").length;
  const low = products.filter((p) => p.status === "low").length;
  const critical = products.filter((p) => p.status === "critical").length;
  const total = products.length || 0;
  setText("metric-total-products", `${total}/${total}`);
  setText("metric-healthy-stock", `${healthy}/${total}`);
  setText("metric-low-stock", `${low}/${total}`);
  setText("metric-critical-stock", `${critical}/${total}`);
}

function initInventoryCrud() {
  const body = document.getElementById("inventory-body");
  if (!body) return;
  const render = () => {
    const products = getProducts();
    body.innerHTML = products
      .map(
        (p, i) =>
          `<tr><td>${p.name}</td><td>${p.sku}</td><td>${p.category}</td><td>${p.stock}</td><td>${badge(p.status)}</td><td class="actions-cell"><button class="mini-btn" data-edit="${i}">✎ Edit</button><button class="mini-btn danger" data-del="${i}">✕ Delete</button></td></tr>`,
      )
      .join("");
    renderInventoryMetrics(products);
  };
  document.getElementById("add-product-btn")?.addEventListener("click", () => {
    const name = prompt("Product name:");
    if (!name) return;
    const stock = Number(prompt("Stock:", "0") || 0);
    const next = [
      ...getProducts(),
      {
        name,
        sku: prompt("SKU:", "NEW-001") || "NEW-001",
        category: prompt("Category:", "General") || "General",
        stock,
        status: calculateProductStatus(stock),
        price: Number(prompt("Unit price:", "0") || 0),
      },
    ];
    setStore(PRODUCTS_KEY, next);
    renderAllSharedData();
  });
  body.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.edit !== undefined) {
      const i = Number(t.dataset.edit);
      const products = getProducts();
      const name = prompt("Product name:", products[i].name);
      if (!name) return;
      const stock = Number(prompt("Stock:", String(products[i].stock)) || products[i].stock);
      products[i] = { ...products[i], name, stock, status: calculateProductStatus(stock) };
      setStore(PRODUCTS_KEY, products);
      renderAllSharedData();
    }
    if (t.dataset.del !== undefined) {
      const products = getProducts();
      products.splice(Number(t.dataset.del), 1);
      setStore(PRODUCTS_KEY, products);
      renderAllSharedData();
    }
  });
  render();
}

function renderRestockMetrics(rows) {
  setText("restock-total-recommendations", rows.length);
  setText(
    "restock-critical-items",
    rows.filter((r) => {
      const parts = String(r.currentMin || "").split("/");
      return Number(parts[0]) <= Number(parts[1] || 0);
    }).length,
  );
  const total = rows.reduce((sum, r) => sum + Number(r.cost || 0), 0);
  setText("restock-total-cost", formatMoney(total));
  setText("restock-selected-cost", formatMoney(total));
}

function initRestockCrud() {
  const body = document.getElementById("restock-body");
  if (!body) return;
  const render = () => {
    const rows = getRestocks();
    body.innerHTML = rows
      .map(
        (r, i) =>
          `<tr><td>${r.product}</td><td>${r.currentMin}</td><td>${r.predicted}</td><td>${r.recommended}</td><td>${formatMoney(r.cost)}</td><td class="actions-cell"><button class="mini-btn" data-edit="${i}">✎ Edit</button><button class="mini-btn danger" data-del="${i}">✕ Delete</button></td></tr>`,
      )
      .join("");
    renderRestockMetrics(rows);
  };
  document.getElementById("add-restock-btn")?.addEventListener("click", () => {
    const product = prompt("Product:");
    if (!product) return;
    const rows = getRestocks();
    rows.push({
      product,
      currentMin: prompt("Current/Min:", "0/10") || "0/10",
      predicted: Number(prompt("Predicted:", "0") || 0),
      recommended: Number(prompt("Recommended:", "0") || 0),
      cost: Number(prompt("Cost:", "0") || 0),
    });
    setStore(RESTOCK_KEY, rows);
    renderAllSharedData();
  });
  body.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.edit !== undefined) {
      const rows = getRestocks();
      const i = Number(t.dataset.edit);
      rows[i].recommended = Number(prompt("Recommended:", String(rows[i].recommended)) || rows[i].recommended);
      setStore(RESTOCK_KEY, rows);
      renderAllSharedData();
    }
    if (t.dataset.del !== undefined) {
      const rows = getRestocks();
      rows.splice(Number(t.dataset.del), 1);
      setStore(RESTOCK_KEY, rows);
      renderAllSharedData();
    }
  });
  render();
}

function renderAlertMetrics(alerts) {
  setText("alerts-active-count", alerts.length);
  setText("alerts-critical-count", alerts.filter((a) => a.severity === "critical").length);
  setText("alerts-warning-count", alerts.filter((a) => a.severity === "warning").length);
  setText("alerts-resolved-count", 0);
}

function initAlertsCrud() {
  const list = document.getElementById("alerts-list");
  if (!list) return;
  const render = () => {
    const alerts = getAlerts();
    list.innerHTML = alerts
      .map(
        (a, i) =>
          `<div class="item"><div class="row"><strong>${a.title}</strong>${badge(a.severity)}</div><div class="sub">${a.message}</div><div class="actions-row"><button class="mini-btn" data-edit="${i}">✎ Edit</button><button class="mini-btn danger" data-del="${i}">✕ Delete</button></div></div>`,
      )
      .join("");
    renderAlertMetrics(alerts);
  };
  document.getElementById("add-alert-btn")?.addEventListener("click", () => {
    const title = prompt("Alert title:");
    if (!title) return;
    const alerts = getAlerts();
    alerts.unshift({
      title,
      message: prompt("Alert message:", "New alert") || "New alert",
      severity: prompt("Severity:", "warning") || "warning",
    });
    setStore(ALERTS_KEY, alerts);
    renderAllSharedData();
  });
  list.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.edit !== undefined) {
      const alerts = getAlerts();
      const i = Number(t.dataset.edit);
      alerts[i].message = prompt("Edit alert message:", alerts[i].message) || alerts[i].message;
      setStore(ALERTS_KEY, alerts);
      renderAllSharedData();
    }
    if (t.dataset.del !== undefined) {
      const alerts = getAlerts();
      alerts.splice(Number(t.dataset.del), 1);
      setStore(ALERTS_KEY, alerts);
      renderAllSharedData();
    }
  });
  render();
}

function initSettingsSync() {
  const form = document.getElementById("settings-profile-form");
  if (form) {
    const profile = getProfile();
    const prefs = getPreferences();
    document.getElementById("settings-full-name").value = profile.fullName || "";
    document.getElementById("settings-email").value = profile.email || "";
    document.getElementById("settings-business-name").value = profile.businessName || "";
    document.getElementById("settings-phone").value = profile.phone || "";
    document.getElementById("settings-industry").value = prefs.industry || "";
    document.getElementById("settings-timezone").value = prefs.timezone || "";

    if (!form.dataset.bound) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        setStore(PROFILE_KEY, {
          fullName: document.getElementById("settings-full-name").value.trim(),
          email: document.getElementById("settings-email").value.trim(),
          businessName: document.getElementById("settings-business-name").value.trim(),
          phone: document.getElementById("settings-phone").value.trim(),
        });
        setStore(PREFERENCES_KEY, {
          ...getPreferences(),
          industry: document.getElementById("settings-industry").value.trim(),
          timezone: document.getElementById("settings-timezone").value.trim(),
        });
        const msg = document.getElementById("settings-save-msg");
        if (msg) msg.textContent = "Settings saved. Shared data updated across all pages.";
        renderAllSharedData();
      });
      form.dataset.bound = "true";
    }
  }

  const profileCard = document.getElementById("settings-profile-summary");
  if (profileCard) {
    const profile = getProfile();
    profileCard.innerHTML = `<div class="item">Full Name: ${profile.fullName}</div><div class="item">Email: ${profile.email}</div><div class="item">Business Name: ${profile.businessName}</div><div class="item">Phone: ${profile.phone}</div>`;
  }
  const businessCard = document.getElementById("settings-business-summary");
  if (businessCard) {
    const prefs = getPreferences();
    businessCard.innerHTML = `<div class="item">Industry: ${prefs.industry}</div><div class="item">Timezone: ${prefs.timezone}</div>`;
  }
}

function renderReportsCards() {
  const products = getProducts();
  const restocks = getRestocks();
  const totalRevenue = products.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.stock || 0), 0);
  const unitsSold = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const avgOrder = unitsSold ? totalRevenue / unitsSold : 0;
  const totalCost = restocks.reduce((sum, r) => sum + Number(r.cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
  setText("reports-total-revenue", formatMoney(totalRevenue));
  setText("reports-units-sold", unitsSold);
  setText("reports-avg-order-value", formatMoney(avgOrder));
  setText("reports-profit-margin", `${Math.max(0, margin).toFixed(1)}%`);
  setText("reports-total-revenue-summary", formatMoney(totalRevenue));
  setText("reports-units-sold-summary", unitsSold);
  setText("reports-total-profit-summary", formatMoney(totalProfit));
}

function renderAllSharedData() {
  renderSharedHeader();
  renderDashboardCards();
  renderReportsCards();
  initSettingsSync();
}

function makeChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === "undefined") return;
  new Chart(canvas, config);
}
function initCharts() {
  makeChart("salesForecastChart", {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        { label: "Actual Sales", data: [4200, 3800, 5100, 4600, 5300, 6100], borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.2)", pointBackgroundColor: "#2563eb", fill: true, tension: 0.4 },
        { label: "AI Forecast", data: [4400, 3900, 5000, 4700, 5200, 5900], borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.18)", pointBackgroundColor: "#10b981", fill: true, tension: 0.4 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
  makeChart("demandForecastChart", {
    type: "line",
    data: {
      labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
      datasets: [
        { label: "Actual", data: [1200, 1360, 1100, 1420, null, null, null, null], borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.2)", pointBackgroundColor: "#7c3aed", spanGaps: true, fill: true },
        { label: "Forecast", data: [1250, 1380, 1140, 1400, 1480, 1620, 1700, 1580], borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.2)", pointBackgroundColor: "#f59e0b", fill: true },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
  makeChart("forecastConfidenceChart", {
    type: "line",
    data: {
      labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
      datasets: [{ label: "Confidence", data: [95, 93, 91, 94, 89, 87, 85, 83], borderColor: "#ec4899", backgroundColor: "rgba(236,72,153,0.18)", pointBackgroundColor: "#ec4899", fill: true }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
  makeChart("revenueProfitChart", {
    type: "line",
    data: {
      labels: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
      datasets: [
        { label: "Revenue", data: [12500, 13700, 16500, 14800, 16000, 18500], borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.2)", pointBackgroundColor: "#2563eb", fill: true },
        { label: "Profit", data: [3800, 4200, 5100, 4400, 4900, 5600], borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.2)", pointBackgroundColor: "#10b981", fill: true },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
  makeChart("unitsSoldChart", {
    type: "line",
    data: {
      labels: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
      datasets: [{ label: "Units", data: [340, 390, 455, 410, 445, 530], borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.2)", pointBackgroundColor: "#f97316", fill: true }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

let forecastChartInstance = null;
let forecastComparisonChartInstance = null;

function renderDemandPreview(rows) {
  const body = document.getElementById("demand-preview-body");
  if (!body) return;
  body.innerHTML = rows.map((row) => `<tr><td>${row.id}</td><td>${row.product_id}</td><td>${row.date}</td><td>${row.demand}</td><td>${row.category || "-"}</td><td>${new Date(row.created_at).toLocaleString()}</td></tr>`).join("");
}

function populateProductSelect(rows) {
  const select = document.getElementById("forecast-product");
  if (!select) return;
  const productIds = [...new Set(rows.map((r) => r.product_id))];
  select.innerHTML = productIds.map((id) => `<option value="${id}">${id}</option>`).join("");
}

function renderForecastChart(historical, predictions) {
  const canvas = document.getElementById("forecast-result-chart");
  if (!canvas || typeof Chart === "undefined") return;
  const labels = [...historical.map((h) => h.date), ...predictions.map((p) => p.date)];
  const historicalData = [...historical.map((h) => Number(h.demand)), ...predictions.map(() => null)];
  const predictionData = [...historical.map(() => null), ...predictions.map((p) => Number(p.demand))];

  if (forecastChartInstance) forecastChartInstance.destroy();
  forecastChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Historical Demand", data: historicalData, borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.2)", pointBackgroundColor: "#2563eb", fill: true, tension: 0.35 },
        { label: "Predicted Demand", data: predictionData, borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.2)", pointBackgroundColor: "#f97316", fill: true, tension: 0.35 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

function renderForecastValues(predictions) {
  const wrap = document.getElementById("forecast-values");
  if (!wrap) return;
  wrap.innerHTML = predictions.map((p) => `<div class="item">Date: <strong>${p.date}</strong> | Predicted Demand: <strong>${p.demand}</strong></div>`).join("");
}

function renderForecastComparisonChart(historical, predictions) {
  const canvas = document.getElementById("forecast-comparison-chart");
  if (!canvas || typeof Chart === "undefined") return;
  const historicalTotal = historical.reduce((sum, row) => sum + Number(row.demand || 0), 0);
  const predictedTotal = predictions.reduce((sum, row) => sum + Number(row.demand || 0), 0);

  if (forecastComparisonChartInstance) forecastComparisonChartInstance.destroy();
  forecastComparisonChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Historical Total", "Predicted Total"],
      datasets: [
        {
          label: "Demand Comparison",
          data: [historicalTotal, predictedTotal],
          backgroundColor: ["rgba(37,99,235,0.7)", "rgba(249,115,22,0.7)"],
          borderColor: ["#2563eb", "#f97316"],
          borderWidth: 1.5,
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

function refreshDemandData() {
  const rows = getDemandRows().slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  renderDemandPreview(rows);
  populateProductSelect(rows);
  return rows;
}

function average(list) {
  if (!list.length) return 0;
  return list.reduce((s, n) => s + Number(n || 0), 0) / list.length;
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function generateForecastFromRows(allRows, productId, startDate, endDate, horizon = 7) {
  const rowsForProduct = allRows
    .filter((r) => r.product_id === productId)
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const within = (r) => {
    const d = String(r.date);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };
  const historical = rowsForProduct.filter(within);

  const tail = historical.slice(-6);
  const base = average(tail.map((r) => Number(r.demand || 0)));
  const trend = tail.length >= 2 ? (Number(tail[tail.length - 1].demand) - Number(tail[0].demand)) / Math.max(1, tail.length - 1) : 0;

  const start = endDate || (historical.length ? historical[historical.length - 1].date : startDate || normalizeDateString(new Date().toISOString()));
  const predictions = Array.from({ length: horizon }).map((_, i) => {
    const demand = Math.max(0, Math.round(base + trend * (i + 1)));
    return { date: addDays(start, i + 1), demand };
  });

  return { historical, predictions };
}

function initDemandForecastingPage() {
  const manualForm = document.getElementById("manual-demand-form");
  if (!manualForm) return;

  refreshDemandData();

  manualForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const msg = document.getElementById("manual-demand-message");
    const product_id = String(document.getElementById("demand-product-id")?.value || "").trim();
    const date = normalizeDateString(document.getElementById("demand-date")?.value);
    const demand = Number(document.getElementById("demand-quantity")?.value || 0);
    const category = String(document.getElementById("demand-category")?.value || "").trim();

    if (!product_id || !date || !Number.isFinite(demand)) {
      if (msg) msg.textContent = "Please provide Product ID, Date and Demand quantity.";
      return;
    }

    const rows = getDemandRows();
    rows.push({
      id: nextDemandId(),
      product_id,
      date,
      demand,
      category,
      created_at: new Date().toISOString(),
    });
    setDemandRows(rows);
    if (msg) msg.textContent = "Demand entry added to preview table.";
    refreshDemandData();
    manualForm.reset();
  });

  document.getElementById("upload-csv-btn")?.addEventListener("click", async () => {
    const fileInput = document.getElementById("demand-csv-file");
    const msg = document.getElementById("csv-upload-message");
    if (!(fileInput instanceof HTMLInputElement) || !fileInput.files || fileInput.files.length === 0) {
      if (msg) msg.textContent = "Please select a CSV file first.";
      return;
    }
    const file = fileInput.files[0];
    const text = await file.text();
    const parsedRows = parseCsvText(text);
    if (parsedRows.length === 0) {
      if (msg) msg.textContent = "No valid rows found. CSV must include: date, product_id, demand.";
      return;
    }
    const rows = [...getDemandRows(), ...parsedRows];
    setDemandRows(rows);
    if (msg) msg.textContent = `CSV uploaded successfully. Inserted rows: ${parsedRows.length}`;
    refreshDemandData();
  });

  document.getElementById("generate-forecast-btn")?.addEventListener("click", async () => {
    const productId = document.getElementById("forecast-product")?.value || "";
    const startDate = document.getElementById("forecast-start-date")?.value || "";
    const endDate = document.getElementById("forecast-end-date")?.value || "";
    const msg = document.getElementById("forecast-message");
    if (!productId) {
      if (msg) msg.textContent = "Pick a Product ID first.";
      return;
    }

    const allRows = refreshDemandData();
    const { historical, predictions } = generateForecastFromRows(allRows, productId, startDate, endDate, 7);

    if (!historical.length) {
      if (msg) msg.textContent = "No historical rows found for this product in the preview table + dummy data.";
      return;
    }

    if (msg) msg.textContent = "";
    renderForecastChart(historical, predictions);
    renderForecastValues(predictions);
    renderForecastComparisonChart(historical, predictions);
  });
}

if (setupAuth()) {
  ensureStoreDefaults();
  initInventoryCrud();
  initRestockCrud();
  initAlertsCrud();
  initCharts();
  initDemandForecastingPage();
  renderAllSharedData();
  window.addEventListener("storage", (event) => {
    if ([PRODUCTS_KEY, RESTOCK_KEY, ALERTS_KEY, PROFILE_KEY, PREFERENCES_KEY].includes(event.key)) {
      window.location.reload();
    }
  });
}
