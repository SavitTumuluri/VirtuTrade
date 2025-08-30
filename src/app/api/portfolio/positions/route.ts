import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT symbol,
            qty,
            avg_cost      AS "avgCost",
            realized_pnl  AS "realizedPnL",
            EXTRACT(EPOCH FROM last_trade_ts)*1000 AS "lastTradeTs"
     FROM public.positions
     WHERE user_id = $1
     ORDER BY symbol ASC`,
    [me.id]
  );

  const positions = rows.map((r) => ({
    ...r,
    lastTradeTs: r.lastTradeTs == null ? null : Number(r.lastTradeTs),
  }));

  return NextResponse.json({ positions });
}
