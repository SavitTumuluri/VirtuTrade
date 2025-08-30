import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";


type Side = "BUY" | "SELL";
type Body = { symbol: string; side: Side; qty: number; price?: number; mode?: "limit" | "market" };

async function fetchMarketPriceViaSelf(req: Request, symbol: string): Promise<number> {
  const origin = new URL(req.url).origin;
  const url = `${origin}/api/stock?ticker=${encodeURIComponent(symbol)}&mode=latest`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch latest price");
  const j = await r.json();
  const price = Number(j?.price);
  if (!price || !isFinite(price)) throw new Error("Malformed latest price");
  return price;
}

export async function POST(req: Request) {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;
  const symbol = body.symbol?.trim().toUpperCase();
  const side = body.side;
  const qty = Number(body.qty);
  const mode = body.mode ?? "limit";

  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  if (!["BUY", "SELL"].includes(side)) return NextResponse.json({ error: "Bad side" }, { status: 400 });
  if (!qty || qty <= 0) return NextResponse.json({ error: "Bad quantity" }, { status: 400 });

  let client = await pool.connect();
  try {
    let price = Number(body.price);
    if (mode === "market") price = await fetchMarketPriceViaSelf(req, symbol);
    if (!price || price <= 0) return NextResponse.json({ error: "Bad price" }, { status: 400 });

    await client.query("BEGIN");

    // Lock existing position (if any)
    const posRes = await client.query(
    `SELECT qty, avg_cost, realized_pnl
        FROM positions
        WHERE user_id=$1 AND symbol=$2
        FOR UPDATE`,
    [me.id, symbol]
    );

    let qtyNow = posRes.rowCount ? Number(posRes.rows[0].qty) : 0;
    let avg    = posRes.rowCount ? Number(posRes.rows[0].avg_cost) : 0;
    let realized = posRes.rowCount ? Number(posRes.rows[0].realized_pnl) : 0;

    if (side === "SELL" && qty > qtyNow) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: `Cannot sell ${qty}. You hold ${qtyNow}.` }, { status: 400 });
    }

    if (side === "BUY") {
      const newQty = qtyNow + qty;
      const newAvg = qtyNow <= 0 ? price : (qtyNow * avg + qty * price) / (qtyNow + qty);
      qtyNow = newQty; avg = newAvg;
    } else {
      qtyNow = qtyNow - qty;
      realized = realized + (price - avg) * qty;
      if (qtyNow === 0) avg = 0;
    }

    // Upsert position
    await client.query(
      `INSERT INTO positions (user_id, symbol, qty, avg_cost, realized_pnl, last_trade_ts)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (user_id, symbol)
       DO UPDATE SET qty=EXCLUDED.qty,
                     avg_cost=EXCLUDED.avg_cost,
                     realized_pnl=EXCLUDED.realized_pnl,
                     last_trade_ts=NOW()`,
      [me.id, symbol, qtyNow, avg, realized]
    );

    // Insert order row
    const ord = await client.query(
      `INSERT INTO orders (user_id, symbol, side, qty, price)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, EXTRACT(EPOCH FROM created_at)*1000 AS ts`,
      [me.id, symbol, side, qty, price]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      order: { id: ord.rows[0].id, symbol, side, qty, price, ts: ord.rows[0].ts },
      position: { symbol, qty: qtyNow, avgCost: Number(avg), realizedPnL: Number(realized) }
    });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    // eslint-disable-next-line no-console
    console.error(e);
    return NextResponse.json({ error: "Order failed" }, { status: 500 });
  } finally {
    try { client.release(); } catch {}
  }
}