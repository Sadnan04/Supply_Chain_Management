import { buildShell } from "../components/layout.js";

export function renderLoginPage() {
  return buildShell(
    "",
    "",
    `<section class="auth-wrap">
      <div class="auth-card card">
        <div class="auth-brand">
          <div class="auth-logo">AI</div>
          <h3 style="margin-top:10px">AI Inventory Pro</h3>
          <p class="sub">Smart Inventory & Demand Forecasting</p>
        </div>
        <div class="list">
          <div>
            <div class="tiny" style="margin-bottom:6px">Email Address</div>
            <input class="input" value="admin@example.com" />
          </div>
          <div>
            <div class="tiny" style="margin-bottom:6px">Password</div>
            <input class="input" type="password" value="password" />
          </div>
          <a href="#/dashboard" class="btn btn-dark" style="justify-content:center;text-decoration:none;height:40px;">Sign In</a>
          <div class="sub" style="text-align:center">Demo credentials pre-filled for preview</div>
        </div>
      </div>
    </section>`,
  );
}
