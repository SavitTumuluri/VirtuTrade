"use client";

import React, { createContext, useState } from "react";

import { StockData } from "@/types/stock";

type StockContextType = {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  data: StockData[];
  setData: React.Dispatch<React.SetStateAction<StockData[]>>;
};

export const StockContext = createContext<StockContextType | undefined>(undefined);

export function StockProvider({ children }: React.PropsWithChildren) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [data, setData] = useState<StockData[]>([]);

  const contextValue = React.useMemo(
    () => ({ searchTerm, setSearchTerm, data, setData }),
    [searchTerm, setSearchTerm, data, setData],
  );
  return <StockContext.Provider value={contextValue}>{children}</StockContext.Provider>;
}
