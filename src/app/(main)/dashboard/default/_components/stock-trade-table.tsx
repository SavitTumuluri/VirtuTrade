"use client";

import React, { useEffect, useMemo, useState } from "react";

// --- Types ---
type Side = "BUY" | "SELL";
type Order = {
  id: string;
  symbol: string;
  side: Side;
  qty: number;
  price: number;
  ts: number;
};

type Position = {
  symbol: string;
  qty: number;
  avgCost: number;
  lastPrice?: number;
  realizedPnL: number;
  lastTradeTs?: number;
};

// --- Helpers ---
const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const money = (n: number) => (isFinite(n) ? `$${fmt.format(n)}` : "—");
const qtyFmt = (n: number) => fmt.format(n);
const cap = (s: string) => s.trim().toUpperCase();
const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => Date.now();

function calcNewAvgCost(oldQty: number, oldAvg: number, buyQty: number, buyPrice: number) {
  if (oldQty <= 0) return buyPrice;
  return (oldQty * oldAvg + buyQty * buyPrice) / (oldQty + buyQty);
}

// --- LocalStorage persistence ---
const LS_KEY = "demo-trade-state-v1";
type PersistState = { orders: Order[]; positions: Record<string, Position> };

const loadState = (): PersistState | null => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const saveState = (s: PersistState) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
};

