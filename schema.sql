-- positions: current holdings per user+symbol
CREATE TABLE IF NOT EXISTS positions (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol        TEXT    NOT NULL,
  qty           INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  avg_cost      NUMERIC(14,4) NOT NULL DEFAULT 0,
  realized_pnl  NUMERIC(14,4) NOT NULL DEFAULT 0,
  last_trade_ts TIMESTAMP,
  PRIMARY KEY (user_id, symbol)
);

-- orders: order history per user
CREATE TABLE IF NOT EXISTS orders (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol     TEXT    NOT NULL,
  side       TEXT    NOT NULL CHECK (side IN ('BUY','SELL')),
  qty        INTEGER NOT NULL CHECK (qty > 0),
  price      NUMERIC(14,4) NOT NULL CHECK (price > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
