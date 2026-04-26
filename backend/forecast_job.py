import os
import uuid
from datetime import datetime, timedelta

import pandas as pd

# Preferred model: Prophet (pip package name: prophet)
try:
    from prophet import Prophet  # type: ignore
except Exception:  # pragma: no cover
    Prophet = None

import mysql.connector


def get_db_conn():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "supply_chain_ai"),
    )


def pull_last_90_days_sales(product_id: str) -> pd.DataFrame:
    """
    Pull last 90 days from demand_history, aggregated daily.
    Returns DataFrame with columns: ds (date), y (qty)
    """
    conn = get_db_conn()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT DATE(occurred_at) AS ds, SUM(quantity) AS y
            FROM demand_history
            WHERE product_id = %s
              AND occurred_at >= (UTC_TIMESTAMP() - INTERVAL 90 DAY)
            GROUP BY DATE(occurred_at)
            ORDER BY DATE(occurred_at) ASC
            """,
            (product_id,),
        )
        rows = cur.fetchall()
        df = pd.DataFrame(rows)
        if df.empty:
            return pd.DataFrame(columns=["ds", "y"])
        df["ds"] = pd.to_datetime(df["ds"])
        df["y"] = pd.to_numeric(df["y"]).fillna(0.0)
        return df[["ds", "y"]]
    finally:
        conn.close()


def fit_and_forecast_prophet(df: pd.DataFrame, horizon_days: int = 30) -> pd.DataFrame:
    """
    Fit Prophet model and forecast horizon_days ahead.
    Output columns: forecast_date, yhat, yhat_lower, yhat_upper
    """
    if Prophet is None:
        raise RuntimeError("Prophet is not installed. Install `prophet` or use a different model.")
    m = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
    m.fit(df)
    future = m.make_future_dataframe(periods=horizon_days, freq="D", include_history=False)
    fc = m.predict(future)[["ds", "yhat", "yhat_lower", "yhat_upper"]]
    fc = fc.rename(columns={"ds": "forecast_date"})
    fc["forecast_date"] = fc["forecast_date"].dt.date
    return fc


def write_forecasts(product_id: str, forecasts: pd.DataFrame, model_name: str = "prophet", model_version: str | None = None) -> str:
    """
    Writes rows into forecasts table (append-only per run_id).
    """
    run_id = uuid.uuid4().hex[:16]
    conn = get_db_conn()
    try:
        cur = conn.cursor()
        cur.execute("START TRANSACTION")
        for _, r in forecasts.iterrows():
            cur.execute(
                """
                INSERT INTO forecasts (product_id, forecast_date, yhat, yhat_lower, yhat_upper, model_name, model_version, run_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    product_id,
                    r["forecast_date"],
                    float(r["yhat"]),
                    float(r.get("yhat_lower")) if pd.notna(r.get("yhat_lower")) else None,
                    float(r.get("yhat_upper")) if pd.notna(r.get("yhat_upper")) else None,
                    model_name,
                    model_version,
                    run_id,
                ),
            )
        conn.commit()
        return run_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def run_forecast_for_product(product_id: str, horizon_days: int = 30) -> str:
    df = pull_last_90_days_sales(product_id)
    if df.empty:
        raise RuntimeError(f"No sales history for {product_id} in last 90 days.")
    fc = fit_and_forecast_prophet(df, horizon_days=horizon_days)
    return write_forecasts(product_id, fc, model_name="prophet")


if __name__ == "__main__":
    pid = os.getenv("PRODUCT_ID")
    if not pid:
        raise SystemExit("Set PRODUCT_ID env var. Example: PRODUCT_ID=WH-001 python forecast_job.py")
    run_id = run_forecast_for_product(pid, horizon_days=int(os.getenv("HORIZON_DAYS", "30")))
    print(f"Forecast written. product_id={pid} run_id={run_id}")

