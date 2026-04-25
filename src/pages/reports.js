import { buildShell } from "../components/layout.js";

export function renderReportsPage() {
  return buildShell(
    "Reports & Analytics",
    "Comprehensive insights into your inventory performance",
    `<section class="page-actions">
      <button class="btn">📄 Export PDF</button>
      <button class="btn">📊 Export Excel</button>
      <button class="btn btn-dark">⟳ Generate Report</button>
    </section>
    <section class="grid-4">
      <div class="card kpi-card"><div class="kpi-top"><h3>Total Revenue</h3><span class="kpi-icon ic-success">●</span></div><div class="metric">$52,340</div><div class="sub">↗ 8.2% from last month</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Units Sold</h3><span class="kpi-icon ic-brand">◈</span></div><div class="metric">1,284</div><div class="sub">↗ 12.5% from last month</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Avg. Order Value</h3><span class="kpi-icon ic-warning">●</span></div><div class="metric">$40.76</div><div class="sub">↘ 2.1% from last month</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Profit Margin</h3><span class="kpi-icon ic-indigo">◉</span></div><div class="metric">30%</div><div class="sub">↗ 1.8% from last month</div></div>
    </section>
    <section class="grid-2">
      <div class="card"><h3>Revenue & Profit Trend</h3><p class="sub">Monthly revenue and profit analysis</p><div class="chart"></div></div>
      <div class="card"><h3>Units Sold Trend</h3><p class="sub">Monthly sales volume tracking</p><div class="chart"></div></div>
    </section>
    <section class="grid-3">
      <div class="card"><h3>Best Performing Category</h3><div class="metric" style="font-size:28px">Electronics</div><p class="sub">$31,404 revenue • 60% of total sales</p></div>
      <div class="card"><h3>Top Product</h3><div class="metric" style="font-size:24px">Smart Watch</div><p class="sub">287 units sold • $57,397 revenue</p></div>
      <div class="card"><h3>Inventory Turnover</h3><div class="metric">4.2x</div><p class="sub">Average turnover rate this quarter</p></div>
    </section>`,
  );
}
