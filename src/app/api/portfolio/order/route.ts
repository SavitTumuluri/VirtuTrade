import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Side = "BUY" | "SELL";
type Body = {
  symbol?: string;
  side?: string;
  qty?: number | string;
  price?: number | string;
  mode?: "limit" | "market";
};

function resolveBaseUrl(req: Request) {
  // Prefer deployment host headers when present (Vercel / proxies)
  const h = req.headers;
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host") ?? process.env.VERCEL_URL;
  const proto = h.get("x-forwarded-proto") ?? "https";

  if (host) return `${proto}://${host}`;

  // Fallback to the actual request URL origin (works locally)
  return new URL(req.url).origin;
}

async function fetchMarketPriceViaSelf(req: Request, symbol: string): Promise<number> {
  const base = resolveBaseUrl(req);
  const url = new URL("/api/stock", base);
  url.searchParams.set("ticker", symbol);
  url.searchParams.set("mode", "latest");

  const r = await fetch(url.toString(), {
    cache: "no-store",
    // also tell Next/Vercel: never cache this
    next: { revalidate: 0 },
    headers: { "x-internal-request": "portfolio-order" },
  });

  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`SELF_FETCH_FAILED ${r.status} ${body.slice(0, 120)}`);
  }

  const j = (await r.json()) as { price?: unknown };
  const price = Number(j?.price);
  if (!price || !Number.isFinite(price)) throw new Error("Malformed latest price");
  return price;
}


function validateBody(
  b: Body,
): { symbol: string; side: Side; qty: number; mode: "limit" | "market" } | { error: string } {
  const rawSymbol = typeof b.symbol === "string" ? b.symbol : "";
  const symbol = rawSymbol.trim().toUpperCase();

  const sideStr = typeof b.side === "string" ? b.side.toUpperCase() : "";
  const side: Side | undefined = sideStr === "BUY" || sideStr === "SELL" ? (sideStr as Side) : undefined;

  const qtyNum = Number(b.qty);
  const mode: "limit" | "market" = b.mode === "market" ? "market" : "limit";

  if (!symbol) return { error: "Missing symbol" };
  if (!side) return { error: "Bad side" };
  if (!qtyNum || qtyNum <= 0) return { error: "Bad quantity" };

  return { symbol, side, qty: qtyNum, mode };
}

function computePositionUpdate(
  side: Side,
  qty: number,
  price: number,
  current: { qty: number; avg: number; realized: number },
) {
  const { qty: qtyNow, avg, realized } = current;

  if (side === "BUY") {
    const newQty = qtyNow + qty;
    const newAvg = qtyNow <= 0 ? price : (qtyNow * avg + qty * price) / (qtyNow + qty);
    return { qtyNow: newQty, avg: newAvg, realized };
  }

  // SELL
  const newQty = qtyNow - qty;
  const newRealized = realized + (price - avg) * qty;
  const newAvg = newQty === 0 ? 0 : avg;
  return { qtyNow: newQty, avg: newAvg, realized: newRealized };
}

async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }
    throw err;
  } finally {
    try {
      client.release();
    } catch (releaseErr) {
      console.error("Client release failed:", releaseErr);
    }
  }
}

export async function POST(req: Request) {
  const me = await getAuthUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = (await req.json()) as Body;
  const parsed = validateBody(raw);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { symbol, side, qty, mode } = parsed;

  try {
    const price = mode === "market" ? await fetchMarketPriceViaSelf(req, symbol) : Number(raw.price);
    if (!price || price <= 0) {
      return NextResponse.json({ error: "Bad price" }, { status: 400 });
    }

    const result = await withTransaction(async (client) => {
      // Lock existing position (if any)
      const posRes = await client.query(
        `
          SELECT qty, avg_cost, realized_pnl
          FROM positions
          WHERE user_id = $1 AND symbol = $2
          FOR UPDATE
        `,
        [me.id, symbol],
      );

      const qtyNow0 = posRes.rowCount ? Number(posRes.rows[0].qty) : 0;
      const avg0 = posRes.rowCount ? Number(posRes.rows[0].avg_cost) : 0;
      const realized0 = posRes.rowCount ? Number(posRes.rows[0].realized_pnl) : 0;

      if (side === "SELL" && qty > qtyNow0) {
        throw new Error(`INSUFFICIENT_QTY:${qtyNow0}`);
      }

      const { qtyNow, avg, realized } = computePositionUpdate(side, qty, price, {
        qty: qtyNow0,
        avg: avg0,
        realized: realized0,
      });

      // Upsert position
      await client.query(
        `
          INSERT INTO positions (user_id, symbol, qty, avg_cost, realized_pnl, last_trade_ts)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (user_id, symbol)
          DO UPDATE SET
            qty = EXCLUDED.qty,
            avg_cost = EXCLUDED.avg_cost,
            realized_pnl = EXCLUDED.realized_pnl,
            last_trade_ts = NOW()
        `,
        [me.id, symbol, qtyNow, avg, realized],
      );

      // Insert order
      const ord = await client.query(
        `
          INSERT INTO orders (user_id, symbol, side, qty, price)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, EXTRACT(EPOCH FROM created_at) * 1000 AS ts
        `,
        [me.id, symbol, side, qty, price],
      );

      return {
        order: { id: ord.rows[0].id, symbol, side, qty, price, ts: Number(ord.rows[0].ts) },
        position: { symbol, qty: qtyNow, avgCost: Number(avg), realizedPnL: Number(realized) },
      };
    });

    return NextResponse.json({ ok: true, ...result });
} catch (e) {
  const msg = String(e ?? "");
  if (msg.startsWith("Error: INSUFFICIENT_QTY:")) {
    const held = Number(msg.split(":")[2] ?? "0");
    return NextResponse.json({ error: `Cannot sell ${qty}. You hold ${held}.` }, { status: 400 });
  }
  if (msg.includes("SELF_FETCH_FAILED")) {
    console.error("Order failed while getting latest price:", msg);
    return NextResponse.json({ error: "Price service unavailable" }, { status: 502 });
  }

  console.error("Order failed:", e);
  return NextResponse.json({ error: "Order failed" }, { status: 500 });
}

}
