const mysql = require("mysql2/promise");

function getDbConfig() {
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "supply_chain_ai",
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    timezone: "Z",
    namedPlaceholders: true,
  };
}

let pool = null;

function getPool() {
  if (!pool) pool = mysql.createPool(getDbConfig());
  return pool;
}

async function query(sql, params = {}) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function withTx(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { getPool, query, withTx };

