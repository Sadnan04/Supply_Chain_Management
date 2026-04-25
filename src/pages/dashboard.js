import { buildShell } from "../components/layout.js";

export function renderDashboardPage() {
  return buildShell(
    "Dashboard",
    "Welcome back! Here's your inventory overview.",
    `<section class="grid-4">
      <div class="card kpi-card"><div class="kpi-top"><h3>Total Products</h3><span class="kpi-icon ic-brand">◈</span></div><div class="metric">1,284</div><div class="sub">↗ 12% from last month</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Inventory Value</h3><span class="kpi-icon ic-success">$</span></div><div class="metric">$52,340</div><div class="sub">↗ 8% from last month</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Low Stock Items</h3><span class="kpi-icon ic-warning">△</span></div><div class="metric">24</div><div class="sub">↘ 3 critical alerts</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Forecast Accuracy</h3><span class="kpi-icon ic-brand">↗</span></div><div class="metric">94.2%</div><div class="sub">↗ 2.1% improvement</div></div>
    </section>
    <section class="grid-2">
      <div class="card"><h3>Sales vs AI Forecast</h3><p class="sub">Actual sales compared to AI predictions</p><div class="chart"></div></div>
      <div class="card"><div class="row"><h3>Top Products by Demand</h3><button class="btn">View All</button></div><p class="sub">Products with highest demand trends</p><div class="list">
        <div class="row"><div class="col"><strong>Wireless Headphones</strong><span class="tiny">45 units in stock</span></div><span class="pill pill-dark">healthy</span></div>
        <div class="row"><div class="col"><strong>Smart Watch</strong><span class="tiny">12 units in stock</span></div><span class="pill pill-low">low</span></div>
        <div class="row"><div class="col"><strong>USB-C Cable</strong><span class="tiny">150 units in stock</span></div><span class="pill pill-overstock">overstock</span></div>
        <div class="row"><div class="col"><strong>Phone Case</strong><span class="tiny">28 units in stock</span></div><span class="pill pill-dark">healthy</span></div>
        <div class="row"><div class="col"><strong>Laptop Stand</strong><span class="tiny">8 units in stock</span></div><span class="pill pill-critical">critical</span></div>
      </div></div>
    </section>
    <section class="grid-2">
      <div class="card"><h3>AI-Powered Insights</h3><p class="sub">Recommendations based on demand analysis</p><div class="list">
        <div class="status-panel bg-blue"><strong>Restock Recommendation</strong><p class="tiny">Order 50 units of "Smart Watch" within 3 days to meet demand surge.</p><button class="btn-link">View Details →</button></div>
        <div class="status-panel bg-green"><strong>Demand Trend Alert</strong><p class="tiny">"Wireless Headphones" showing 35% increase over next 2 weeks.</p><button class="btn-link">View Forecast →</button></div>
        <div class="status-panel bg-violet"><strong>Inventory Optimization</strong><p class="tiny">Reduce "USB-C Cable" stock by 40% to optimize storage costs.</p><button class="btn-link">View Analysis →</button></div>
      </div></div>
      <div class="card"><div class="row"><h3>Recent Alerts</h3><button class="btn">View All</button></div><p class="sub">Critical inventory notifications</p><div class="list">
        <div class="status-panel bg-red"><div class="row"><strong>Laptop Stand - Critical stock level (8 units)</strong><span class="pill pill-critical">critical</span></div></div>
        <div class="status-panel bg-orange"><div class="row"><strong>Smart Watch - Low stock alert (12 units)</strong><span class="pill pill-low">warning</span></div></div>
        <div class="status-panel bg-blue"><div class="row"><strong>USB-C Cable - Overstock detected (150 units)</strong><span class="pill">info</span></div></div>
      </div></div>
    </section>`,
  );
}
