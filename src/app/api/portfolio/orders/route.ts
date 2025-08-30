import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const me = await getAuthUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT id, symbol, side, qty, price,
            (EXTRACT(EPOCH FROM created_at) * 1000) AS ts
     FROM public.orders
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 500`,
    [me.id],
  );

  // node-postgres returns numeric fields as strings; coerce here
  const orders = rows.map((r) => ({ ...r, ts: Number(r.ts) }));
  return NextResponse.json({ orders });
}
