const AUTH_KEY = "inventory_auth";
const STATIC_ADMIN_EMAIL = "admin@retailguy.com";
const STATIC_ADMIN_PASSWORD = "password123";
const PRODUCTS_KEY = "inventory_products";
const RESTOCK_KEY = "inventory_restock";
const ALERTS_KEY = "inventory_alerts";
const PROFILE_KEY = "inventory_profile";
const PREFERENCES_KEY = "inventory_preferences";
const DEMAND_KEY = "inventory_demand_rows";
const DEMAND_SEQ_KEY = "inventory_demand_seq";
const SUPPLIERS_KEY = "inventory_suppliers";
const ONBOARDING_KEY = "inventory_onboarding";

const APP_CHANNEL = "inventoryguy_ui_sync_v1";

const defaultProducts = [
  { name: "Wireless Headphones", sku: "WH-001", category: "Electronics", stock: 45, minStock: 20, maxStock: 100, price: 129.99 },
  { name: "Smart Watch", sku: "SW-002", category: "Electronics", stock: 12, minStock: 15, maxStock: 50, price: 199.99 },
  { name: "USB-C Cable", sku: "UC-003", category: "Accessories", stock: 150, minStock: 30, maxStock: 80, price: 19.99 },
  { name: "Laptop Stand", sku: "LS-004", category: "Accessories", stock: 0, minStock: 10, maxStock: 40, price: 49.99 },
];
const defaultRestock = [
  { product: "LS-004", currentMin: "0/10", predicted: 35, recommended: 50, cost: 2499 },
  { product: "SW-002", currentMin: "12/15", predicted: 45, recommended: 60, cost: 11999 },
];
const defaultAlerts = [
  { title: "Laptop Stand", message: "Stockout detected - 0 units remaining", severity: "critical" },
  { title: "Smart Watch", message: "Low stock alert - 12 units in inventory", severity: "warning" },
  { title: "USB-C Cable", message: "Overstock situation - 150 units available", severity: "info" },
];
const defaultSuppliers = [];
const defaultOnboarding = { inventoryUploaded: false, suppliersLinked: false, firstForecastGenerated: false };
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

// Cross-page instant sync (no refresh)
let _channel = null;
try {
  _channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(APP_CHANNEL) : null;
} catch {
  _channel = null;
}
function broadcastSync(key) {
  if (!_channel) return;
  try {
    _channel.postMessage({ key, ts: Date.now() });
  } catch {
    // ignore
  }
}

function writeStore(key, value) {
  setStore(key, value);
  broadcastSync(key);
}
if (_channel) {
  _channel.addEventListener("message", () => {
    // Re-render from localStorage state
    renderAllSharedData?.();
    initInventoryCrud?.();
    initRestockCrud?.();
    initDemandForecastingPage?.();
    initSuppliers?.();
  });
}

function ensureStoreDefaults() {
  if (!localStorage.getItem(PRODUCTS_KEY)) setStore(PRODUCTS_KEY, defaultProducts);
  if (!localStorage.getItem(RESTOCK_KEY)) setStore(RESTOCK_KEY, defaultRestock);
  if (!localStorage.getItem(ALERTS_KEY)) setStore(ALERTS_KEY, defaultAlerts);
  if (!localStorage.getItem(PROFILE_KEY)) setStore(PROFILE_KEY, defaultProfile);
  if (!localStorage.getItem(PREFERENCES_KEY)) setStore(PREFERENCES_KEY, defaultPreferences);
  if (!localStorage.getItem(DEMAND_KEY)) setStore(DEMAND_KEY, defaultDemandRows);
  if (!localStorage.getItem(DEMAND_SEQ_KEY)) localStorage.setItem(DEMAND_SEQ_KEY, "9");
  if (!localStorage.getItem(SUPPLIERS_KEY)) setStore(SUPPLIERS_KEY, defaultSuppliers);
  if (!localStorage.getItem(ONBOARDING_KEY)) setStore(ONBOARDING_KEY, defaultOnboarding);
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
  writeStore(DEMAND_KEY, rows);
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
  const s = Number(stock ?? 0);
  if (s <= 0) return "stockout";
  if (s <= 10) return "low";
  if (s >= 100) return "overstock";
  return "healthy";
}

function forceLogout() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  window.location.replace("./login.html");
}

