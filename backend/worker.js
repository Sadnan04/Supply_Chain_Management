const { query, withTx } = require("./db");

async function compareStockVsSafetyAndAlert() {
  const low = await query(
    `SELECT product_id, name, current_stock, safety_stock, reorder_point, unit_price, unit_cost
     FROM products
     WHERE current_stock <= safety_stock
     ORDER BY (safety_stock - current_stock) DESC
     LIMIT 200`,
  );

  if (!low.length) return { created: 0 };

  const created = await withTx(async (conn) => {
    let n = 0;
    for (const p of low) {
      // de-dupe: don't spam identical alert every hour
      const existing = await conn.execute(
        `SELECT alert_id
         FROM alerts
         WHERE status='open'
           AND product_id=:pid
           AND title='Low stock'
           AND created_at >= (UTC_TIMESTAMP() - INTERVAL 6 HOUR)
         LIMIT 1`,
        { pid: p.product_id },
      ).then(([rows]) => rows[0]);
      if (existing) continue;

      const severity = p.current_stock <= 0 ? "critical" : "warning";
      const margin = Math.max(0, Number(p.unit_price || 0) - Number(p.unit_cost || 0));
      const units_at_risk = Math.max(0, Number(p.reorder_point || 0) - Number(p.current_stock || 0));
      const revenue_risk = Number((margin * units_at_risk).toFixed(2));
      await conn.execute(
        `INSERT INTO alerts (product_id, severity, title, message, payload_json)
         VALUES (:pid, :sev, 'Low stock', :msg,
          JSON_OBJECT('current_stock', :cs, 'safety_stock', :ss, 'reorder_point', :rop, 'unit_margin', :m, 'revenue_risk', :rr)
         )`,
        {
          pid: p.product_id,
          sev: severity,
          msg: `${p.name} (${p.product_id}) stock is ${p.current_stock} (safety ${p.safety_stock}, reorder point ${p.reorder_point}).`,
          cs: Number(p.current_stock),
          ss: Number(p.safety_stock),
          rop: Number(p.reorder_point),
          m: margin,
          rr: revenue_risk,
        },
      );
      n += 1;
    }
    await conn.execute(
      `INSERT INTO system_jobs (job_name, last_run_at, meta_json)
       VALUES ('hourly_stock_check', UTC_TIMESTAMP(), JSON_OBJECT('created', :c))
       ON DUPLICATE KEY UPDATE last_run_at=VALUES(last_run_at), meta_json=VALUES(meta_json)`,
      { c: n },
    );
    return n;
  });

  return { created };
}

async function runLoop() {
  // Run immediately, then every hour (cron-like).
  // In production, run as a separate process/service.
  const doRun = async () => {
    try {
      const out = await compareStockVsSafetyAndAlert();
      console.log(`[worker] hourly_stock_check created=${out.created}`);
    } catch (e) {
      console.error("[worker] error", e);
    }
  };

  await doRun();
  setInterval(doRun, 60 * 60 * 1000);
}

runLoop();

