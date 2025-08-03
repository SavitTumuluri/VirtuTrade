import { NextResponse } from "next/server";

const path: string = `https://api.tiingo.com/`;
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");

  const ourPath: string =
    path + `tiingo/daily/${ticker}/prices?startDate=2025-05-01&endDate=2025-08-01&token=${process.env.API_KEY}`;

  const result = await fetch(ourPath);
  if (!result.ok) {
    return NextResponse.json({ error: "Failed to fetch external API" }, { status: 500 });
  }
  const data = await result.json();

  return NextResponse.json(data);
}