function setupAuth() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const hasSessionAuth = sessionStorage.getItem(AUTH_KEY) === "true";

  // Only an active session is allowed to access protected pages.
  // This blocks direct URL access when credentials were not submitted in this session.
  if (page !== "login.html" && !hasSessionAuth) {
    localStorage.removeItem(AUTH_KEY);
    window.location.replace("./login.html");
    return false;
  }
  if (page === "login.html") {
    // Always require a fresh credential check on login page load.
    // This prevents stale auth values from bypassing login validation.
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);

    const form = document.getElementById("login-form");
    if (!form) return false;
    if (form.dataset.bound === "true") return false;
    form.dataset.bound = "true";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const emailInput =
        document.getElementById("login-email") ||
        form.querySelector('input[type="email"]');
      const passwordInput =
        document.getElementById("login-password") ||
        form.querySelector('input[type="password"]');

      const email = String(emailInput?.value || "").trim().toLowerCase();
      const password = String(passwordInput?.value || "");
      const errorEl = document.getElementById("login-error");
      if (!email || !password) {
        localStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(AUTH_KEY);
        if (errorEl) errorEl.textContent = "Email and password are required.";
        alert("Email and password are required.");
        return;
      }

      try {
        // Static credential mode: allow login without backend/API dependency.
        const isStaticAdmin =
          email === STATIC_ADMIN_EMAIL && password === STATIC_ADMIN_PASSWORD;
        if (!isStaticAdmin) {
          localStorage.removeItem(AUTH_KEY);
          sessionStorage.removeItem(AUTH_KEY);
          const msg = "Invalid email or password. Please try again.";
          if (errorEl) errorEl.textContent = msg;
          alert(msg);
          return;
        }

        localStorage.setItem(AUTH_KEY, "true");
        sessionStorage.setItem(AUTH_KEY, "true");
        if (errorEl) errorEl.textContent = "";
        window.location.replace("./index.html");
      } catch {
        localStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(AUTH_KEY);
        if (errorEl) errorEl.textContent = "Unable to reach auth server.";
        alert("Unable to reach auth server. Please try again.");
      }
    });
    return false;
  }
  document.querySelectorAll(".logout-btn").forEach((button) => button.addEventListener("click", forceLogout));
  return true;
}

function badge(status) {
  const s = String(status || "").toLowerCase();
  const cls =
    s === "stockout" ? "pill pill-stockout" :
    s === "critical" ? "pill pill-critical" :
    s === "low" ? "pill pill-low" :
    s === "healthy" ? "pill pill-healthy" :
    s === "overstock" ? "pill pill-overstock" :
    "pill";
  return `<span class="${cls}">${s || "-"}</span>`;
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

function getOnboarding() {
  return getStore(ONBOARDING_KEY, defaultOnboarding);
}
function setOnboarding(next) {
  writeStore(ONBOARDING_KEY, next);
}
function syncOnboardingFromState() {
  const products = getProducts();
  const suppliers = getStore(SUPPLIERS_KEY, defaultSuppliers);
  const current = getOnboarding();
  const next = {
    ...current,
    inventoryUploaded: products.length > 0,
    suppliersLinked: suppliers.length > 0,
  };
  setStore(ONBOARDING_KEY, next);
}
function renderOnboarding() {
  const card = document.getElementById("onboarding-card");
  if (!card) return;
  syncOnboardingFromState();
  const ob = getOnboarding();
  const done = [ob.inventoryUploaded, ob.suppliersLinked, ob.firstForecastGenerated].filter(Boolean).length;
  const caption = document.getElementById("onboarding-caption");
  if (caption) caption.textContent = `${done}/3 completed`;
  const bar = document.getElementById("onboarding-bar");
  if (bar) bar.style.width = `${Math.round((done / 3) * 100)}%`;
  document.getElementById("step-inventory")?.classList.toggle("done", !!ob.inventoryUploaded);
  document.getElementById("step-suppliers")?.classList.toggle("done", !!ob.suppliersLinked);
  document.getElementById("step-forecast")?.classList.toggle("done", !!ob.firstForecastGenerated);
}

function renderDashboardCards() {
  const products = getProducts();
  const alerts = getAlerts();
  const totalProducts = products.length;
  const lowStock = products.filter((p) => ["low", "stockout"].includes(calculateProductStatus(p.stock))).length;
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
          `<div class="row"><span>${p.name}</span>${badge(calculateProductStatus(p.stock))}</div>`,
      )
      .join("");
  }

  const recentAlerts = document.getElementById("dashboard-recent-alerts");
  if (recentAlerts) {
    recentAlerts.innerHTML = alerts
      .slice(0, 3)
      .map(
        (a) =>
          `<div class="status-panel bg-blue"><div class="row"><strong>${a.title} - ${a.message}</strong>${badge(a.severity)}</div></div>`,
      )
      .join("");
  }

  const criticalWrap = document.getElementById("dashboard-critical-actions");
  if (criticalWrap) {
    const stockouts = products.filter((p) => calculateProductStatus(p.stock) === "stockout");
    const lows = products.filter((p) => calculateProductStatus(p.stock) === "low");
    const recs = getRestocks();
    const actions = [];
    if (stockouts.length) actions.push({ title: `${stockouts.length} items need restocking today`, detail: "Stockouts detected", pill: "stockout", href: "./inventory.html" });
    if (lows.length) actions.push({ title: `${lows.length} items are below minimum`, detail: "Review low-stock list", pill: "low", href: "./inventory.html" });
    if (recs.length) actions.push({ title: `${recs.length} recommendations ready`, detail: "Create orders in Restocking", pill: "info", href: "./restocking.html" });
    if (!actions.length) actions.push({ title: "No critical actions right now", detail: "Inventory looks healthy", pill: "healthy", href: "./reports.html" });

    criticalWrap.innerHTML = actions
      .slice(0, 4)
      .map(
        (a) =>
          `<div class="item"><div class="row"><div class="col"><strong>${a.title}</strong><span class="tiny">${a.detail}</span></div>${badge(a.pill)}</div><div class="row" style="margin-top:10px"><a class="btn btn-dark" href="${a.href}">Take action</a><span class="hint">Live synced</span></div></div>`,
      )
      .join("");
  }
}

