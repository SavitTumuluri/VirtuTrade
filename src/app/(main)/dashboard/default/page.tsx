import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { InputForm } from "./_components/form";
import { StockProvider } from "./_components/stock-provider";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <StockProvider>
        <ChartAreaInteractive />
        <InputForm />
      </StockProvider>
    </div>
  );
}
