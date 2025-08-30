"use client";

import React, { useEffect, useMemo, useState } from "react";

type Side = "BUY" | "SELL";
type Order = { id: string; symbol: string; side: Side; qty: number; price: number; ts: number; };
type Position = { symbol: string; qty: number; avgCost: number; realizedPnL: number; lastTradeTs?: number; lastPrice?: number; };

const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const money = (n: number) => (isFinite(n) ? `$${fmt.format(n)}` : "—");
const qtyFmt = (n: number) => fmt.format(n);
const cap = (s: string) => s.trim().toUpperCase();

export default function StockTradeTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<Side>("BUY");
  const [qty, setQty] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    setErr(null);
    try {
      const [posRes, ordRes] = await Promise.all([
        fetch("/api/portfolio/positions", { cache: "no-store" }),
        fetch("/api/portfolio/orders", { cache: "no-store" }),
      ]);
      if (!posRes.ok) throw new Error("Failed to load positions");
      if (!ordRes.ok) throw new Error("Failed to load orders");

      const { positions } = await posRes.json();
      const { orders } = await ordRes.json();

      const posMap: Record<string, Position> = {};
      for (const p of positions) posMap[p.symbol] = p;
      setPositions(posMap);
      setOrders(orders);
    } catch (e: any) {
      setErr(e?.message ?? "Load failed");
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function placeOrder() {
    setErr(null);
    const s = cap(symbol);
    const q = Number(qty);
    const p = Number(price);
    if (!s) return setErr("Enter a symbol.");
    if (!q || q <= 0) return setErr("Quantity must be > 0.");
    if (!p || p <= 0) return setErr("Price must be > 0.");

    setBusy(true);
    try {
      const res = await fetch("/api/portfolio/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: s, side, qty: q, price: p, mode: "limit" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Order failed");
      await loadAll();
      setQty(""); setPrice("");
    } catch (e: any) {
      setErr(e?.message ?? "Order failed");
    } finally {
      setBusy(false);
    }
  }

  async function quickOrder(doSide: Side, s: string, q: number) {
    setErr(null);
    setBusy(true);
    try {
      const symbol = cap(s);
      const pos = positions[symbol] ?? { symbol, qty: 0, avgCost: 0, realizedPnL: 0 };
      if (doSide === "SELL" && q > (pos.qty || 0)) {
        throw new Error(`Cannot sell ${q} shares. You hold ${pos.qty || 0}.`);
      }

      const res = await fetch("/api/portfolio/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, side: doSide, qty: q, mode: "market" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Quick order failed");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? "Quick order failed");
    } finally {
      setBusy(false);
    }
  }

  const positionRows = useMemo(
    () => Object.values(positions).sort((a, b) => a.symbol.localeCompare(b.symbol)), [positions]
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Buy / Sell Stocks</h1>

      {/* Trade ticket */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end rounded-2xl p-4 border shadow-sm bg-white">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Symbol</label>
          <input value={symbol} onChange={(e) => setSymbol(cap(e.target.value))} placeholder="AAPL"
                 className="px-3 py-2 border rounded-xl focus:outline-none focus:ring w-full" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Side</label>
          <select value={side} onChange={(e) => setSide(e.target.value as Side)}
                  className="px-3 py-2 border rounded-xl focus:outline-none focus:ring w-full">
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Quantity</label>
          <input inputMode="decimal" value={qty}
                 onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
                 placeholder="10" className="px-3 py-2 border rounded-xl focus:outline-none focus:ring w-full" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Limit Price</label>
          <input inputMode="decimal" value={price}
                 onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                 placeholder="190.25" className="px-3 py-2 border rounded-xl focus:outline-none focus:ring w-full" />
        </div>
        <button onClick={placeOrder} disabled={busy}
                className="h-10 md:h-11 rounded-xl font-medium shadow-sm bg-black text-white hover:opacity-90 disabled:opacity-50">
          Submit Limit Order
        </button>

        <button disabled={!symbol || busy}
                onClick={() => quickOrder(side, symbol, Number(qty) || 1)}
                className="h-10 md:h-11 rounded-xl font-medium border hover:bg-gray-50 disabled:opacity-50"
                title={`Uses server-side market price to ${side.toLowerCase()}`}>
          {busy ? "Working..." : `Quick ${side === "BUY" ? "Buy" : "Sell"}`}
        </button>

        {err && <p className="md:col-span-6 text-sm text-red-600">{err}</p>}
      </div>

      {/* Positions */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Current Stock Holdings</h2>
          <small className="text-gray-500">Scoped to your account.</small>
        </div>
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-sm text-gray-600">
              <tr>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Avg Cost</th>
                <th className="px-4 py-3">Realized P/L</th>
                <th className="px-4 py-3">Last Trade</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positionRows.length === 0 && (
                <tr><td className="px-4 py-6 text-gray-500" colSpan={6}>No positions yet. Place a trade above.</td></tr>
              )}
              {positionRows.map((p) => (
                <tr key={p.symbol} className="border-t text-sm">
                  <td className="px-4 py-3 font-semibold">{p.symbol}</td>
                  <td className="px-4 py-3">{qtyFmt(p.qty)}</td>
                  <td className="px-4 py-3">{money(p.avgCost)}</td>
                  <td className={`px-4 py-3 ${p.realizedPnL > 0 ? "text-green-600" : p.realizedPnL < 0 ? "text-red-600" : ""}`}>
                    {money(p.realizedPnL)}
                  </td>
                  <td className="px-4 py-3">{p.lastTradeTs ? new Date(p.lastTradeTs).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 space-x-2">
                    <button disabled={busy} className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                            onClick={() => quickOrder("BUY", p.symbol, 1)} title="Buy 1 @ market">
                      {busy ? "..." : "Quick Buy 1 @ Mkt"}
                    </button>
                    <button disabled={busy || p.qty <= 0} className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                            onClick={() => quickOrder("SELL", p.symbol, 1)} title="Sell 1 @ market">
                      {busy ? "..." : "Quick Sell 1 @ Mkt"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Orders */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-2">Order History</h2>
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-sm text-gray-600">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Notional</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td className="px-4 py-6 text-gray-500" colSpan={6}>No orders executed yet.</td></tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-t text-sm">
                  <td className="px-4 py-3">{new Date(o.ts).toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold">{o.symbol}</td>
                  <td className={`px-4 py-3 ${o.side === "BUY" ? "text-green-700" : "text-red-700"}`}>{o.side}</td>
                  <td className="px-4 py-3">{qtyFmt(o.qty)}</td>
                  <td className="px-4 py-3">{money(o.price)}</td>
                  <td className="px-4 py-3">{money(o.qty * o.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
