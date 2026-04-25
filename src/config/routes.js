export const routes = [
  "dashboard",
  "inventory",
  "demand-forecasting",
  "restocking",
  "alerts",
  "reports",
  "settings",
  "login",
];

export const labels = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  "demand-forecasting": "Demand Forecasting",
  restocking: "Restocking",
  alerts: "Alerts",
  reports: "Reports",
  settings: "Settings",
  login: "Sign In",
};

export const navRoutes = routes.filter((route) => route !== "login");
