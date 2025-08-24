"use client";

import * as React from "react";
import { useContext } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { StockContext } from "./stock-provider";

export default function TradeForm() {
  const context = useContext(StockContext);

  if (!context) {
    throw new Error("Must be used within a StockProvider");
  }
  const { searchTerm, data } = context;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    alert("hello world");
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