function initDashboardInteractions() {
  const modal = document.getElementById("dashboard-modal");
  if (!modal) return;
  if (modal.dataset.bound === "true") return;
  modal.dataset.bound = "true";

  const close = () => closeModal("dashboard-modal");
  document.getElementById("dash-modal-close")?.addEventListener("click", close);
  document.getElementById("dash-modal-ok")?.addEventListener("click", close);

  const openDetails = (type) => {
    const products = getProducts();
    const alerts = getAlerts();
    const title = document.getElementById("dash-modal-title");
    const body = document.getElementById("dash-modal-body");
    if (!title || !body) return;

    if (type === "products") {
      title.textContent = "Products (live)";
      body.innerHTML = products
        .slice(0, 20)
        .map((p) => `<div class="item"><div class="row"><strong>${p.name}</strong>${badge(calculateProductStatus(p.stock))}</div><div class="sub">${p.sku} • Stock ${p.stock} • Min ${p.minStock ?? 10}</div><div class="row" style="margin-top:8px"><a class="btn" href="./inventory.html">Manage</a></div></div>`)
        .join("");
    } else if (type === "value") {
      title.textContent = "Inventory Value (breakdown)";
      const sorted = [...products].sort((a, b) => (Number(b.price) * Number(b.stock)) - (Number(a.price) * Number(a.stock))).slice(0, 20);
      body.innerHTML = sorted
        .map((p) => {
          const v = Number(p.price || 0) * Number(p.stock || 0);
          return `<div class="item"><div class="row"><strong>${p.name}</strong><span class="pill">${formatMoney(v)}</span></div><div class="sub">${p.sku} • ${p.stock} × ${formatMoney(p.price)}</div></div>`;
        })
        .join("");
    } else if (type === "lowstock") {
      title.textContent = "Low stock / Stockouts";
      const lows = products.filter((p) => ["low", "stockout"].includes(calculateProductStatus(p.stock)));
      body.innerHTML = (lows.length ? lows : [{ name: "No low stock items", sku: "-", stock: "-", minStock: "-" }])
        .map((p) => `<div class="item"><div class="row"><strong>${p.name}</strong>${badge(calculateProductStatus(p.stock))}</div><div class="sub">${p.sku} • Stock ${p.stock} • Min ${p.minStock ?? 10}</div><div class="row" style="margin-top:8px"><a class="btn btn-dark" href="./restocking.html">Restock</a></div></div>`)
        .join("");
    } else if (type === "forecast") {
      title.textContent = "Forecast readiness";
      body.innerHTML = `<div class="item"><div class="row"><strong>Forecast pipeline</strong><span class="pill">connected</span></div><div class="sub">Generate forecasts from Demand Forecasting page to improve recommendations.</div><div class="row" style="margin-top:8px"><a class="btn btn-dark" href="./demand-forecasting.html">Open Forecasting</a></div></div>`;
    } else {
      title.textContent = "Details";
      body.innerHTML = `<div class="item">No details available.</div>`;
    }

    openModal("dashboard-modal");
  };

  document.querySelectorAll("[data-card]").forEach((el) => {
    el.addEventListener("click", () => openDetails(el.getAttribute("data-card")));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openDetails(el.getAttribute("data-card"));
    });
  });
}

function renderInventoryMetrics(products) {
  const statuses = products.map((p) => calculateProductStatus(p.stock));
  const healthy = statuses.filter((s) => s === "healthy").length;
  const low = statuses.filter((s) => s === "low").length;
  const stockout = statuses.filter((s) => s === "stockout").length;
  const total = products.length || 0;
  setText("metric-total-products", `${total}/${total}`);
  setText("metric-healthy-stock", `${healthy}/${total}`);
  setText("metric-low-stock", `${low}/${total}`);
  setText("metric-critical-stock", `${stockout}/${total}`);
}

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
}

