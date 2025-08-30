"use client";

import { useContext } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
// import { toast } from "sonner"
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StockData } from "@/types/stock";

import { StockContext } from "./stock-provider";

const FormSchema = z.object({
  stock: z.string(),
});

async function getStockData(ticker: string) {
  const res = await fetch(`/api/stock?ticker=${ticker}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }

  const raw = await res.json();
  const result: StockData[] = raw.map((item: any) => ({
    symbol: item.symbol ?? item.ticker,
    name: item.name ?? item.company,
    price: item.price ?? item.lastPrice,
    date: item.date,
    close: item.close,
    volume: item.volume,
  }));
  return result;
}

export function InputForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      stock: "",
    },
  });
  const context = useContext(StockContext);
  if (!context) {
    throw new Error("Must be used within a StockProvider");
  }

  const { setSearchTerm, setData } = context;

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setSearchTerm(data.stock);
    const result: StockData[] = await getStockData(data.stock);
    console.log(`Getting stock data for ${data.stock}`);
    setData(result);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-1/8 space-y-6">
        <FormField
          control={form.control}
          name="stock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Search Stock</FormLabel>
              <FormControl>
                <Input placeholder="Symbol" {...field} />
              </FormControl>
              <FormDescription>Enter a Stock Symbol to search for</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Search</Button>
      </form>
    </Form>
  );
}
