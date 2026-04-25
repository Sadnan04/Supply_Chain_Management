import { buildShell } from "../components/layout.js";

export function renderSettingsPage() {
  return buildShell(
    "Settings",
    "Manage your account and application preferences",
    `<section class="grid-2">
      <div class="card">
        <h3>Personal Information</h3>
        <p class="sub">Update your personal account details</p>
        <div class="grid-2" style="margin-top:12px">
          <div><div class="tiny" style="margin-bottom:6px">Full Name</div><input class="input" value="John Doe" /></div>
          <div><div class="tiny" style="margin-bottom:6px">Email</div><input class="input" value="john@example.com" /></div>
          <div><div class="tiny" style="margin-bottom:6px">Business Name</div><input class="input" value="John's Retail Store" /></div>
          <div><div class="tiny" style="margin-bottom:6px">Phone</div><input class="input" value="+1 (555) 123-4567" /></div>
        </div>
        <div class="page-actions" style="margin-top:14px;justify-content:flex-start"><button class="btn btn-dark">Save Changes</button></div>
      </div>
      <div class="card">
        <h3>Business Preferences</h3>
        <p class="sub">Configure your operational settings</p>
        <div class="grid-2" style="margin-top:12px">
          <div><div class="tiny" style="margin-bottom:6px">Industry</div><select class="select"><option>Retail</option></select></div>
          <div><div class="tiny" style="margin-bottom:6px">Timezone</div><select class="select"><option>Eastern Time (ET)</option></select></div>
          <div><div class="tiny" style="margin-bottom:6px">Currency</div><select class="select"><option>USD ($)</option></select></div>
          <div><div class="tiny" style="margin-bottom:6px">Date Format</div><select class="select"><option>MM/DD/YYYY</option></select></div>
        </div>
        <div class="page-actions" style="margin-top:14px;justify-content:flex-start"><button class="btn">Reset</button><button class="btn btn-dark">Update Preferences</button></div>
      </div>
    </section>
    <section class="card">
      <h3>Notification Settings</h3>
      <p class="sub">Choose which alerts and updates you receive</p>
      <div class="meta-grid" style="margin-top:12px">
        <div class="item"><strong>Low Stock Alerts</strong><div class="sub">Get notified when products are low on stock</div><span class="pill pill-dark" style="margin-top:8px">Enabled</span></div>
        <div class="item"><strong>Demand Spike Alerts</strong><div class="sub">Receive notifications for forecast anomalies</div><span class="pill pill-dark" style="margin-top:8px">Enabled</span></div>
        <div class="item"><strong>Weekly Reports</strong><div class="sub">Summary report delivered every Monday</div><span class="pill" style="margin-top:8px">Disabled</span></div>
      </div>
    </section>`,
  );
}