function initInventoryCrud() {
  const body = document.getElementById("inventory-body");
  if (!body) return;

  const render = () => {
    const products = getProducts();
    body.innerHTML = products
      .map(
        (p, i) =>
          `<tr>
            <td>${p.name}</td>
            <td>${p.sku}</td>
            <td>${p.category || "-"}</td>
            <td>${Number(p.stock ?? 0)}</td>
            <td>${Number(p.minStock ?? 10)}</td>
            <td>${formatMoney(p.price)}</td>
            <td>${badge(calculateProductStatus(p.stock))}</td>
            <td class="actions-cell"><button class="mini-btn" data-edit="${i}">✎ Edit</button><button class="mini-btn danger" data-del="${i}">✕ Delete</button></td>
          </tr>`,
      )
      .join("");
    renderInventoryMetrics(products);
  };

  if (body.dataset.bound === "true") {
    render();
    return;
  }
  body.dataset.bound = "true";

  const modalId = "product-modal";
  const openBtn = document.getElementById("open-add-product");
  const closeBtn = document.getElementById("product-modal-close");
  const cancelBtn = document.getElementById("product-cancel");
  const saveBtn = document.getElementById("product-save");
  const form = document.getElementById("product-form");

  let editingIndex = null;

  function setErr(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg || "";
  }
  function setInvalid(inputId, invalid) {
    const input = document.getElementById(inputId);
    if (input) input.classList.toggle("invalid", !!invalid);
  }
  function readForm() {
    return {
      name: String(document.getElementById("p-name")?.value || "").trim(),
      sku: String(document.getElementById("p-sku")?.value || "").trim().toUpperCase(),
      category: String(document.getElementById("p-category")?.value || "").trim(),
      stock: Number(document.getElementById("p-stock")?.value || 0),
      minStock: Number(document.getElementById("p-min")?.value || 10),
      price: Number(document.getElementById("p-price")?.value || 0),
    };
  }
  function validate(value) {
    const products = getProducts();
    const skuTaken = products.some((p, idx) => p.sku === value.sku && idx !== editingIndex);
    let ok = true;

    if (!value.name || value.name.length < 2) {
      setErr("p-name-err", "Name is required (min 2 chars).");
      setInvalid("p-name", true);
      ok = false;
    } else {
      setErr("p-name-err", "");
      setInvalid("p-name", false);
    }

    if (!value.sku || value.sku.length < 2) {
      setErr("p-sku-err", "SKU is required (min 2 chars).");
      setInvalid("p-sku", true);
      ok = false;
    } else if (skuTaken) {
      setErr("p-sku-err", "SKU must be unique.");
      setInvalid("p-sku", true);
      ok = false;
    } else {
      setErr("p-sku-err", "");
      setInvalid("p-sku", false);
    }

    if (!Number.isFinite(value.stock) || value.stock < 0) {
      setErr("p-stock-err", "Stock must be a number ≥ 0.");
      setInvalid("p-stock", true);
      ok = false;
    } else {
      setErr("p-stock-err", "");
      setInvalid("p-stock", false);
    }

    if (!Number.isFinite(value.minStock) || value.minStock < 0) {
      setErr("p-min-err", "Min stock must be a number ≥ 0.");
      setInvalid("p-min", true);
      ok = false;
    } else {
      setErr("p-min-err", "");
      setInvalid("p-min", false);
    }

    const preview = document.getElementById("p-status-preview");
    if (preview) preview.innerHTML = badge(calculateProductStatus(value.stock));

    return ok;
  }

  openBtn?.addEventListener("click", () => {
    editingIndex = null;
    document.getElementById("product-modal-title").textContent = "Add Product";
    form?.reset();
    ["p-name-err", "p-sku-err", "p-stock-err", "p-min-err"].forEach((id) => setErr(id, ""));
    ["p-name", "p-sku", "p-stock", "p-min"].forEach((id) => setInvalid(id, false));
    openModal(modalId);
    validate(readForm());
  });
  closeBtn?.addEventListener("click", () => closeModal(modalId));
  cancelBtn?.addEventListener("click", () => closeModal(modalId));
  form?.addEventListener("input", () => validate(readForm()));

  saveBtn?.addEventListener("click", () => {
    const value = readForm();
    const msg = document.getElementById("product-form-msg");
    if (!validate(value)) {
      if (msg) msg.textContent = "Fix validation errors to save.";
      return;
    }
    const products = getProducts();
    const next = { ...value, maxStock: Math.max(Number(value.minStock ?? 10) + 1, 100) };
    if (editingIndex === null) products.unshift(next);
    else products[editingIndex] = { ...products[editingIndex], ...next };
    writeStore(PRODUCTS_KEY, products);
    if (msg) msg.textContent = "Saved and synced across modules.";
    closeModal(modalId);
    renderAllSharedData();
    render();
  });

  body.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.edit !== undefined) {
      const i = Number(t.dataset.edit);
      const products = getProducts();
      const p = products[i];
      if (!p) return;
      editingIndex = i;
      document.getElementById("product-modal-title").textContent = "Edit Product";
      document.getElementById("p-name").value = p.name || "";
      document.getElementById("p-sku").value = p.sku || "";
      document.getElementById("p-category").value = p.category || "";
      document.getElementById("p-stock").value = String(Number(p.stock ?? 0));
      document.getElementById("p-min").value = String(Number(p.minStock ?? 10));
      document.getElementById("p-price").value = String(Number(p.price ?? 0));
      openModal(modalId);
      validate(readForm());
    }
    if (t.dataset.del !== undefined) {
      const products = getProducts();
      products.splice(Number(t.dataset.del), 1);
      writeStore(PRODUCTS_KEY, products);
      renderAllSharedData();
      render();
    }
  });

  // Export button (new UI)
  document.getElementById("export-products-btn")?.addEventListener("click", () => {
    const products = getProducts();
    const headers = ["name", "sku", "category", "stock", "minStock", "price"];
    const rows = products.map((p) =>
      [p.name, p.sku, p.category || "", p.stock, p.minStock ?? 10, p.price ?? 0]
        .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-products.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  // CSV drag & drop + mapping (Inventory import)
  const dropzone = document.getElementById("inventory-dropzone");
  const csvInput = document.getElementById("inventory-csv-file");
  const csvStart = document.getElementById("inventory-csv-start");
  const csvMsg = document.getElementById("inventory-csv-msg");

  let pendingImport = null; // { headers: string[], rows: string[][] }

  const splitCsvLine = (line) => {
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

  function parseInventoryCsv(text) {
    const cleaned = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    if (!cleaned) return { headers: [], rows: [] };
    const lines = cleaned.split("\n").filter(Boolean);
    const headers = splitCsvLine(lines[0]);
    const rows = lines.slice(1).map(splitCsvLine).filter((r) => r.some((c) => String(c || "").trim() !== ""));
    return { headers, rows };
  }

  function openMapping(csv) {
    pendingImport = csv;
    const list = document.getElementById("mapping-list");
    const err = document.getElementById("mapping-err");
    if (err) err.textContent = "";
    if (!list) return;

    const fields = [
      { key: "name", label: "Product name", required: true },
      { key: "sku", label: "SKU / Product ID", required: true },
      { key: "category", label: "Category", required: false },
      { key: "stock", label: "Stock", required: true },
      { key: "minStock", label: "Min stock", required: false },
      { key: "price", label: "Unit price", required: false },
    ];
    const options = [`<option value="">— Select header —</option>`]
      .concat(csv.headers.map((h, i) => `<option value="${i}">${h}</option>`))
      .join("");
    list.innerHTML = fields
      .map(
        (f) =>
          `<div class="map-row">
            <div class="input-row"><label>${f.label}${f.required ? " *" : ""}</label><div class="hint">System field: <strong>${f.key}</strong></div></div>
            <div class="input-row"><label>CSV header</label><select class="select" data-map="${f.key}">${options}</select></div>
          </div>`,
      )
      .join("");

    // auto map
    const lower = csv.headers.map((h) => String(h).toLowerCase().replace(/\s+/g, "_"));
    const autoPick = (key, candidates) => {
      const idx = lower.findIndex((h) => candidates.includes(h));
      if (idx === -1) return;
      const sel = list.querySelector(`select[data-map="${key}"]`);
      if (sel) sel.value = String(idx);
    };
    autoPick("name", ["name", "product_name", "product"]);
    autoPick("sku", ["sku", "product_id", "id", "productid"]);
    autoPick("category", ["category", "type"]);
    autoPick("stock", ["stock", "qty", "quantity", "on_hand", "onhand"]);
    autoPick("minStock", ["min", "min_stock", "reorder_point", "reorderpoint"]);
    autoPick("price", ["price", "unit_price", "unitprice", "cost"]);

    const head = document.getElementById("mapping-preview-head");
    const body = document.getElementById("mapping-preview-body");
    if (head) head.innerHTML = `<tr>${csv.headers.slice(0, 8).map((h) => `<th>${h}</th>`).join("")}</tr>`;
    if (body) {
      body.innerHTML = csv.rows
        .slice(0, 5)
        .map((r) => `<tr>${r.slice(0, 8).map((c) => `<td>${String(c || "").slice(0, 40)}</td>`).join("")}</tr>`)
        .join("");
    }

    openModal("mapping-modal");
  }

  async function startMappingFromFile(file) {
    const text = await file.text();
    const parsed = parseInventoryCsv(text);
    if (!parsed.headers.length || !parsed.rows.length) {
      if (csvMsg) csvMsg.textContent = "CSV looks empty. Provide headers + rows.";
      return;
    }
    if (csvMsg) csvMsg.textContent = "";
    openMapping(parsed);
  }

  csvStart?.addEventListener("click", async () => {
    if (!(csvInput instanceof HTMLInputElement) || !csvInput.files || csvInput.files.length === 0) {
      if (csvMsg) csvMsg.textContent = "Choose a CSV file first (or drag & drop one).";
      return;
    }
    await startMappingFromFile(csvInput.files[0]);
  });

  dropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone?.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    await startMappingFromFile(file);
  });

  document.getElementById("mapping-close")?.addEventListener("click", () => closeModal("mapping-modal"));
  document.getElementById("mapping-cancel")?.addEventListener("click", () => closeModal("mapping-modal"));
  document.getElementById("mapping-import")?.addEventListener("click", () => {
    const list = document.getElementById("mapping-list");
    const err = document.getElementById("mapping-err");
    if (!pendingImport || !list) return;
    const mapping = {};
    list.querySelectorAll("select[data-map]").forEach((sel) => {
      const key = sel.getAttribute("data-map");
      mapping[key] = sel.value === "" ? null : Number(sel.value);
    });
    const missing = ["name", "sku", "stock"].filter((k) => mapping[k] === null);
    if (missing.length) {
      if (err) err.textContent = `Missing required mappings: ${missing.join(", ")}`;
      return;
    }

    const products = getProducts();
    let upserts = 0;
    for (const row of pendingImport.rows) {
      const name = String(row[mapping.name] ?? "").trim();
      const sku = String(row[mapping.sku] ?? "").trim().toUpperCase();
      const stock = Number(row[mapping.stock] ?? 0);
      if (!name || !sku || !Number.isFinite(stock)) continue;
      const category = mapping.category === null ? "" : String(row[mapping.category] ?? "").trim();
      const minStock = mapping.minStock === null ? 10 : Number(row[mapping.minStock] ?? 10);
      const price = mapping.price === null ? 0 : Number(row[mapping.price] ?? 0);
      const next = {
        name,
        sku,
        category,
        stock: Math.max(0, Number.isFinite(stock) ? stock : 0),
        minStock: Number.isFinite(minStock) ? Math.max(0, minStock) : 10,
        maxStock: 100,
        price: Number.isFinite(price) ? Math.max(0, price) : 0,
      };
      const idx = products.findIndex((p) => p.sku === sku);
      if (idx === -1) products.unshift(next);
      else products[idx] = { ...products[idx], ...next };
      upserts++;
    }

    writeStore(PRODUCTS_KEY, products);
    setOnboarding({ ...getOnboarding(), inventoryUploaded: true });
    closeModal("mapping-modal");
    renderAllSharedData();
    render();
    if (csvMsg) csvMsg.textContent = `Imported ${upserts} row(s) (upserted by SKU).`;
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

  if (body.dataset.bound === "true") {
    render();
    return;
  }
  body.dataset.bound = "true";
  const openBtn = document.getElementById("add-restock-btn");
  const closeBtn = document.getElementById("restock-modal-close");
  const cancelBtn = document.getElementById("restock-cancel");
  const saveBtn = document.getElementById("restock-save");

  function populateRestockProducts() {
    const sel = document.getElementById("restock-product");
    if (!sel) return;
    const products = getProducts();
    sel.innerHTML = products.map((p) => `<option value="${p.sku}">${p.sku} — ${p.name}</option>`).join("");
  }
  populateRestockProducts();

  openBtn?.addEventListener("click", () => {
    populateRestockProducts();
    document.getElementById("restock-current-min").value = "0/10";
    document.getElementById("restock-predicted").value = "0";
    document.getElementById("restock-recommended").value = "0";
    document.getElementById("restock-cost").value = "0";
    const err = document.getElementById("restock-modal-err");
    if (err) err.textContent = "";
    openModal("restock-modal");
  });
  closeBtn?.addEventListener("click", () => closeModal("restock-modal"));
  cancelBtn?.addEventListener("click", () => closeModal("restock-modal"));
  saveBtn?.addEventListener("click", () => {
    const product = String(document.getElementById("restock-product")?.value || "").trim();
    const currentMin = String(document.getElementById("restock-current-min")?.value || "").trim();
    const predicted = Number(document.getElementById("restock-predicted")?.value || 0);
    const recommended = Number(document.getElementById("restock-recommended")?.value || 0);
    const cost = Number(document.getElementById("restock-cost")?.value || 0);
    const err = document.getElementById("restock-modal-err");
    if (!product) {
      if (err) err.textContent = "Pick a product first.";
      return;
    }
    if (!Number.isFinite(recommended) || recommended < 0) {
      if (err) err.textContent = "Recommended must be a number ≥ 0.";
      return;
    }
    const rows = getRestocks();
    rows.unshift({
      product,
      currentMin: currentMin || "0/10",
      predicted: Number.isFinite(predicted) ? predicted : 0,
      recommended,
      cost: Number.isFinite(cost) ? cost : 0,
    });
    writeStore(RESTOCK_KEY, rows);
    closeModal("restock-modal");
    renderAllSharedData();
    render();
  });
  body.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.edit !== undefined) {
      const rows = getRestocks();
      const i = Number(t.dataset.edit);
      rows[i].recommended = Number(prompt("Recommended:", String(rows[i].recommended)) || rows[i].recommended);
      writeStore(RESTOCK_KEY, rows);
      renderAllSharedData();
    }
    if (t.dataset.del !== undefined) {
      const rows = getRestocks();
      rows.splice(Number(t.dataset.del), 1);
      writeStore(RESTOCK_KEY, rows);
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
  if (list.dataset.bound === "true") {
    render();
    return;
  }
  list.dataset.bound = "true";

  document.getElementById("add-alert-btn")?.addEventListener("click", () => {
    const title = prompt("Alert title:");
    if (!title) return;
    const alerts = getAlerts();
    alerts.unshift({
      title,
      message: prompt("Alert message:", "New alert") || "New alert",
      severity: prompt("Severity:", "warning") || "warning",
    });
    writeStore(ALERTS_KEY, alerts);
    renderAllSharedData();
  });
  list.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.edit !== undefined) {
      const alerts = getAlerts();
      const i = Number(t.dataset.edit);
      alerts[i].message = prompt("Edit alert message:", alerts[i].message) || alerts[i].message;
      writeStore(ALERTS_KEY, alerts);
      renderAllSharedData();
    }
    if (t.dataset.del !== undefined) {
      const alerts = getAlerts();
      alerts.splice(Number(t.dataset.del), 1);
      writeStore(ALERTS_KEY, alerts);
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
        writeStore(PROFILE_KEY, {
          fullName: document.getElementById("settings-full-name").value.trim(),
          email: document.getElementById("settings-email").value.trim(),
          businessName: document.getElementById("settings-business-name").value.trim(),
          phone: document.getElementById("settings-phone").value.trim(),
        });
        writeStore(PREFERENCES_KEY, {
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
  renderOnboarding();
  renderReportsCards();
  initSettingsSync();
  initDashboardInteractions();
}

function initSuppliers() {
  const form = document.getElementById("supplier-form");
  const list = document.getElementById("suppliers-list");
  const count = document.getElementById("suppliers-linked-count");
  if (!form && !list && !count) return;

  const render = () => {
    const suppliers = getStore(SUPPLIERS_KEY, defaultSuppliers);
    if (count) count.textContent = String(suppliers.length);
    if (list) {
      list.innerHTML = suppliers
        .map(
          (s, i) =>
            `<div class="item"><div class="row"><strong>${s.name}</strong><span class="pill pill-healthy">linked</span></div><div class="sub">${s.email || "—"}</div><div class="actions-row" style="margin-top:8px"><button class="mini-btn danger" data-del="${i}">✕ Remove</button></div></div>`,
        )
        .join("");
    }
    renderOnboarding();
  };

  if (form && form.dataset.bound === "true") {
    render();
    return;
  }
  if (form) form.dataset.bound = "true";

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = String(document.getElementById("supplier-name")?.value || "").trim();
    const email = String(document.getElementById("supplier-email")?.value || "").trim();
    const err = document.getElementById("supplier-name-err");
    const msg = document.getElementById("supplier-msg");
    if (!name || name.length < 2) {
      if (err) err.textContent = "Supplier name is required.";
      return;
    }
    if (err) err.textContent = "";
    const suppliers = getStore(SUPPLIERS_KEY, defaultSuppliers);
    suppliers.unshift({ name, email });
    writeStore(SUPPLIERS_KEY, suppliers);
    if (msg) msg.textContent = "Supplier linked. Onboarding updated.";
    form.reset();
    renderAllSharedData();
    render();
  });

  list?.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.del !== undefined) {
      const suppliers = getStore(SUPPLIERS_KEY, defaultSuppliers);
      suppliers.splice(Number(t.dataset.del), 1);
      writeStore(SUPPLIERS_KEY, suppliers);
      renderAllSharedData();
      render();
    }
  });

  render();
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

function mergeDemandRowsWithInventory(storedRows) {
  const products = getProducts();
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const existingSkus = new Set(storedRows.map((r) => String(r.product_id || "").trim()).filter(Boolean));

  const merged = storedRows.map((r) => ({
    ...r,
    source: r.source || "manual/csv",
    __isColdStart: false,
    __product: bySku.get(String(r.product_id || "").trim()) || null,
  }));

  const today = new Date();
  const ds = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1)).toISOString().slice(0, 10);

  for (const p of products) {
    if (existingSkus.has(p.sku)) continue;
    merged.push({
      id: `cold-${p.sku}`,
      product_id: p.sku,
      date: ds,
      demand: 0,
      category: p.category || "",
      created_at: new Date().toISOString(),
      source: "inventory",
      __isColdStart: true,
      __product: p,
    });
  }

  return merged.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function renderDemandPreview(rows) {
  const body = document.getElementById("demand-preview-body");
  if (!body) return;
  const products = getProducts();
  const bySku = new Map(products.map((p) => [p.sku, p]));

  body.innerHTML = rows
    .map((row) => {
      const sku = String(row.product_id || "");
      const p = row.__product || bySku.get(sku);
      const name = p ? p.name : "Unknown product";
      const source = row.source || (row.__isColdStart ? "inventory" : "manual/csv");
      const idCell = row.__isColdStart ? `<span class="pill">cold start</span>` : String(row.id);
      const actions = row.__isColdStart
        ? `<button class="mini-btn" data-demand-edit="${row.id}">＋ Add data</button>`
        : `<button class="mini-btn" data-demand-edit="${row.id}">✎ Edit</button><button class="mini-btn danger" data-demand-del="${row.id}">✕ Delete</button>`;
      return `<tr>
        <td>${idCell}</td>
        <td><strong>${sku}</strong></td>
        <td>${name}</td>
        <td>${row.date}</td>
        <td>${row.demand}</td>
        <td><span class="pill">${source}</span></td>
        <td class="actions-cell">${actions}</td>
      </tr>`;
    })
    .join("");
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
  const stored = getDemandRows().slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const merged = mergeDemandRowsWithInventory(stored);
  renderDemandPreview(merged);
  return merged;
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

  // Keep product selectors synced with Inventory
  function populateInventoryProductSelects() {
    const products = getProducts();
    const manualSel = document.getElementById("demand-product-id");
    if (manualSel) {
      manualSel.innerHTML = products.map((p) => `<option value="${p.sku}">${p.sku} — ${p.name}</option>`).join("");
    }
    const forecastSel = document.getElementById("forecast-product");
    if (forecastSel) {
      forecastSel.innerHTML = products.map((p) => `<option value="${p.sku}">${p.sku} — ${p.name}</option>`).join("");
    }
  }
  populateInventoryProductSelects();

  refreshDemandData();

  if (manualForm.dataset.bound === "true") return;
  manualForm.dataset.bound = "true";

  // Demand row modal (interactive add/edit)
  const modalClose = () => closeModal("demand-modal");
  document.getElementById("demand-modal-close")?.addEventListener("click", modalClose);
  document.getElementById("demand-modal-cancel")?.addEventListener("click", modalClose);

  let editingDemandId = null;

  function populateDemandModalSku() {
    const sel = document.getElementById("demand-modal-sku");
    if (!sel) return;
    const products = getProducts();
    sel.innerHTML = products.map((p) => `<option value="${p.sku}">${p.sku} — ${p.name}</option>`).join("");
  }

  function renderDemandModalContext() {
    const sku = String(document.getElementById("demand-modal-sku")?.value || "");
    const p = getProducts().find((x) => x.sku === sku);
    const ctx = document.getElementById("demand-modal-context");
    if (!ctx) return;
    if (!p) ctx.textContent = "—";
    else ctx.textContent = `Current stock: ${p.stock} • Min: ${p.minStock ?? 10} • Price: ${formatMoney(p.price)}`;
  }

  document.getElementById("demand-modal-sku")?.addEventListener("change", renderDemandModalContext);

  function openDemandModal({ mode, row }) {
    populateDemandModalSku();
    const title = document.getElementById("demand-modal-title");
    const err = document.getElementById("demand-modal-err");
    if (err) err.textContent = "";
    if (title) title.textContent = mode === "edit" ? "Edit Demand Row" : "Add Demand Row";
    editingDemandId = mode === "edit" ? row?.id : null;

    const sku = row?.product_id || (getProducts()[0]?.sku || "");
    const date = row?.date || new Date().toISOString().slice(0, 10);
    const qty = Number(row?.demand ?? 0);

    document.getElementById("demand-modal-sku").value = sku;
    document.getElementById("demand-modal-date").value = date;
    document.getElementById("demand-modal-qty").value = String(qty);
    renderDemandModalContext();
    openModal("demand-modal");
  }

  document.getElementById("demand-add-row")?.addEventListener("click", () => openDemandModal({ mode: "add" }));

  document.getElementById("demand-modal-save")?.addEventListener("click", () => {
    const err = document.getElementById("demand-modal-err");
    const product_id = String(document.getElementById("demand-modal-sku")?.value || "").trim();
    const date = normalizeDateString(document.getElementById("demand-modal-date")?.value);
    const demand = Number(document.getElementById("demand-modal-qty")?.value || 0);
    if (!product_id || !date || !Number.isFinite(demand) || demand < 0) {
      if (err) err.textContent = "Provide SKU, date, and a demand quantity ≥ 0.";
      return;
    }

    const rows = getDemandRows();
    if (editingDemandId === null) {
      rows.push({
        id: nextDemandId(),
        product_id,
        date,
        demand,
        category: "",
        created_at: new Date().toISOString(),
        source: "manual",
      });
    } else {
      const idx = rows.findIndex((r) => String(r.id) === String(editingDemandId));
      if (idx === -1) {
        // editing a cold-start row -> create a real row instead
        rows.push({
          id: nextDemandId(),
          product_id,
          date,
          demand,
          category: "",
          created_at: new Date().toISOString(),
          source: "manual",
        });
      } else {
        rows[idx] = { ...rows[idx], product_id, date, demand };
      }
    }
    setDemandRows(rows);
    refreshDemandData();
    modalClose();
  });

  // Preview table edit/delete actions (from merged view)
  const previewBody = document.getElementById("demand-preview-body");
  previewBody?.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.demandEdit !== undefined) {
      const id = String(t.dataset.demandEdit);
      const merged = refreshDemandData();
      const row = merged.find((r) => String(r.id) === id);
      openDemandModal({ mode: "edit", row });
    }
    if (t.dataset.demandDel !== undefined) {
      const id = String(t.dataset.demandDel);
      const rows = getDemandRows().filter((r) => String(r.id) !== id);
      setDemandRows(rows);
      refreshDemandData();
    }
  });

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
      source: "manual",
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
    const normalized = parsedRows.map((r) => ({ ...r, source: "csv" }));
    const rows = [...getDemandRows(), ...normalized];
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

    const ob = getOnboarding();
    if (!ob.firstForecastGenerated) setOnboarding({ ...ob, firstForecastGenerated: true });
  });
}

if (setupAuth()) {
  ensureStoreDefaults();
  initInventoryCrud();
  initRestockCrud();
  initAlertsCrud();
  initCharts();
  initDemandForecastingPage();
  initSuppliers();
  renderAllSharedData();
  window.addEventListener("storage", (event) => {
    if ([PRODUCTS_KEY, RESTOCK_KEY, ALERTS_KEY, PROFILE_KEY, PREFERENCES_KEY, DEMAND_KEY, SUPPLIERS_KEY, ONBOARDING_KEY].includes(event.key)) {
      renderAllSharedData();
      initInventoryCrud();
      initRestockCrud();
      initDemandForecastingPage();
      initSuppliers();
    }
  });
}
