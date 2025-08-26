"use client";

import React, { createContext, useState } from "react";

import { StockData } from "@/types/stock";

type Transaction = {
  type: "buy" | "sell";
  symbol: string;
  quantity: number;
  price: number;
  timestamp: string;
};

type StockContextType = {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  data: StockData[];
  setData: React.Dispatch<React.SetStateAction<StockData[]>>;
  transactions: Transaction[];
  buyStock: (symbol: string, quantity: number, price: number) => void;
  sellStock: (symbol: string, quantity: number, price: number) => void;
};

export const StockContext = createContext<StockContextType | undefined>(undefined);

export function StockProvider({ children }: React.PropsWithChildren) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [data, setData] = useState<StockData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const buyStock = (symbol: string, quantity: number, price: number) => {
    setTransactions((prev) => [
      ...prev,
      { type: "buy", symbol, quantity, price, timestamp: new Date().toISOString() },
    ]);
  };

  const sellStock = (symbol: string, quantity: number, price: number) => {
    setTransactions((prev) => [
      ...prev,
      { type: "sell", symbol, quantity, price, timestamp: new Date().toISOString() },
    ]);
  };

  const contextValue = React.useMemo(
    () => ({
      searchTerm,
      setSearchTerm,
      data,
      setData,
      transactions,
      buyStock,
      sellStock,
    }),
    [searchTerm, setSearchTerm, data, setData, transactions],
  );

  return <StockContext.Provider value={contextValue}>{children}</StockContext.Provider>;
}
