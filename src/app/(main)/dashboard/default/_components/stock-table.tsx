"use client";

import React, { useContext, useState } from "react";

import { StockContext } from "./stock-provider";

export default function StockTable() {
  const ctx = useContext(StockContext);
  const [quantity, setQuantity] = useState(1);

  if (!ctx) return null;

  const { data, buyStock, sellStock, transactions } = ctx;

  return (
    <div>
      {data.length > 0 && (
        <>
          <h2>Stocks</h2>
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Name</th>
                <th>Price</th>
                <th>Buy</th>
                <th>Sell</th>
              </tr>
            </thead>
            <tbody>
              {data.map((stock) => (
                <tr key={stock.symbol}>
                  <td>{stock.symbol}</td>
                  <td>{stock.name}</td>
                  <td>{stock.price}</td>
                  <td>
                    <button onClick={() => buyStock(stock.symbol, quantity, stock.price)}>Buy</button>
                  </td>
                  <td>
                    <button onClick={() => sellStock(stock.symbol, quantity, stock.price)}>Sell</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {transactions.length > 0 && (
        <>
          <h2>Transactions</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Symbol</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => (
                <tr key={idx}>
                  <td>{tx.type}</td>
                  <td>{tx.symbol}</td>
                  <td>{tx.quantity}</td>
                  <td>{tx.price}</td>
                  <td>{new Date(tx.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
