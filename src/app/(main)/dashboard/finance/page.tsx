import { StockProvider } from "../default/_components/stock-provider";
import StockTradeTable from "../default/_components/stock-trade-table";
import TradeForm from "../default/_components/what-if";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <StockProvider>
      <div className="flex justify-center">
        <TradeForm />
      </div>
      </StockProvider>
      <StockTradeTable />
    </div>
  );
}
