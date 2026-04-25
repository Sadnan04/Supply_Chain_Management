import { buildShell } from "../components/layout.js";

export function renderAlertsPage() {
  return buildShell(
    "Alerts & Notifications",
    "Monitor critical inventory events and system notifications",
    `<section class="tabs">
      <button class="tab active">All Alerts</button>
      <button class="tab">Critical</button>
      <button class="tab">Unread</button>
      <button class="tab">Resolved</button>
    </section>
    <section class="grid-4">
      <div class="card kpi-card"><div class="kpi-top"><h3>Total Alerts</h3><span class="kpi-icon ic-brand">◈</span></div><div class="metric">4</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Critical</h3><span class="kpi-icon ic-danger">●</span></div><div class="metric" style="color:#e7000b">1</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Unread</h3><span class="kpi-icon ic-warning">●</span></div><div class="metric" style="color:#f54900">2</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Resolved Today</h3><span class="kpi-icon ic-success">●</span></div><div class="metric" style="color:#00a63e">24</div></div>
    </section>
    <section class="card"><h3>Recent Alerts</h3><p class="sub">Latest inventory and system notifications</p>
      <table><thead><tr><th>Time</th><th>Type</th><th>Message</th><th>Severity</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody><tr><td>09:32 AM</td><td>Stock Alert</td><td>Laptop Stand inventory critically low (8 units remaining)</td><td><span class="pill pill-critical">critical</span></td><td><span class="pill pill-low">unread</span></td><td><button class="btn">Resolve</button></td></tr>
      <tr><td>08:14 AM</td><td>Demand Alert</td><td>Unusual demand spike detected for Smart Watch (+45%)</td><td><span class="pill pill-low">high</span></td><td><span class="pill pill-low">unread</span></td><td><button class="btn">View</button></td></tr></tbody></table>
    </section>`,
  );
}
