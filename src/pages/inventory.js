import { buildShell } from "../components/layout.js";

export function renderInventoryPage() {
  return buildShell(
    "Inventory Management",
    "Manage your product stock and details",
    `<section class="page-actions">
      <button class="btn">⇩ Export</button>
      <button class="btn btn-dark">＋ Add Product</button>
    </section>
    <section class="grid-4">
      <div class="card kpi-card"><div class="kpi-top"><h3>Total Products</h3><span class="kpi-icon ic-brand">◈</span></div><div class="metric">8</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Healthy Stock</h3><span class="kpi-icon ic-success">●</span></div><div class="metric" style="color:#00a63e">5</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Low Stock</h3><span class="kpi-icon ic-warning">●</span></div><div class="metric" style="color:#f54900">1</div></div>
      <div class="card kpi-card"><div class="kpi-top"><h3>Critical</h3><span class="kpi-icon ic-danger">●</span></div><div class="metric" style="color:#e7000b">1</div></div>
    </section>
    <section class="card">
      <div class="filter-row">
        <input class="input" placeholder="Search products by name or SKU..." />
        <select class="select"><option>All Categories</option></select>
        <select class="select"><option>All Status</option></select>
      </div>
    </section>
    <section class="card"><h3>Products (8)</h3><p class="sub">List of all inventory items</p>
      <table><thead><tr><th>Product Name</th><th>SKU</th><th>Category</th><th>Stock</th><th>Min/Max</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        <tr><td>Wireless Headphones</td><td>WH-001</td><td>Electronics</td><td>45 units</td><td>20/100</td><td>$79.99</td><td><span class="pill pill-dark">healthy</span></td><td>✎ 🗑</td></tr>
        <tr><td>Smart Watch</td><td>SW-002</td><td>Electronics</td><td>12 units</td><td>15/50</td><td>$199.99</td><td><span class="pill pill-low">low</span></td><td>✎ 🗑</td></tr>
        <tr><td>USB-C Cable</td><td>UC-003</td><td>Accessories</td><td>150 units</td><td>30/80</td><td>$12.99</td><td><span class="pill pill-overstock">overstock</span></td><td>✎ 🗑</td></tr>
        <tr><td>Phone Case</td><td>PC-004</td><td>Accessories</td><td>28 units</td><td>15/60</td><td>$24.99</td><td><span class="pill pill-dark">healthy</span></td><td>✎ 🗑</td></tr>
        <tr><td>Laptop Stand</td><td>LS-005</td><td>Office</td><td>8 units</td><td>10/40</td><td>$49.99</td><td><span class="pill pill-critical">critical</span></td><td>✎ 🗑</td></tr>
      </tbody></table>
    </section>`,
  );
}
