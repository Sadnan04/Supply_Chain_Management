import { renderNav } from "./components/layout.js";
import { labels, navRoutes } from "./config/routes.js";
import { renderDashboardPage } from "./pages/dashboard.js";
import { renderInventoryPage } from "./pages/inventory.js";
import { renderDemandForecastingPage } from "./pages/demand-forecasting.js";
import { renderRestockingPage } from "./pages/restocking.js";
import { renderAlertsPage } from "./pages/alerts.js";
import { renderReportsPage } from "./pages/reports.js";
import { renderSettingsPage } from "./pages/settings.js";
import { renderLoginPage } from "./pages/login.js";

const renderers = {
  dashboard: renderDashboardPage,
  inventory: renderInventoryPage,
  "demand-forecasting": renderDemandForecastingPage,
  restocking: renderRestockingPage,
  alerts: renderAlertsPage,
  reports: renderReportsPage,
  settings: renderSettingsPage,
  login: renderLoginPage,
};

function getCurrentRoute() {
  return location.hash.replace("#/", "") || "dashboard";
}

function renderApp() {
  const currentRoute = getCurrentRoute();
  const navContainer = document.getElementById("nav");
  const contentContainer = document.getElementById("content");

  document.body.classList.toggle("auth", currentRoute === "login");

  renderNav(navContainer, navRoutes, labels, currentRoute);

  const pageRenderer = renderers[currentRoute] || renderDashboardPage;
  contentContainer.innerHTML = pageRenderer();
}

window.addEventListener("hashchange", renderApp);
renderApp();
