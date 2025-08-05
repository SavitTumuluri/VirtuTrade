export interface StockData {
  date: string; // ISO 8601 format
  close: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  adjClose: number;
  adjHigh: number;
  adjLow: number;
  adjOpen: number;
  adjVolume: number;
  divCash: number;
  splitFactor: number;
} // If we use intraday prices from polygon we'll need to convert.
