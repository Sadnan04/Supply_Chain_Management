import { buildShell } from "../components/layout.js";

export function renderDemandForecastingPage() {
  return buildShell(
    "Demand Forecasting",
    "AI-powered predictions for inventory planning",
    `<section class="page-actions">
      <button class="btn">⚙ Model Settings</button>
      <button class="btn btn-dark">↻ Refresh Forecast</button>
    </section>
    <section class="grid-4">
      <div class="card kpi-card"><div class="kpi-top"><h3>Total Forecasted Demand</h3><span class="kpi-icon ic-brand">◈</span></div><div class="metric">2,847 units</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Forecast Accuracy</h3><span class="kpi-icon ic-success">●</span></div><div class="metric" style="color:#00a63e">89.2%</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Products Analyzed</h3><span class="kpi-icon ic-indigo">◉</span></div><div class="metric">8</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>High Risk Products</h3><span class="kpi-icon ic-danger">●</span></div><div class="metric" style="color:#e7000b">2</div></div>
    </section>
    <section class="card"><h3>Demand Forecast Trends</h3><p class="sub">6-month demand predictions by category</p><div class="chart" style="height:240px"></div></section>
    <section class="grid-2">
      <article class="card status-panel bg-blue"><h3>AI Forecast Insights</h3><ul><li>Strong seasonal demand expected for electronics in Q2 (+23%)</li><li>Accessory demand showing stable growth pattern</li><li>Potential demand spike for smart watches next month</li></ul></article>
      <article class="card reco-card"><h3>Recommended Actions</h3><ul><li>Increase Smart Watch stock by 25% before peak season</li><li>Reduce USB-C Cable orders by 15% to avoid overstock</li><li>Monitor laptop accessory trends for inventory adjustment</li></ul></article>
    </section>`,
  );
}
