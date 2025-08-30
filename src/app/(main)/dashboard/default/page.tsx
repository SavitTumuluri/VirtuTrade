import { redirect } from "next/navigation";

import UserMenu from "@/components/user-menu";
import { getAuthUser } from "@/lib/auth";

import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { InputForm } from "./_components/form";
import { StockProvider } from "./_components/stock-provider";
import StockTradeTable from "./_components/stock-trade-table";
import { VolumeGraph } from "./_components/volume-chart";
import TradeForm from "./_components/what-if";

export default async function Page() {
  const me = await getAuthUser();
  if (!me) redirect("/auth/v1/login");
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Top bar */}
      <div className="flex items-center justify-between px-2 md:px-0">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {me.username}</h1>
          <p className="text-sm text-gray-500">Your portfolio and order history below are scoped to your account.</p>
        </div>
      </div>

      {/* Your existing charts & input flow */}
      <StockProvider>
        <ChartAreaInteractive />
        <VolumeGraph />
        <InputForm />
        <TradeForm />
      </StockProvider>

      {/* Per-user holdings & orders pulled from the DB via /api/portfolio/* */}
      <StockTradeTable />
    </div>
  );
}
