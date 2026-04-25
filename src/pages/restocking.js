import { buildShell } from "../components/layout.js";

export function renderRestockingPage() {
  return buildShell(
    "Restocking",
    "Automated recommendations and purchase order management",
    `<section class="tabs">
      <button class="tab active">Recommendations</button>
      <button class="tab">Purchase Orders</button>
      <button class="tab">Suppliers</button>
    </section>
    <section class="grid-4">
      <div class="card kpi-card"><div class="kpi-top"><h3>Pending Orders</h3><span class="kpi-icon ic-warning">●</span></div><div class="metric">4</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Recommended Orders</h3><span class="kpi-icon ic-brand">◈</span></div><div class="metric">6</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Suppliers Active</h3><span class="kpi-icon ic-indigo">◉</span></div><div class="metric">3</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Monthly Spend</h3><span class="kpi-icon ic-success">●</span></div><div class="metric">$24,580</div></div>
    </section>
    <section class="card">
      <div class="filter-row">
        <input class="input" placeholder="Search recommendations by product..." />
        <select class="select"><option>All urgency levels</option></select>
        <select class="select"><option>All suppliers</option></select>
      </div>
    </section>
    <section class="card"><h3>Restocking Recommendations</h3><p class="sub">AI-generated restocking suggestions based on demand forecasts</p>
      <table><thead><tr><th>Product</th><th>Current Stock</th><th>Recommended Quantity</th><th>Supplier</th><th>Estimated Cost</th><th>Urgency</th><th>Actions</th></tr></thead>
      <tbody><tr><td>Smart Watch</td><td>12 units</td><td>35 units</td><td>TechCorp Inc.</td><td>$6,999.65</td><td><span class="pill pill-critical">high</span></td><td><button class="btn btn-dark">Create PO</button></td></tr>
      <tr><td>Laptop Stand</td><td>8 units</td><td>25 units</td><td>OfficeMax Ltd.</td><td>$1,249.75</td><td><span class="pill pill-low">medium</span></td><td><button class="btn">Review</button></td></tr></tbody></table>
    </section>`,
  );
}