// --- NEW: fetch current price via our API ---
async function fetchMarketPrice(symbol: string): Promise<{ price: number; asOf?: string }> {
  const res = await fetch(`/api/stock?ticker=${encodeURIComponent(symbol)}&mode=latest`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch latest price");
  return res.json();
}

// --- Demo Component ---
export default function StockTradeTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});

  useEffect(() => {
    const loaded = loadState();
    if (loaded) {
      setOrders(loaded.orders);
      setPositions(loaded.positions);
      return;
    }
    const seed: PersistState = {
      orders: [],
      positions: {
        AAPL: { symbol: "AAPL", qty: 0, avgCost: 0, realizedPnL: 0 },
        MSFT: { symbol: "MSFT", qty: 0, avgCost: 0, realizedPnL: 0 },
      },
    };
    setOrders(seed.orders);
    setPositions(seed.positions);
  }, []);

  useEffect(() => { saveState({ orders, positions }); }, [orders, positions]);

  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<Side>("BUY");
  const [qty, setQty] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function placeOrder() {
    setErr(null);
    const s = cap(symbol);
    const q = Number(qty);
    const p = Number(price);

    if (!s) return setErr("Enter a symbol.");
    if (!q || q <= 0) return setErr("Quantity must be > 0.");
    if (!p || p <= 0) return setErr("Price must be > 0.");

    const pos: Position = positions[s] ?? { symbol: s, qty: 0, avgCost: 0, realizedPnL: 0 };

    if (side === "SELL" && q > pos.qty) {
      return setErr(`Cannot sell ${q} shares. You hold ${pos.qty}.`);
    }

    const t = now();
    const order: Order = { id: uid(), symbol: s, side, qty: q, price: p, ts: t };

    let next: Position = { ...pos, symbol: s, lastPrice: p, lastTradeTs: t };
    if (side === "BUY") {
      const newQty = pos.qty + q;
      const newAvg = calcNewAvgCost(pos.qty, pos.avgCost, q, p);
      next.qty = newQty;
      next.avgCost = newAvg;
    } else {
      const newQty = pos.qty - q;
      const realized = (p - pos.avgCost) * q;
      next.qty = newQty;
      next.realizedPnL = (pos.realizedPnL || 0) + realized;
      if (newQty === 0) {
        next.avgCost = 0;
      }
    }

    setOrders((o) => [order, ...o]);
    setPositions((prev) => ({ ...prev, [s]: next }));

    setQty("");
    setPrice("");
  }

  // --- NEW: quick order at market price
  async function quickOrder(doSide: Side, s: string, q: number) {
    setErr(null);
    setBusy(true);
    try {
      const symbol = cap(s);
      if (!symbol) throw new Error("Missing symbol");

      const pos: Position = positions[symbol] ?? { symbol, qty: 0, avgCost: 0, realizedPnL: 0 };
      if (doSide === "SELL" && q > pos.qty) {
        throw new Error(`Cannot sell ${q} shares. You hold ${pos.qty}.`);
      }

      const { price } = await fetchMarketPrice(symbol);
      const t = now();
      const order: Order = { id: uid(), symbol, side: doSide, qty: q, price, ts: t };

      let next: Position = { ...pos, symbol, lastPrice: price, lastTradeTs: t };
      if (doSide === "BUY") {
        const newQty = pos.qty + q;
        const newAvg = calcNewAvgCost(pos.qty, pos.avgCost, q, price);
        next.qty = newQty;
        next.avgCost = newAvg;
      } else {
        const newQty = pos.qty - q;
        const realized = (price - pos.avgCost) * q;
        next.qty = newQty;
        next.realizedPnL = (pos.realizedPnL || 0) + realized;
        if (newQty === 0) next.avgCost = 0;
      }

      setOrders((o) => [order, ...o]);
      setPositions((prev) => ({ ...prev, [symbol]: next }));
    } catch (e: any) {
      setErr(e?.message || "Quick order failed");
    } finally {
      setBusy(false);
    }
  }

  const positionRows = useMemo(() => Object.values(positions).sort((a,b) => a.symbol.localeCompare(b.symbol)), [positions]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Buy / Sell Stocks</h1>

      {/* Trade ticket */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end rounded-2xl p-4 border shadow-sm bg-white">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Symbol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(cap(e.target.value))}
            placeholder="AAPL"
            className="px-3 py-2 border rounded-xl focus:outline-none focus:ring w-full"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Side</label>
          <select
            value={side}
            onChange={(e) => setSide(e.target.value as Side)}
            className="px-3 py-2 border rounded-xl focus:outline-none focus:ring w-full"
          >
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Quantity</label>
          <input
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="10"
            className="px-3 py-2 border rounded-xl focus:outline-none focus:ring w-full"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Price</label>
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="190.25"
            className="px-3 py-2 border rounded-xl focus:outline-none focus:ring w-full"
          />
        </div>
        <button
          onClick={placeOrder}
          className="h-10 md:h-11 rounded-xl font-medium shadow-sm bg-black text-white hover:opacity-90"
        >
          Submit Limit Order
        </button>

        <button
          disabled={!symbol || busy}
          onClick={() => quickOrder(side, symbol, Number(qty) || 1)}
          className="h-10 md:h-11 rounded-xl font-medium border hover:bg-gray-50 disabled:opacity-50"
          title={`Uses live price from API to ${side.toLowerCase()}`}
        >
          {busy ? "Working..." : `Quick ${side === "BUY" ? "Buy" : "Sell"}`}
        </button>

        {err && <p className="md:col-span-6 text-sm text-red-600">{err}</p>}
      </div>

      {/* Positions Table */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Current Stock Holdings</h2>
          <small className="text-gray-500">Data persists in your browser (localStorage).</small>
        </div>
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-sm text-gray-600">
              <tr>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Avg Cost</th>
                <th className="px-4 py-3">Last Price</th>
                <th className="px-4 py-3">Market Value</th>
                <th className="px-4 py-3">Unreal. P/L</th>
                <th className="px-4 py-3">Realized P/L</th>
                <th className="px-4 py-3">Last Trade</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positionRows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={9}>No positions yet. Place a trade above.</td>
                </tr>
              )}
              {positionRows.map((p) => {
                const last = p.lastPrice ?? 0;
                const mv = (p.qty || 0) * last;
                const unreal = (last - (p.avgCost || 0)) * (p.qty || 0);
                return (
                  <tr key={p.symbol} className="border-t text-sm">
                    <td className="px-4 py-3 font-semibold">{p.symbol}</td>
                    <td className="px-4 py-3">{qtyFmt(p.qty)}</td>
                    <td className="px-4 py-3">{money(p.avgCost)}</td>
                    <td className="px-4 py-3">{p.lastPrice ? money(p.lastPrice) : "—"}</td>
                    <td className="px-4 py-3">{money(mv)}</td>
                    <td className={`px-4 py-3 ${unreal > 0 ? "text-green-600" : unreal < 0 ? "text-red-600" : ""}`}>{money(unreal)}</td>
                    <td className={`px-4 py-3 ${p.realizedPnL > 0 ? "text-green-600" : p.realizedPnL < 0 ? "text-red-600" : ""}`}>{money(p.realizedPnL)}</td>
                    <td className="px-4 py-3">{p.lastTradeTs ? new Date(p.lastTradeTs).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 space-x-2">
                      {/* NEW: Quick Buy 1 @ Mkt for this symbol */}
                      <button
                        disabled={busy}
                        className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                        onClick={() => quickOrder("BUY", p.symbol, 1)}
                        title="Buy 1 share at current API price"
                      >
                        {busy ? "..." : "Quick Buy 1 @ Mkt"}
                      </button>

                      {/* UPDATED: Quick Sell 1 @ Mkt using live price */}
                      <button
                        disabled={busy || p.qty <= 0}
                        className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                        onClick={() => quickOrder("SELL", p.symbol, 1)}
                        title="Sell 1 share at current API price"
                      >
                        {busy ? "..." : "Quick Sell 1 @ Mkt"}
                      </button>

                      {/* Existing actions */}
                      <button
                        className="px-3 py-1 rounded-lg border hover:bg-gray-50"
                        onClick={() => {
                          setPositions((prev) => {
                            const copy = { ...prev };
                            if ((copy[p.symbol]?.qty ?? 0) === 0) delete copy[p.symbol];
                            else copy[p.symbol] = { ...copy[p.symbol], lastPrice: undefined };
                            return copy;
                          });
                        }}
                      >
                        {p.qty === 0 ? "Remove" : "Clear Last Price"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Orders Table (unchanged) */}
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
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={6}>No orders executed yet.</td>
                </tr>
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
