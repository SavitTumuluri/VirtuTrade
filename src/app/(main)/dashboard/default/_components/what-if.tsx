"use client";

import * as React from "react";
import { useContext } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StockData } from "@/types/stock";

import { StockContext } from "./stock-provider";

export default function TradeForm() {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error("Must be used within a StockProvider");
  }
  const { searchTerm, data } = context;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const symbol = formData.get("symbol");
    const rawAmount = formData.get("amount");
    const amount = rawAmount ? Number(rawAmount) : 0;
    const purchase = formData.get("purchase");
    const sell = formData.get("sell");
    const res = await fetch(`/api/stock?ticker=${symbol}&date=${purchase}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status}`);
    }

    const result: StockData[] = (await res.json()) as StockData[];
    const purchasePrice = result[0].close * amount;

    //
    const res2 = await fetch(`/api/stock?ticker=${symbol}&date=${sell}`);

    if (!res2.ok) {
      throw new Error(`Failed to fetch: ${res.status}`);
    }

    const result2: StockData[] = (await res2.json()) as StockData[];
    const purchasePrice2 = result2[0].close * amount;

    const profit = purchasePrice2 - purchasePrice;
    const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(profit);
    if (profit >= 0) {
      toast.success(`Projected profit: ${money}`, { description: `${purchasePrice2} - ${purchasePrice}` });
    } else {
      toast.error(`Projected loss: ${money}`, { description: `${purchasePrice2} - ${purchasePrice}` });
    }
  }

  return (
    <Card className="mt-10 max-w-md shadow-lg">
      <CardHeader>
        <CardTitle>Trade Form</CardTitle>
      </CardHeader>

      <form onSubmit={onSubmit} className="contents">
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="symbol">Stock symbol</Label>
            <Input id="symbol" name="symbol" placeholder="AAPL" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="symbol">Amount of Stock</Label>
            <Input id="amount" name="amount" placeholder="1234" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="purchase">Purchase date</Label>
            <Input id="purchase" name="purchase" type="date" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sell">Sell date</Label>
            <Input id="sell" name="sell" type="date" />
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full">
            Submit
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
