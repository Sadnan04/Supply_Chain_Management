-- AI Supply Chain Management (MySQL 8+) relational schema
-- Products, Demand_History (sales), Purchase_Orders linked by product_id (SKU).

CREATE DATABASE IF NOT EXISTS supply_chain_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE supply_chain_ai;

-- Application users for backend-validated authentication
CREATE TABLE IF NOT EXISTS users (
  user_id          BIGINT NOT NULL AUTO_INCREMENT,
  full_name        VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  role             ENUM('admin','manager','viewer') NOT NULL DEFAULT 'admin',
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at    DATETIME NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- Core catalog
CREATE TABLE IF NOT EXISTS products (
  product_id        VARCHAR(64)  NOT NULL,
  name              VARCHAR(255) NOT NULL,
  category          VARCHAR(128) NULL,
  unit_price        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  unit_cost         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  current_stock     INT NOT NULL DEFAULT 0,

  -- Planning parameters (enterprise defaults)
  lead_time_days    INT NOT NULL DEFAULT 7,
  service_level_z   DECIMAL(6,3) NOT NULL DEFAULT 1.645, -- ~95%
  safety_stock      INT NOT NULL DEFAULT 0,
  reorder_point     INT NOT NULL DEFAULT 0,
  sales_velocity    DECIMAL(12,4) NOT NULL DEFAULT 0.0000, -- avg daily sales
  days_of_supply    DECIMAL(12,4) NOT NULL DEFAULT 0.0000, -- current_stock / sales_velocity

  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id),
  KEY idx_products_category (category)
) ENGINE=InnoDB;

-- Sales / demand history (one row per transaction)
CREATE TABLE IF NOT EXISTS demand_history (
  demand_id     BIGINT NOT NULL AUTO_INCREMENT,
  product_id    VARCHAR(64) NOT NULL,
  occurred_at   DATETIME NOT NULL,
  quantity      INT NOT NULL,
  source        ENUM('manual_sale','csv_upload','pos_sync') NOT NULL DEFAULT 'manual_sale',
  meta_json     JSON NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (demand_id),
  KEY idx_demand_product_time (product_id, occurred_at),
  CONSTRAINT fk_demand_product
    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Purchase orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  po_id           BIGINT NOT NULL AUTO_INCREMENT,
  product_id      VARCHAR(64) NOT NULL,
  supplier_name   VARCHAR(255) NULL,
  status          ENUM('draft','submitted','approved','received','cancelled') NOT NULL DEFAULT 'draft',
  ordered_qty     INT NOT NULL,
  received_qty    INT NOT NULL DEFAULT 0,
  unit_cost       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  expected_date   DATE NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (po_id),
  KEY idx_po_product_status (product_id, status),
  CONSTRAINT fk_po_product
    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Forecast runs + outputs (Prophet/LSTM/etc)
CREATE TABLE IF NOT EXISTS forecasts (
  forecast_id    BIGINT NOT NULL AUTO_INCREMENT,
  product_id     VARCHAR(64) NOT NULL,
  forecast_date  DATE NOT NULL,            -- target day being predicted
  yhat           DECIMAL(12,3) NOT NULL,   -- predicted demand
  yhat_lower     DECIMAL(12,3) NULL,
  yhat_upper     DECIMAL(12,3) NULL,
  model_name     VARCHAR(64) NOT NULL DEFAULT 'prophet',
  model_version  VARCHAR(64) NULL,
  run_id         VARCHAR(64) NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (forecast_id),
  UNIQUE KEY uq_forecast_product_day_run (product_id, forecast_date, run_id),
  KEY idx_forecast_product_day (product_id, forecast_date),
  CONSTRAINT fk_forecast_product
    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Alerts that the UI can read
CREATE TABLE IF NOT EXISTS alerts (
  alert_id      BIGINT NOT NULL AUTO_INCREMENT,
  product_id    VARCHAR(64) NULL,
  severity      ENUM('info','warning','critical') NOT NULL DEFAULT 'info',
  title         VARCHAR(255) NOT NULL,
  message       TEXT NOT NULL,
  status        ENUM('open','acknowledged','resolved') NOT NULL DEFAULT 'open',
  payload_json  JSON NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (alert_id),
  KEY idx_alert_status_created (status, created_at),
  KEY idx_alert_product_created (product_id, created_at),
  CONSTRAINT fk_alert_product
    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- A lightweight table to track last worker runs
CREATE TABLE IF NOT EXISTS system_jobs (
  job_name     VARCHAR(64) NOT NULL,
  last_run_at  DATETIME NULL,
  meta_json    JSON NULL,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (job_name)
) ENGINE=InnoDB;

-- Social media mentions (from FB/IG APIs or manual ingest)
CREATE TABLE IF NOT EXISTS social_mentions (
  mention_id    BIGINT NOT NULL AUTO_INCREMENT,
  product_id    VARCHAR(64) NOT NULL,
  platform      ENUM('facebook','instagram','tiktok','x','other') NOT NULL DEFAULT 'other',
  mentions      INT NOT NULL,
  window_start  DATETIME NOT NULL,
  window_end    DATETIME NOT NULL,
  meta_json     JSON NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (mention_id),
  KEY idx_mentions_product_time (product_id, window_end),
  CONSTRAINT fk_mentions_product
    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Competitor prices (from website scraper)
CREATE TABLE IF NOT EXISTS competitor_prices (
  price_id      BIGINT NOT NULL AUTO_INCREMENT,
  product_id    VARCHAR(64) NOT NULL,
  competitor    VARCHAR(255) NOT NULL,
  competitor_price DECIMAL(12,2) NOT NULL,
  user_price       DECIMAL(12,2) NOT NULL,
  observed_at   DATETIME NOT NULL,
  url          VARCHAR(1024) NULL,
  meta_json    JSON NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (price_id),
  KEY idx_comp_price_product_time (product_id, observed_at),
  CONSTRAINT fk_comp_price_product
    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Forecast adjustments (price sensitivity, social boosts, etc)
CREATE TABLE IF NOT EXISTS forecast_adjustments (
  adj_id        BIGINT NOT NULL AUTO_INCREMENT,
  product_id    VARCHAR(64) NOT NULL,
  factor        DECIMAL(8,4) NOT NULL, -- multiply yhat
  reason        ENUM('competitor_price_drop','social_trend','manual') NOT NULL,
  starts_on     DATE NOT NULL,
  ends_on       DATE NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  meta_json     JSON NULL,
  PRIMARY KEY (adj_id),
  KEY idx_adj_product_window (product_id, starts_on, ends_on),
  CONSTRAINT fk_adj_product
    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

