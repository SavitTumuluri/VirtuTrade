import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { InputForm } from "./_components/form";
import { StockProvider } from "./_components/stock-provider";
import StockTable from "./_components/stock-table";
import StockTradeTable from "./_components/stock-trade-table";
import { VolumeGraph } from "./_components/volume-chart"; 

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <StockProvider>
        <ChartAreaInteractive />
        <VolumeGraph />
        <InputForm />
      </StockProvider>
      <StockTradeTable />
    </div>
  );
}
